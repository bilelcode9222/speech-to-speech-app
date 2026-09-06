import { Platform } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import { getInstallationId } from './anonymousSession';
import { refreshAccessStatus } from './accessService';

export const PREMIUM_ENTITLEMENT_ID = 'premium';

let configured = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

/**
 * Synchronise l'état RevenueCat iOS avec le backend Nevi.
 * Quand le backend répond, son état est l'autorité car c'est lui qui autorise
 * réellement les traductions. Si le backend est temporairement injoignable,
 * on conserve l'état RevenueCat local pour ne pas transformer une panne réseau
 * en faux paywall.
 */
export async function syncPremiumWithBackend(): Promise<boolean> {
  const localPremium = await hasPremiumEntitlement();
  try {
    const access = await refreshAccessStatus();
    return access.premium;
  } catch (error) {
    console.log('[RevenueCat] synchronisation backend impossible', error);
    return localPremium;
  }
}

/**
 * Après un achat/restauration, RevenueCat côté appareil peut recevoir
 * l'entitlement quelques secondes avant l'API serveur. On attend donc que le
 * backend voie à son tour premium=true avant de fermer le paywall.
 */
export async function waitForPremiumBackendSync(
  attempts = 6,
  delayMs = 1200,
): Promise<boolean> {
  const ready = await configureRevenueCat();
  if (!ready) return false;

  const customerInfo = await Purchases.getCustomerInfo();
  if (!customerInfoIsPremium(customerInfo)) return false;

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

    if (!localPremium) {
      listener(false);
      void refreshAccessStatus().catch(() => {});
      return;
    }

    // Ne déclare Premium dans l'UI qu'après confirmation serveur lorsque le
    // backend est joignable. Cela évite la boucle achat -> paywall réouvert.
    void refreshAccessStatus()
      .then((access) => listener(access.premium))
      .catch(() => listener(true));
  };

  Purchases.addCustomerInfoUpdateListener(onCustomerInfo);
  return () => {
    Purchases.removeCustomerInfoUpdateListener(onCustomerInfo);
  };
}
