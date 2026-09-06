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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Palette } from '../theme/tokens';
import {
  PREMIUM_ENTITLEMENT_ID,
  configureRevenueCat,
  isTrialEligible,
  waitForPremiumBackendSync,
} from '../services/revenueCat';
import {
  PREMIUM_30_DAY_LIMIT,
  PREMIUM_DAILY_LIMIT,
  PRIVACY_URL,
  TERMS_URL,
} from '../constants/config';
import { useTranslation } from '../i18n/useTranslation';
import {
  fill,
  getPaywallCopy,
  PaywallCopy,
} from '../i18n/paywallTranslations';

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

function trialLabel(
  pkg: PurchasesPackage | null,
  copy: PaywallCopy,
): string | null {
  const intro = pkg?.product.introPrice;
  if (!intro || intro.price !== 0) return null;

  const count = intro.periodNumberOfUnits;
  const unit = String(intro.periodUnit).toUpperCase();
  const words: Record<string, [string, string]> = {
    DAY: copy.day,
    WEEK: copy.week,
    MONTH: copy.month,
    YEAR: copy.year,
  };
  const [single, plural] = words[unit] || copy.day;
  return fill(copy.freeTrialTemplate, {
    count,
    unit: count === 1 ? single : plural,
  });
}

function periodSuffix(key: PlanKey, copy: PaywallCopy): string {
  if (key === 'annual') return copy.perYear;
  if (key === 'monthly') return copy.perMonth;
  return copy.perWeek;
}

function uniquePackages(packages: PurchasesPackage[]): PurchasesPackage[] {
  const byProduct = new Map<string, PurchasesPackage>();
  for (const pkg of packages) {
    byProduct.set(pkg.product.identifier, pkg);
  }
  return [...byProduct.values()];
}

