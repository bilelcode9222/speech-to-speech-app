import { Platform } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { getInstallationId } from './anonymousSession';
import { refreshAccessStatus } from './accessService';

export const PREMIUM_ENTITLEMENT_ID = 'premium';

let configured = false;
let configurationPromise: Promise<boolean> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRevenueCatConfigured(): boolean {
  return configured;
}

export async function configureRevenueCat(): Promise<boolean> {
  if (configured) return true;
  if (configurationPromise) return configurationPromise;

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

  if (!__DEV__ && apiKey.startsWith('test_')) {
    console.log(
      '[RevenueCat] Clé Test Store détectée en production. Utilise la clé SDK publique iOS de Traduction Vocale - Nevi AI.',
    );
    return false;
  }

  configurationPromise = (async () => {
    try {
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      Purchases.configure({ apiKey });
      const installationId = await getInstallationId();
      await Purchases.logIn(installationId);
      configured = true;
      return true;
    } catch (error) {
      console.log('[RevenueCat] configuration impossible', error);
      configured = false;
      return false;
    } finally {
      configurationPromise = null;
    }
  })();

  return configurationPromise;
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
  let localPremium = false;
  try {
    localPremium = await hasPremiumEntitlement();
  } catch (error) {
    console.log('[RevenueCat] lecture entitlement locale impossible', error);
  }

  try {
    const access = await refreshAccessStatus();
    return access.premium;
  } catch (error) {
    console.log('[RevenueCat] synchronisation backend impossible', error);
    return localPremium;
  }
}

export async function waitForPremiumBackendSync(
  attempts = 10,
  delayMs = 1200,
): Promise<boolean> {
  const ready = await configureRevenueCat();
  if (!ready) return false;

  try {
    const customerInfo = await Purchases.getCustomerInfo();
    if (!customerInfoIsPremium(customerInfo)) return false;
  } catch (error) {
    console.log('[RevenueCat] entitlement post-achat illisible', error);
    return false;
  }

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const access = await refreshAccessStatus();
      if (access.premium) return true;
    } catch (error) {
      console.log('[RevenueCat] backend pas encore synchronisé', error);
    }

    if (attempt < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return false;
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
    return false;
  }
}

export function subscribePremiumStatus(
  listener: (premium: boolean) => void,
): () => void {
  const onCustomerInfo = (customerInfo: CustomerInfo) => {
    const localPremium = customerInfoIsPremium(customerInfo);

    void refreshAccessStatus()
      .then((access) => listener(access.premium))
      .catch(() => listener(localPremium));
  };

  Purchases.addCustomerInfoUpdateListener(onCustomerInfo);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(onCustomerInfo);
  };
}
