import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Palette } from '../theme/tokens';
import {
  PREMIUM_ENTITLEMENT_ID,
  configureRevenueCat,
  isTrialEligible,
  syncPremiumWithBackend,
} from '../services/revenueCat';
import {
  PREMIUM_30_DAY_LIMIT,
  PREMIUM_DAILY_LIMIT,
  PRIVACY_URL,
  TERMS_URL,
} from '../constants/config';

type PlanKey = 'annual' | 'monthly' | 'weekly';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPremiumActivated?: () => void;
}

interface Plan {
  key: PlanKey;
  title: string;
  package: PurchasesPackage | null;
  trialEligible: boolean;
}

function packageMatches(pkg: PurchasesPackage, key: PlanKey): boolean {
  const haystack = `${pkg.identifier} ${pkg.product.identifier}`.toLowerCase();

  if (key === 'annual') {
    return (
      pkg.identifier === '$rc_annual' ||
      haystack.includes('annual') ||
      haystack.includes('year')
    );
  }

  if (key === 'monthly') {
    return pkg.identifier === '$rc_monthly' || haystack.includes('month');
  }

  return pkg.identifier === '$rc_weekly' || haystack.includes('week');
}

function formatCurrency(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

function trialLabel(pkg: PurchasesPackage | null): string | null {
  const intro = pkg?.product.introPrice;
  if (!intro || intro.price !== 0) return null;

  const count = intro.periodNumberOfUnits;
  const unit = String(intro.periodUnit).toUpperCase();
  const words: Record<string, [string, string]> = {
    DAY: ['jour', 'jours'],
    WEEK: ['semaine', 'semaines'],
    MONTH: ['mois', 'mois'],
    YEAR: ['an', 'ans'],
  };
  const [single, plural] = words[unit] || ['jour', 'jours'];
  return `${count} ${count === 1 ? single : plural} d’essai gratuit`;
}

function periodSuffix(key: PlanKey): string {
  if (key === 'annual') return '/ an';
  if (key === 'monthly') return '/ mois';
  return '/ semaine';
}

export function Paywall({
  visible,
  onClose,
  onPremiumActivated,
}: Props) {
  const { colors, name: themeName } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [trialEligibility, setTrialEligibility] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<PlanKey>('annual');
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const ready = await configureRevenueCat();
      if (!ready) {
        setPackages([]);
        setTrialEligibility({});
        return;
      }

      const offerings = await Purchases.getOfferings();
      const available = offerings.current?.availablePackages ?? [];
      setPackages(available);

      const entries = await Promise.all(
        available.map(async (pkg) => {
          if (!pkg.product.introPrice || pkg.product.introPrice.price !== 0) {
            return [pkg.product.identifier, false] as const;
          }
          const eligible = await isTrialEligible(pkg.product.identifier);
          return [pkg.product.identifier, eligible] as const;
        }),
      );
      setTrialEligibility(Object.fromEntries(entries));
    } catch (error) {
      console.log('[RevenueCat] offres indisponibles', error);
      setPackages([]);
      setTrialEligibility({});
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      void loadProducts();
    }
  }, [visible, loadProducts]);

  const plans = useMemo<Plan[]>(() => {
    const getPackage = (key: PlanKey) =>
      packages.find((pkg) => packageMatches(pkg, key)) ?? null;

    const makePlan = (key: PlanKey, title: string): Plan => {
      const pkg = getPackage(key);
      return {
        key,
        title,
        package: pkg,
        trialEligible: Boolean(
          pkg && trialEligibility[pkg.product.identifier] && trialLabel(pkg),
        ),
      };
    };

    return [
      makePlan('annual', 'Yearly'),
      makePlan('monthly', 'Monthly'),
      makePlan('weekly', 'Weekly'),
    ];
  }, [packages, trialEligibility]);

  const selectedPlan =
    plans.find((plan) => plan.key === selected) ?? plans[0];

  const displayPrice = (plan: Plan) => plan.package?.product.priceString || '—';

  const detail = (plan: Plan): string => {
    const product = plan.package?.product;
    if (!product) return 'Prix App Store indisponible';

    if (plan.key === 'annual') {
      const monthly = formatCurrency(product.price / 12, product.currencyCode);
      return `≈ ${monthly} / mois`;
    }
    if (plan.key === 'monthly') return `${product.priceString} / mois`;
    return `${product.priceString} / semaine`;
  };

  const handlePurchase = async () => {
    const ready = await configureRevenueCat();

    if (!ready) {
      Alert.alert(
        'Abonnement indisponible',
        'Les achats ne sont pas disponibles dans cette version de Nevi.',
      );
      return;
    }

    if (!selectedPlan.package) {
      Alert.alert(
        'Abonnement indisponible',
        'Les prix App Store ne sont pas disponibles pour le moment. Réessaie dans quelques instants.',
      );
      return;
    }

    setLoading(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(
        selectedPlan.package,
      );

      if (
        customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined
      ) {
        await syncPremiumWithBackend();
        onPremiumActivated?.();
        onClose();
      }
    } catch (error: any) {
      if (!error?.userCancelled) {
        console.log('[RevenueCat] achat impossible', error);
        Alert.alert(
          'Achat impossible',
          'L’achat n’a pas pu être finalisé. Réessaie dans quelques instants.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    const ready = await configureRevenueCat();

    if (!ready) {
      Alert.alert(
        'Restauration indisponible',
        'Les achats ne sont pas disponibles dans cette version de Nevi.',
      );
      return;
    }

    setLoading(true);
    try {
      const customerInfo = await Purchases.restorePurchases();

      if (
        customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined
      ) {
        await syncPremiumWithBackend();
        onPremiumActivated?.();
        Alert.alert('Achat restauré', 'Nevi Pro est maintenant actif.');
        onClose();
      } else {
        Alert.alert(
          'Aucun abonnement trouvé',
          'Aucun abonnement Nevi Pro actif n’a été trouvé sur ce compte Apple.',
        );
      }
    } catch (error) {
      console.log('[RevenueCat] restauration impossible', error);
      Alert.alert(
        'Restauration impossible',
        'Impossible de restaurer les achats pour le moment.',
      );
    } finally {
      setLoading(false);
    }
  };

  const intro = selectedPlan.trialEligible
    ? trialLabel(selectedPlan.package)
    : null;

  const buttonLabel = !selectedPlan.package
    ? 'Abonnement indisponible'
    : intro
      ? `Essayer ${intro.replace(' d’essai gratuit', '')} gratuitement`
      : `Continuer — ${displayPrice(selectedPlan)}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.topRow,
              themeName === 'dark' && styles.topRowDark,
            ]}
          >
            <Text style={styles.mic}>●</Text>
            <Pressable
              onPress={onClose}
              hitSlop={18}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <Text style={styles.eyebrow}>NEVI PRO</Text>
          <Text style={styles.title}>Chaque langue,{`\n`}en direct.</Text>
          <Text style={styles.subtitle}>
            Traduction vocale illimitée*, mode face à face, voix naturelle et
            bien plus encore.
          </Text>

          <View style={styles.plans}>
            {plans.map((plan) => {
              const active = selected === plan.key;
              const planTrial = plan.trialEligible ? trialLabel(plan.package) : null;

              return (
                <Pressable
                  key={plan.key}
                  onPress={() => setSelected(plan.key)}
                  style={[styles.plan, active && styles.planActive]}
                >
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active && <View style={styles.radioDot} />}
                  </View>

                  <View style={styles.planBody}>
                    <View style={styles.planTop}>
                      <Text style={styles.planTitle}>{plan.title}</Text>
                      {planTrial && (
                        <View style={styles.trialBadge}>
                          <Text style={styles.trialText}>{planTrial}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.planDetail}>{detail(plan)}</Text>
                  </View>

                  <Text style={styles.price}>{displayPrice(plan)}</Text>
                </Pressable>
              );
            })}
          </View>

          {loadingProducts && packages.length === 0 && (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>
                Vérification des prix App Store…
              </Text>
            </View>
          )}

          <Pressable
            onPress={() => void handlePurchase()}
            disabled={loading || !selectedPlan.package}
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.pressed,
              (loading || !selectedPlan.package) && styles.disabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.continueText}>{buttonLabel}</Text>
            )}
          </Pressable>

          <Text style={styles.renewal}>
            {selectedPlan.package
              ? `${intro ? `${intro}. Puis ` : ''}${displayPrice(selectedPlan)} ${periodSuffix(
                  selectedPlan.key,
                )}. Abonnement automatique. Annulable à tout moment.`
              : 'Les prix et conditions d’abonnement seront affichés dès qu’ils seront disponibles depuis l’App Store.'}
          </Text>

          <Text style={styles.renewal}>
            *Usage personnel raisonnable : jusqu’à {PREMIUM_DAILY_LIMIT} traductions
            sur 24 h et {PREMIUM_30_DAY_LIMIT} sur 30 jours.
          </Text>

          <Pressable
            onPress={() => void handleRestore()}
            disabled={loading}
            hitSlop={8}
          >
            <Text style={styles.restore}>Restaurer un achat</Text>
          </Pressable>

          <View style={styles.features}>
            <View style={styles.featureColumn}>
              <Text style={styles.feature}>✓  Traductions illimitées*</Text>
              <Text style={styles.feature}>✓  Traduisez en voyage</Text>
            </View>
            <View style={styles.featureColumn}>
              <Text style={styles.feature}>✓  Mode face à face</Text>
              <Text style={styles.feature}>✓  Voix naturelle</Text>
            </View>
          </View>

          <View style={styles.legalRow}>
            <Pressable onPress={() => void Linking.openURL(TERMS_URL)}>
              <Text style={styles.legal}>Conditions</Text>
            </Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable onPress={() => void Linking.openURL(PRIVACY_URL)}>
              <Text style={styles.legal}>Confidentialité</Text>
            </Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable onPress={() => void handleRestore()}>
              <Text style={styles.legal}>Restaurer</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 24,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 34,
    },
    topRowDark: {
      marginTop: 18,
    },
    mic: {
      fontSize: 24,
      color: colors.text,
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
    },
    closeText: {
      fontSize: 27,
      lineHeight: 30,
      color: colors.text,
      fontWeight: '300',
    },
    eyebrow: {
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: colors.accent,
      marginBottom: 10,
    },
    title: {
      fontSize: 40,
      lineHeight: 42,
      letterSpacing: -1.2,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 16,
    },
    subtitle: {
      fontSize: 17,
      lineHeight: 24,
      color: colors.textSecondary,
      marginBottom: 28,
      maxWidth: 370,
    },
    plans: {
      gap: 12,
    },
    plan: {
      minHeight: 104,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surfaceRaised,
      paddingHorizontal: 16,
      paddingVertical: 15,
      flexDirection: 'row',
      alignItems: 'center',
    },
    planActive: {
      borderWidth: 2,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    radio: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: colors.textMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    radioActive: {
      borderColor: colors.accent,
    },
    radioDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.accent,
    },
    planBody: {
      flex: 1,
      paddingRight: 8,
    },
    planTop: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 5,
    },
    planTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    trialBadge: {
      backgroundColor: colors.accent,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
    },
    trialText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    planDetail: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    price: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'right',
    },
    loadingRow: {
      minHeight: 32,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 10,
    },
    loadingText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    continueButton: {
      minHeight: 58,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 26,
      backgroundColor: colors.text,
      paddingHorizontal: 18,
    },
    continueText: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.background,
      textAlign: 'center',
    },
    pressed: {
      opacity: 0.82,
    },
    disabled: {
      opacity: 0.6,
    },
    renewal: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 13,
      paddingHorizontal: 6,
    },
    restore: {
      fontSize: 14,
      fontWeight: '600',
      textDecorationLine: 'underline',
      color: colors.text,
      textAlign: 'center',
      marginTop: 9,
    },
    features: {
      flexDirection: 'row',
      gap: 18,
      marginTop: 40,
    },
    featureColumn: {
      flex: 1,
      gap: 14,
    },
    feature: {
      fontSize: 14,
      color: colors.text,
    },
    legalRow: {
      marginTop: 'auto',
      paddingTop: 48,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    legal: {
      fontSize: 12,
      color: colors.textMuted,
    },
    legalDot: {
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}
