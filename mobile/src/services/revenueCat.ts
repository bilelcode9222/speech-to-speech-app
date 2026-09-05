import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

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
      '[RevenueCat] EXPO_PUBLIC_REVENUECAT_IOS_API_KEY manquante. Le paywall reste visible mais les achats sont désactivés.',
    );
    return false;
  }

  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    Purchases.configure({ apiKey });
    configured = true;
    return true;
  } catch (error) {
    console.log('[RevenueCat] configuration impossible', error);
    return false;
  }
}

export async function hasPremiumEntitlement(): Promise<boolean> {
  const ready = await configureRevenueCat();
  if (!ready) return false;

  const customerInfo = await Purchases.getCustomerInfo();
  return customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
}