export function Paywall({
  visible,
  onClose,
  onPremiumActivated,
}: Props) {
  const { locale } = useTranslation();
  const copy = useMemo(() => getPaywallCopy(locale), [locale]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

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
      const currentPackages = offerings.current?.availablePackages ?? [];
      const everyOfferingPackages = Object.values(offerings.all ?? {}).flatMap(
        (offering) => offering.availablePackages,
      );

      const available = uniquePackages(
        currentPackages.length > 0 ? currentPackages : everyOfferingPackages,
      );

      if (currentPackages.length === 0 && available.length > 0) {
        console.log(
          '[RevenueCat] Offering courante vide : utilisation des packages disponibles dans les autres Offerings.',
        );
      }

      if (available.length === 0) {
        console.log(
          '[RevenueCat] Aucun package App Store disponible. Vérifie les produits iOS, leur entitlement premium et les Offerings RevenueCat.',
        );
      }

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
    if (visible) void loadProducts();
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
          pkg &&
            trialEligibility[pkg.product.identifier] &&
            trialLabel(pkg, copy),
        ),
      };
    };

    return [
      makePlan('annual', copy.yearly),
      makePlan('monthly', copy.monthly),
      makePlan('weekly', copy.weekly),
    ];
  }, [packages, trialEligibility, copy]);

  const selectedPlan = plans.find((plan) => plan.key === selected) ?? plans[0];

  const displayPrice = (plan: Plan) => plan.package?.product.priceString || '—';

  const detail = (plan: Plan): string => {
    const product = plan.package?.product;
    if (!product) return copy.priceUnavailable;

    if (plan.key === 'annual') {
      const monthly = product.pricePerMonthString;
      return monthly
        ? fill(copy.approxPerMonth, { price: monthly })
        : `${product.priceString} ${copy.perYear}`;
    }
    if (plan.key === 'monthly') return `${product.priceString} ${copy.perMonth}`;
    return `${product.priceString} ${copy.perWeek}`;
  };

  const activateAfterVerifiedPurchase = async (): Promise<boolean> => {
    const backendPremium = await waitForPremiumBackendSync();
    if (!backendPremium) {
      console.log(
        '[RevenueCat] Achat présent sur l’appareil mais activation backend pas encore confirmée.',
      );
      return false;
    }

    onPremiumActivated?.();
    onClose();
    return true;
  };

  const handlePurchase = async () => {
    const ready = await configureRevenueCat();

    if (!ready) {
      Alert.alert(copy.subscriptionUnavailableTitle, copy.purchasesUnavailableBody);
      return;
    }

    if (!selectedPlan.package) {
      Alert.alert(copy.subscriptionUnavailableTitle, copy.pricesUnavailableBody);
      return;
    }

    setLoading(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(selectedPlan.package);
      const localPremium =
        customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;

      if (!localPremium) {
        Alert.alert(copy.purchaseFailedTitle, copy.purchaseFailedBody);
        return;
      }

      const activated = await activateAfterVerifiedPurchase();
      if (!activated) {
        Alert.alert(copy.purchaseFailedTitle, copy.purchaseFailedBody);
      }
    } catch (error: any) {
      if (!error?.userCancelled) {
        console.log('[RevenueCat] achat impossible', error);
        Alert.alert(copy.purchaseFailedTitle, copy.purchaseFailedBody);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    const ready = await configureRevenueCat();

    if (!ready) {
      Alert.alert(copy.restoreUnavailableTitle, copy.purchasesUnavailableBody);
      return;
    }

    setLoading(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      const localPremium =
        customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;

      if (!localPremium) {
        Alert.alert(copy.noSubscriptionTitle, copy.noSubscriptionBody);
        return;
      }

      const activated = await activateAfterVerifiedPurchase();
      if (activated) {
        Alert.alert(copy.restoreSuccessTitle, copy.restoreSuccessBody);
      } else {
        Alert.alert(copy.restoreFailedTitle, copy.restoreFailedBody);
      }
    } catch (error) {
      console.log('[RevenueCat] restauration impossible', error);
      Alert.alert(copy.restoreFailedTitle, copy.restoreFailedBody);
    } finally {
      setLoading(false);
    }
  };

  const intro = selectedPlan.trialEligible ? trialLabel(selectedPlan.package, copy) : null;

  const buttonLabel = !selectedPlan.package
    ? copy.subscriptionUnavailableTitle
    : intro
      ? fill(copy.tryFreeTemplate, { trial: intro })
      : `${copy.continueLabel} — ${displayPrice(selectedPlan)}`;

  const renewalText = selectedPlan.package
    ? `${intro ? `${intro}. ${copy.then} ` : ''}${displayPrice(selectedPlan)} ${periodSuffix(
        selectedPlan.key,
        copy,
      )}. ${copy.autoRenew}`
    : copy.conditionsUnavailable;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: Math.max(insets.top + 12, 24) },
          ]}
          contentInsetAdjustmentBehavior="never"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <Text style={styles.mic}>●</Text>
            <Pressable
              onPress={onClose}
              hitSlop={18}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel={copy.close}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <Text style={styles.eyebrow}>NEVI PRO</Text>
          <Text style={styles.title}>
            {copy.headlineLine1}{`\n`}{copy.headlineLine2}
          </Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>

          <View style={styles.plans}>
            {plans.map((plan) => {
              const active = selected === plan.key;
              const planTrial = plan.trialEligible ? trialLabel(plan.package, copy) : null;

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
              <Text style={styles.loadingText}>{copy.loadingPrices}</Text>
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

          <Text style={styles.renewal}>{renewalText}</Text>

          <Text style={styles.renewal}>
            {fill(copy.fairUseTemplate, {
              daily: PREMIUM_DAILY_LIMIT,
              monthly: PREMIUM_30_DAY_LIMIT,
            })}
          </Text>

          <Pressable
            onPress={() => void handleRestore()}
            disabled={loading}
            hitSlop={8}
          >
            <Text style={styles.restore}>{copy.restorePurchase}</Text>
          </Pressable>

          <View style={styles.features}>
            <View style={styles.featureColumn}>
              <Text style={styles.feature}>✓  {copy.unlimitedTranslations}</Text>
              <Text style={styles.feature}>✓  {copy.travel}</Text>
            </View>
            <View style={styles.featureColumn}>
              <Text style={styles.feature}>✓  {copy.faceToFace}</Text>
              <Text style={styles.feature}>✓  {copy.naturalVoice}</Text>
            </View>
          </View>

          <View style={styles.legalRow}>
            <Pressable onPress={() => void Linking.openURL(TERMS_URL)}>
              <Text style={styles.legal}>{copy.terms}</Text>
            </Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable onPress={() => void Linking.openURL(PRIVACY_URL)}>
              <Text style={styles.legal}>{copy.privacy}</Text>
            </Pressable>
            <Text style={styles.legalDot}>·</Text>
            <Pressable onPress={() => void handleRestore()}>
              <Text style={styles.legal}>{copy.restore}</Text>
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
      paddingBottom: 24,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 34,
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
