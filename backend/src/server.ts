import http from 'http';
import os from 'os';
import crypto from 'crypto';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';

import { config } from './config/env';
import { logger } from './utils/logger';
import { registerTranslationSocket } from './sockets/translationSocket';
import { runSpeechPipeline } from './pipeline/speechPipeline';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { LANGUAGES } from './utils/languages';
import { StageError, TranslationRequest } from './types';
import {
  AnonymousSession,
  isValidInstallationId,
  issueAnonymousSession,
  requireAnonymousHttpSession,
  requireAnonymousSocketSession,
} from './security/anonymousSession';
import { consumeRateLimit } from './security/rateLimit';
import {
  accessMessage,
  beginTranslation,
  finishTranslation,
  inspectAccess,
  recordSuccessfulTranslation,
} from './security/accessControl';
import { invalidateRevenueCatCache } from './services/revenueCatService';
import { privacyPage, supportPage, termsPage } from './legal/pages';
import {
  analyticsDashboardConfigured,
  AnalyticsPeriod,
  loadAnalyticsSnapshot,
} from './services/analyticsDashboard';
import { analyticsDashboardPage } from './admin/analyticsDashboardPage';
import { recordRevenueCatAnalytics } from './services/revenueCatAnalytics';
import { recordTranslationCost } from './services/unitEconomics';
import { AnalyticsProperties, recordAnalyticsEvent } from './services/analyticsStore';

const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '12mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    provider: config.provider,
    ttsProvider: config.ttsProvider,
    durableUsageStore: Boolean(config.databaseUrl),
    revenueCatServerVerification: Boolean(config.revenueCat.apiKey),
  });
});

app.get('/languages', (_req, res) => {
  res.json(LANGUAGES);
});

app.get('/support', (_req, res) => {
  res.type('html').send(supportPage());
});

app.get('/privacy', (_req, res) => {
  res.type('html').send(privacyPage());
});

app.get('/terms', (_req, res) => {
  res.type('html').send(termsPage());
});

app.get('/admin/analytics', (_req, res) => {
  res.type('html').send(analyticsDashboardPage());
});

app.get('/api/admin/analytics', async (req, res) => {
  if (!analyticsDashboardAccessAllowed(req.header('x-nevi-dashboard-token'))) {
    res.status(401).json({ error: 'Accès au tableau de bord refusé.' });
    return;
  }

  if (!analyticsDashboardConfigured()) {
    res.status(503).json({
      error: 'Nevi Pulse requiert DATABASE_URL pour son stockage interne.',
    });
    return;
  }

  const requestedDays = Number(req.query.days);
  const period: AnalyticsPeriod =
    requestedDays === 7 || requestedDays === 14 ? requestedDays : 30;

  try {
    res.json(await loadAnalyticsSnapshot(period));
  } catch (error) {
    logger.error('Tableau de bord Nevi Pulse indisponible', error);
    res.status(502).json({
      error: 'Nevi Pulse ne répond pas pour le moment. Réessaie dans quelques instants.',
    });
  }
});

const CLIENT_ANALYTICS_EVENTS = new Set([
  'app_opened', 'onboarding_viewed', 'onboarding_step_completed', 'onboarding_completed',
  'paywall_step_viewed', 'trial_reminder_permission', 'paywall_opened', 'subscription_plan_selected', 'subscription_purchase_started',
  'subscription_purchased', 'subscription_restored', 'subscription_purchase_failed',
  'subscription_backend_sync_delayed', 'translation_recording_started', 'translation_completed',
  'translation_failed', 'face_to_face_mode_changed', 'client_error',
]);

function safeAnalyticsProperties(value: unknown): AnalyticsProperties | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 20) return null;
  const safe: AnalyticsProperties = {};
  for (const [key, item] of entries) {
    if (!/^[a-z_]{1,64}$/.test(key)) return null;
    if (typeof item === 'string') {
      if (item.length > 80) return null;
      safe[key] = item;
    } else if (typeof item === 'number' && Number.isFinite(item)) {
      safe[key] = item;
    } else if (typeof item === 'boolean' || item === null) {
      safe[key] = item;
    } else {
      return null;
    }
  }
  return safe;
}

app.post('/api/analytics/events', requireAnonymousHttpSession, async (req, res) => {
  const event = req.body?.event;
  const properties = safeAnalyticsProperties(req.body?.properties);
  if (typeof event !== 'string' || !CLIENT_ANALYTICS_EVENTS.has(event) || !properties) {
    res.status(400).json({ error: 'Événement analytics invalide.' });
    return;
  }

  try {
    const session = res.locals.anonymousSession as AnonymousSession;
    await recordAnalyticsEvent(event, session.installationId, properties);
    res.status(204).end();
  } catch (error) {
    logger.warn('Événement Nevi Pulse client non enregistré', error);
    res.status(503).json({ error: 'Nevi Pulse indisponible.' });
  }
});

