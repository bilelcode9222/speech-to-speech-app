import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
} from '../services/revenueCat';

type PlanKey = 'annual' | 'monthly' | 'weekly';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPremiumActivated?: () => void;
}

interface Plan {
  key: PlanKey;
  title: string;
  fallbackPrice: string;
  detail: string;
  trial: boolean;
  package: PurchasesPackage | null;
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
    return (
      pkg.identifier === '$rc_monthly' ||
      haystack.includes('month')
    );
  }

  return (
    pkg.identifier === '$rc_weekly' ||
    haystack.includes('week')
  );
}

export function Paywall({
  visible,
  onClose,
  onPremiumActivated,
}: Props) {
  const { colors, name: themeName } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selected, setSelected] = useState<PlanKey>('annual');
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const ready = await configureRevenueCat();
      if (!ready) {
        setPackages([]);
        return;
      }

      const offerings = await Purchases.getOfferings();
      setPackages(offerings.current?.availablePackages ?? []);
    } catch (error) {
      console.log('[RevenueCat] offres indisponibles', error);
      setPackages([]);
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

    return [
      {
        key: 'annual',
        title: '1 an',
        fallbackPrice: '49,99 €',
        detail: '4,17 € / mois',
        trial: true,
        package: getPackage('annual'),
      },
      {
        key: 'monthly',
        title: '1 mois',
        fallbackPrice: '9,99 €',
        detail: '9,99 € / mois',
        trial: true,
        package: getPackage('monthly'),
      },
      {
        key: 'weekly',
        title: '1 semaine',
        fallbackPrice: '4,99 €',
        detail: '4,99 € / semaine',
        trial: false,
        package: getPackage('weekly'),
      },
    ];
  }, [packages]);

  const selectedPlan =
    plans.find((plan) => plan.key === selected) ?? plans[0];

  const displayPrice = (plan: Plan) =>
    plan.package?.product.priceString || plan.fallbackPrice;

  const handlePurchase = async () => {
    const ready = await configureRevenueCat();

    if (!ready) {
      Alert.alert(
        'RevenueCat à connecter',
        'Ajoute la clé publique iOS RevenueCat dans EXPO_PUBLIC_REVENUECAT_IOS_API_KEY puis reconstruis l’app.',
      );
      return;
    }

    if (!selectedPlan.package) {
      Alert.alert(
        'Abonnement indisponible',
        'RevenueCat ne renvoie pas encore ce produit. Vérifie que l’Offering courante contient Weekly, Monthly et Annual.',
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
        'RevenueCat à connecter',
        'La restauration sera disponible dès que la clé publique RevenueCat sera configurée.',
      );
      return;
    }

    setLoading(true);
    try {
      const customerInfo = await Purchases.restorePurchases();

      if (
        customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined
      ) {
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

  const buttonLabel = selectedPlan.trial
    ? 'Essayer 3 jours gratuits'
    : `Continuer — ${displayPrice(selectedPlan)} / semaine`;

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
            Traduction vocale illimitée, mode face à face, voix naturelle et
            bien plus encore.
          </Text>

          <View style={styles.plans}>
            {plans.map((plan) => {
              const active = selected === plan.key;

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
                      {plan.trial && (
                        <View style={styles.trialBadge}>
                          <Text style={styles.trialText}>
                            3 jours d’essai gratuit
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.planDetail}>{plan.detail}</Text>
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
            disabled={loading}
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.pressed,
              loading && styles.disabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.continueText}>{buttonLabel}</Text>
            )}
          </Pressable>

          <Text style={styles.renewal}>
            {selectedPlan.trial
              ? `3 jours d’essai gratuit. Puis ${displayPrice(selectedPlan)} ${
                  selected === 'annual' ? '/ an' : '/ mois'
                }. Abonnement automatique. Annulable à tout moment.`
              : 'Abonnement automatique. Annulable à tout moment.'}
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
              <Text style={styles.feature}>✓  Traductions illimitées</Text>
              <Text style={styles.feature}>✓  Traduisez en voyage</Text>
            </View>
            <View style={styles.featureColumn}>
              <Text style={styles.feature}>✓  Mode face à face</Text>
              <Text style={styles.feature}>✓  Voix naturelle</Text>
            </View>
          </View>

          <View style={styles.legalRow}>
            <Text style={styles.legal}>Conditions</Text>
            <Text style={styles.legalDot}>·</Text>
            <Text style={styles.legal}>Confidentialité</Text>
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
