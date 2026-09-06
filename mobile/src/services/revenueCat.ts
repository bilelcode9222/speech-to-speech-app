import { Platform } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { getInstallationId } from './anonymousSession';
import { refreshAccessStatus } from './accessService';

export const PREMIUM_ENTITLEMENT_ID = 'premium';

let configured = false;

export function isRevenueCatConfigured(): boolean {
  return configured;
}

export async function configureRevenueCat(): Promise<boolean> {
  if (configured) return true;

  if (Platform.OS !== 'ios') {
    return false;
  }

  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim();

  if (!apiKey) {
    console.log(
      '[RevenueCat] EXPO_PUBLIC_REVENUECAT_IOS_API_KEY manquante. Les achats sont désactivés.',
    );
    return false;
  }

  // Une build TestFlight/App Store doit utiliser la clé publique iOS de l'app
  // RevenueCat (habituellement appl_...), jamais la clé du Test Store (test_...).
  // Sinon RevenueCat ne peut pas charger les produits réels de l'App Store.
  if (!__DEV__ && apiKey.startsWith('test_')) {
    console.log(
      '[RevenueCat] Clé Test Store détectée en production. Utilise la clé SDK publique iOS de Traduction Vocale - Nevi AI.',
    );
    return false;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    // Configure d'abord RevenueCat en anonyme, puis logIn vers l'identifiant
    // Nevi. Cette séquence permet à RevenueCat d'aliaser proprement les anciens
    // utilisateurs anonymes déjà présents sur TestFlight au lieu de créer une
    // identité parallèle lors de la migration.
    Purchases.configure({ apiKey });
    const installationId = await getInstallationId();
    await Purchases.logIn(installationId);
    configured = true;
    return true;
  } catch (error) {
    console.log('[RevenueCat] configuration impossible', error);
    return false;
  }
}

export function customerInfoIsPremium(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
}

export async function hasPremiumEntitlement(): Promise<boolean> {
  const ready = await configureRevenueCat();
  if (!ready) return false;

  const customerInfo = await Purchases.getCustomerInfo();
  return customerInfoIsPremium(customerInfo);
}

export async function syncPremiumWithBackend(): Promise<boolean> {
  const premium = await hasPremiumEntitlement();
  try {
    await refreshAccessStatus();
  } catch (error) {
    console.log('[RevenueCat] synchronisation backend impossible', error);
  }
  return premium;
}

export async function isTrialEligible(productIdentifier: string): Promise<boolean> {
  const ready = await configureRevenueCat();
  if (!ready || Platform.OS !== 'ios') return false;

  try {
    const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility([
      productIdentifier,
    ]);
    const item = eligibility[productIdentifier];
    return (
      item?.status ===
      Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE
    );
  } catch (error) {
    console.log('[RevenueCat] éligibilité essai inconnue', error);
    // Ne jamais promettre un essai lorsqu'on ne peut pas le confirmer.
    return false;
  }
}

export function subscribePremiumStatus(
  listener: (premium: boolean) => void,
): () => void {
  const onCustomerInfo = (customerInfo: CustomerInfo) => {
    listener(customerInfoIsPremium(customerInfo));
    void refreshAccessStatus().catch(() => {});
  };

  Purchases.addCustomerInfoUpdateListener(onCustomerInfo);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(onCustomerInfo);
  };
}