app.post('/webhooks/revenuecat', async (req, res) => {
  if (
    !secretMatches(
      config.analyticsDashboard.revenueCatWebhookAuthorization,
      req.header('authorization'),
    )
  ) {
    res.status(401).json({ error: 'Webhook RevenueCat refusé.' });
    return;
  }

  try {
    await recordRevenueCatAnalytics(req.body);
    res.status(204).end();
  } catch (error) {
    logger.error('Webhook RevenueCat non enregistré', error);
    res.status(502).json({ error: 'Événement RevenueCat non enregistré.' });
  }
});

app.post('/api/session', (req, res) => {
  const installationId = req.body?.installationId;
  if (!isValidInstallationId(installationId)) {
    res.status(400).json({ error: "Identifiant d'installation invalide." });
    return;
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const limit = consumeRateLimit(`session:${ip}`, 30, 60 * 60_000);
  if (!limit.allowed) {
    res.setHeader('Retry-After', Math.ceil(limit.retryAfterMs / 1000));
    res.status(429).json({ error: 'Trop de créations de session.' });
    return;
  }

  res.json(issueAnonymousSession(installationId));
});

app.get('/api/access', requireAnonymousHttpSession, async (_req, res, next) => {
  try {
    const session = res.locals.anonymousSession as AnonymousSession;
    res.json(await inspectAccess(session.installationId));
  } catch (error) {
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

app.post('/api/access/refresh', requireAnonymousHttpSession, async (_req, res, next) => {
  try {
    const session = res.locals.anonymousSession as AnonymousSession;
    invalidateRevenueCatCache(session.installationId);
    res.json(await inspectAccess(session.installationId));
  } catch (error) {
    next(error instanceof Error ? error : new Error(String(error)));
  }
});

app.post('/api/translate', requireAnonymousHttpSession, async (req, res, next) => {
  const session = res.locals.anonymousSession as AnonymousSession;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  let started = false;

  try {
    const installationLimit = consumeRateLimit(
      `translate-install:${session.installationId}`,
      20,
      60_000
    );
    const ipLimit = consumeRateLimit(`translate-ip:${ip}`, 60, 60_000);

    if (!installationLimit.allowed || !ipLimit.allowed) {
      const retryAfterMs = Math.max(
        installationLimit.retryAfterMs,
        ipLimit.retryAfterMs
      );
      res.setHeader('Retry-After', Math.ceil(retryAfterMs / 1000));
      res.status(429).json({ code: 'RATE_LIMIT', error: 'Trop de traductions. Patiente une minute.' });
      return;
    }

    const access = await beginTranslation(session.installationId);
    if (!access.allowed) {
      const status = access.code === 'PAYWALL_REQUIRED' ? 402 : 429;
      res.status(status).json({ code: access.code, error: accessMessage(access.code), access });
      return;
    }
    started = true;

    const result = await runSpeechPipeline(req.body as TranslationRequest);
    await recordSuccessfulTranslation(session.installationId, access.premium);
    res.json(result);
    void recordTranslationCost({
      installationId: session.installationId,
      recordingDurationMs: req.body?.recordingDurationMs,
      translatedText: result.translatedText,
      translationInputTokens: result.usage.translationInputTokens,
      translationOutputTokens: result.usage.translationOutputTokens,
    });
  } catch (error) {
    next(error instanceof StageError ? error : new Error(String(error)));
  } finally {
    if (started) finishTranslation(session.installationId);
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 12 * 1024 * 1024,
});

io.use(requireAnonymousSocketSession);
registerTranslationSocket(io);

server.listen(config.port, '0.0.0.0', () => {
  logger.success(`Serveur démarré sur le port ${config.port}`);
  logger.info(`Local     : http://localhost:${config.port}/health`);
  for (const address of localAddresses()) {
    logger.info(`Réseau    : http://${address}:${config.port}/health`);
  }
});

function localAddresses(): string[] {
  const results: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const iface of list || []) {
      if (iface.family === 'IPv4' && !iface.internal) results.push(iface.address);
    }
  }
  return results;
}

function analyticsDashboardAccessAllowed(candidate: string | undefined): boolean {
  return secretMatches(config.analyticsDashboard.dashboardToken, candidate);
}

function secretMatches(
  expected: string | undefined,
  candidate: string | undefined,
): boolean {
  if (!expected || !candidate) return false;

  const expectedBuffer = Buffer.from(expected);
  const candidateBuffer = Buffer.from(candidate);
  return (
    expectedBuffer.length === candidateBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, candidateBuffer)
  );
}

process.on('unhandledRejection', (reason) => {
  logger.error('Promesse rejetée non gérée', reason);
});
