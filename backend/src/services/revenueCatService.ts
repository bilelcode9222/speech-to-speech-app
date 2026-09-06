import axios from 'axios';
import { config } from '../config/env';
import { logger } from '../utils/logger';

interface RevenueCatEntitlement {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
}

interface RevenueCatSubscriberResponse {
  subscriber?: {
    entitlements?: Record<string, RevenueCatEntitlement>;
  };
}

interface RevenueCatOfferingPackage {
  identifier?: string;
  platform_product_identifier?: string;
}

interface RevenueCatOffering {
  identifier?: string;
  packages?: RevenueCatOfferingPackage[];
}

interface RevenueCatOfferingsResponse {
  current_offering_id?: string | null;
  offerings?: RevenueCatOffering[];
}

export interface RevenueCatCatalog {
  available: boolean;
  currentOfferingId: string | null;
  offerings: Array<{
    identifier: string;
    packages: Array<{
      identifier: string;
      productIdentifier: string;
    }>;
  }>;
  error?: string;
}

interface CacheEntry {
  premium: boolean;
  checkedAt: number;
}

const CACHE_TTL_MS = 5 * 60_000;
const STALE_TTL_MS = 24 * 60 * 60_000;
const cache = new Map<string, CacheEntry>();
let warnedMissingKey = false;

function entitlementIsActive(entitlement: RevenueCatEntitlement | undefined): boolean {
  if (!entitlement) return false;

  const now = Date.now();
  const grace = entitlement.grace_period_expires_date
    ? Date.parse(entitlement.grace_period_expires_date)
    : NaN;
  if (Number.isFinite(grace) && grace > now) return true;

  if (!entitlement.expires_date) return true;
  const expiry = Date.parse(entitlement.expires_date);
  return Number.isFinite(expiry) && expiry > now;
}

export function invalidateRevenueCatCache(appUserId: string): void {
  cache.delete(appUserId);
}

export async function getRevenueCatCatalog(appUserId: string): Promise<RevenueCatCatalog> {
  if (!config.revenueCat.apiKey) {
    return {
      available: false,
      currentOfferingId: null,
      offerings: [],
      error: 'SERVER_KEY_MISSING',
    };
  }

  try {
    const response = await axios.get<RevenueCatOfferingsResponse>(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}/offerings`,
      {
        headers: {
          Authorization: `Bearer ${config.revenueCat.apiKey}`,
          Accept: 'application/json',
          'X-Platform': 'ios',
        },
        timeout: 8000,
      }
    );

    const offerings = (response.data?.offerings ?? []).map((offering) => ({
      identifier: offering.identifier ?? 'unknown',
      packages: (offering.packages ?? [])
        .filter((pkg) => Boolean(pkg.platform_product_identifier))
        .map((pkg) => ({
          identifier: pkg.identifier ?? 'unknown',
          productIdentifier: pkg.platform_product_identifier as string,
        })),
    }));

    return {
      available: true,
      currentOfferingId: response.data?.current_offering_id ?? null,
      offerings,
    };
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    logger.warn(
      `Catalogue RevenueCat indisponible${status ? ` (${status})` : ''}.`
    );
    return {
      available: false,
      currentOfferingId: null,
      offerings: [],
      error: status ? `HTTP_${status}` : 'REQUEST_FAILED',
    };
  }
}

export async function isPremiumSubscriber(appUserId: string): Promise<boolean> {
  const cached = cache.get(appUserId);
  const now = Date.now();
  if (cached && now - cached.checkedAt < CACHE_TTL_MS) return cached.premium;

  if (!config.revenueCat.apiKey) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      logger.warn(
        'REVENUECAT_SERVER_API_KEY absente : le backend ne peut pas valider Nevi Pro.'
      );
    }
    return false;
  }

  try {
    const response = await axios.get<RevenueCatSubscriberResponse>(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
      {
        headers: {
          Authorization: `Bearer ${config.revenueCat.apiKey}`,
          Accept: 'application/json',
        },
        timeout: 8000,
      }
    );

    const entitlement =
      response.data?.subscriber?.entitlements?.[config.revenueCat.entitlementId];
    const premium = entitlementIsActive(entitlement);
    cache.set(appUserId, { premium, checkedAt: now });
    return premium;
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    logger.warn(
      `RevenueCat serveur indisponible${status ? ` (${status})` : ''}.`
    );

    // Une panne temporaire RevenueCat ne doit pas couper brutalement un client
    // Premium déjà vérifié récemment.
    if (cached && now - cached.checkedAt < STALE_TTL_MS) return cached.premium;
    return false;
  }
}
