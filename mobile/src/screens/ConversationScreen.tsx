import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setAudioModeAsync } from 'expo-audio';

import { FaceToFaceView } from '../components/FaceToFaceView';
import { LanguageSelector } from '../components/LanguageSelector';
import { Logo } from '../components/Logo';
import { RecordButton } from '../components/RecordButton';
import { TranscriptBubble } from '../components/TranscriptBubble';
import { Paywall } from '../components/Paywall';
import {
  FREE_TRANSLATION_LIMIT,
  getFreeTranslationCount,
  incrementFreeTranslationCount,
} from '../services/freeUsage';
import {
  configureRevenueCat,
  subscribePremiumStatus,
  syncPremiumWithBackend,
} from '../services/revenueCat';
import { MAX_RECORDING_MS, SERVER_URL } from '../constants/config';
import { useTranslationSocket } from '../hooks/useTranslationSocket';
import { useSilenceDetection } from '../hooks/useSilenceDetection';
import {
  deleteRecording,
  formatFromUri,
  prepareAudioSession,
  readRecordingAsBase64,
  useRecorder,
} from '../services/audioRecorder';
import { getSocket } from '../services/socketService';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../theme/ThemeProvider';
import { Palette, spacing, type } from '../theme/tokens';
import { SOCKET_EVENTS } from '../types';
import { useTranslation } from '../i18n/useTranslation';

type Side = 'top' | 'bottom';

export function ConversationScreen() {
  const { t } = useTranslation();
  const { colors, name: themeName, toggle } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const recorder = useRecorder();
  const [recordingSide, setRecordingSide] = useState<Side | null>(null);
  const [micReady, setMicReady] = useState(false);
  const [faceToFace, setFaceToFace] = useState(false);
  const [faceToFaceAutoSide, setFaceToFaceAutoSide] = useState<Side>('bottom');
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [freeTranslationCount, setFreeTranslationCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const countedCompletedExchanges = useRef<Set<string>>(new Set());
  const [activeTop, setActiveTop] = useState(false);
  const autoStop = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyToggling = useRef(false);
  const premiumRecheckInFlight = useRef(false);
  const startedAt = useRef<number>(0);
  const directionRef = useRef<{ from: string; to: string } | null>(null);

  const {
    sourceLanguage,
    targetLanguage,
    lastManualSourceLanguage,
    exchanges,
    isConnected,
    setSourceLanguage,
    setTargetLanguage,
    swapLanguages,
    addExchange,
    updateExchange,
  } = useAppStore();

  const recheckPremiumBeforePaywall = useCallback(async (): Promise<boolean> => {
    if (premiumRecheckInFlight.current) return false;
    premiumRecheckInFlight.current = true;
    try {
      const premium = await syncPremiumWithBackend().catch(() => false);
      setIsPremium(premium);
      if (premium) setPaywallOpen(false);
      return premium;
    } finally {
      premiumRecheckInFlight.current = false;
    }
  }, []);

  const { armTimeout } = useTranslationSocket({
    onAccessError: (code, message) => {
      if (code === 'PAYWALL_REQUIRED') {
        // Une transaction App Store peut être visible sur l'iPhone quelques
        // secondes avant RevenueCat côté serveur. On resynchronise avant de
        // rouvrir le paywall pour éviter une boucle après achat.
        void recheckPremiumBeforePaywall().then((premium) => {
          if (!premium) {
            setIsPremium(false);
            setPaywallOpen(true);
          }
        });
        return;
      }
      if (
        code === 'FAIR_USE_DAILY_LIMIT' ||
        code === 'FAIR_USE_30_DAY_LIMIT'
      ) {
        Alert.alert('Limite d’usage raisonnable', message);
      }
    },
  });

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void Promise.all([
      getFreeTranslationCount(),
      syncPremiumWithBackend().catch(() => false),
    ]).then(([count, premium]) => {
      if (cancelled) return;
      setFreeTranslationCount(count);
      setIsPremium(premium);
    });

    void configureRevenueCat().then((ready) => {
      if (!ready || cancelled) return;
      unsubscribe = subscribePremiumStatus((premium) => {
        if (!cancelled) {
          setIsPremium(premium);
          if (premium) setPaywallOpen(false);
        }
      });
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (isPremium) return;

    const newlyCompleted = exchanges.filter(
      (exchange) =>
        exchange.status === 'done' &&
        !countedCompletedExchanges.current.has(exchange.id),
    );

    if (newlyCompleted.length === 0) return;

    newlyCompleted.forEach((exchange) => {
      countedCompletedExchanges.current.add(exchange.id);
    });

    void (async () => {
      let count = freeTranslationCount;

      for (let index = 0; index < newlyCompleted.length; index += 1) {
        if (count >= FREE_TRANSLATION_LIMIT) break;
        count = await incrementFreeTranslationCount();
      }

      setFreeTranslationCount(count);
    })();
  }, [exchanges, freeTranslationCount, isPremium]);

  const isRecording = recordingSide !== null;

  useSilenceDetection(recorder, isRecording, () => stopRecording());
  const isBusy = exchanges.some((e) => e.status !== 'done' && e.status !== 'error');

  const startRecording = useCallback(
    async (side: Side, from: string, to: string) => {
      let ready = micReady;
      if (!ready) {
        ready = await prepareAudioSession();
        setMicReady(ready);
        if (!ready) {
          Alert.alert(t('micDenied'), t('micDeniedBody'));
          return;
        }
      }

      try {
        directionRef.current = { from, to };
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        startedAt.current = Date.now();
        recorder.record();
        setRecordingSide(side);
        autoStop.current = setTimeout(() => stopRecording(), MAX_RECORDING_MS);
      } catch (error) {
        console.log('[record] démarrage impossible', error);
        Alert.alert(t('micUnavailable'), t('micUnavailableBody'));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [micReady, recorder, t],
  );

  const stopRecording = useCallback(async () => {
    if (autoStop.current) {
      clearTimeout(autoStop.current);
      autoStop.current = null;
    }
    setRecordingSide(null);

    const direction = directionRef.current || {
      from: sourceLanguage,
      to: targetLanguage,
    };
    let requestId: string | null = null;
    let uri: string | null = null;

    try {
      await recorder.stop();
      uri = recorder.uri;
      if (!uri) return;

      if (Date.now() - startedAt.current < 700) {
        await deleteRecording(uri);
        return;
      }

      requestId = `req-${Date.now()}`;

      addExchange({
        id: requestId,
        sourceLanguage: direction.from,
        targetLanguage: direction.to,
        originalText: null,
        translatedText: null,
        status: 'transcribing',
      });

      const audioFormat = formatFromUri(uri);
      const audioBase64 = await readRecordingAsBase64(uri);

      // Le fichier local n'est plus nécessaire dès qu'il est chargé en mémoire.
      await deleteRecording(uri).catch(() => {});
      uri = null;

      const socket = getSocket();
      if (!socket.connected) {
        updateExchange(requestId, {
          status: 'error',
          errorMessage: `Serveur injoignable à ${SERVER_URL}. Réessaie dans quelques instants.`,
        });
        return;
      }

      socket.emit(SOCKET_EVENTS.TRANSLATE, {
        requestId,
        audioBase64,
        audioFormat,
        sourceLanguage: direction.from,
        targetLanguage: direction.to,
      });
      armTimeout(requestId);
    } catch (error) {
      console.log('[record] arrêt impossible', error);
      if (requestId) {
        updateExchange(requestId, {
          status: 'error',
          errorMessage: 'Impossible de préparer cet enregistrement. Réessaie.',
        });
      }
    } finally {
      if (uri) await deleteRecording(uri).catch(() => {});
    }
  }, [
    recorder,
    sourceLanguage,
    targetLanguage,
    addExchange,
    updateExchange,
    armTimeout,
  ]);

  const toggleRecording = useCallback(
    async (side: Side, from: string, to: string) => {
      if (busyToggling.current) return;
      busyToggling.current = true;
      try {
        if (isRecording) {
          await stopRecording();
        } else {
          if (!isPremium && freeTranslationCount >= FREE_TRANSLATION_LIMIT) {
            const premium = await recheckPremiumBeforePaywall();
            if (!premium) {
              setPaywallOpen(true);
              return;
            }
          }

          await startRecording(side, from, to);
        }
      } finally {
        setTimeout(() => {
          busyToggling.current = false;
        }, 300);
      }
    },
    [
      isRecording,
      startRecording,
      stopRecording,
      isPremium,
      freeTranslationCount,
      recheckPremiumBeforePaywall,
    ],
  );

  const handleFaceToFaceSwap = useCallback(() => {
    if (sourceLanguage === 'auto') {
      setFaceToFaceAutoSide((side) => (side === 'bottom' ? 'top' : 'bottom'));
      return;
    }

    swapLanguages();
  }, [sourceLanguage, swapLanguages]);

  const faceTopLanguageCode =
    sourceLanguage === 'auto'
      ? faceToFaceAutoSide === 'top'
        ? 'auto'
        : targetLanguage
      : targetLanguage;

  const faceBottomLanguageCode =
    sourceLanguage === 'auto'
      ? faceToFaceAutoSide === 'bottom'
        ? 'auto'
        : lastManualSourceLanguage
      : sourceLanguage;

  const handleFaceTopToggle = useCallback(() => {
    if (sourceLanguage !== 'auto') {
      void toggleRecording('top', targetLanguage, sourceLanguage);
      return;
    }

    if (faceToFaceAutoSide === 'top') {
      void toggleRecording('top', 'auto', lastManualSourceLanguage);
      return;
    }

    void toggleRecording('top', targetLanguage, lastManualSourceLanguage);
  }, [
    sourceLanguage,
    targetLanguage,
    lastManualSourceLanguage,
    faceToFaceAutoSide,
    toggleRecording,
  ]);

  const handleFaceBottomToggle = useCallback(() => {
    if (sourceLanguage !== 'auto') {
      void toggleRecording('bottom', sourceLanguage, targetLanguage);
      return;
    }

    if (faceToFaceAutoSide === 'bottom') {
      void toggleRecording('bottom', 'auto', targetLanguage);
      return;
    }

    void toggleRecording('bottom', lastManualSourceLanguage, targetLanguage);
  }, [
    sourceLanguage,
    targetLanguage,
    lastManualSourceLanguage,
    faceToFaceAutoSide,
    toggleRecording,
  ]);

  const latest = exchanges[0] || null;

  return (
    <SafeAreaView
      style={[
        styles.screen,
        faceToFace && activeTop && { backgroundColor: colors.text },
      ]}
      edges={faceToFace ? [] : ['top', 'bottom']}
    >
      {!faceToFace && (
        <View style={styles.header}>
          <View>
            <Logo size={28} />
            <View style={styles.status}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isConnected ? colors.textMuted : colors.danger },
                ]}
              />
              <Text style={styles.statusText}>
                {isConnected ? t('connected') : t('serverOffline')}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setPaywallOpen(true)}
              hitSlop={10}
              style={styles.proButton}
              accessibilityRole="button"
              accessibilityLabel="Ouvrir Nevi Pro"
            >
              <Text style={styles.proButtonText}>PRO</Text>
            </Pressable>
            <Pressable
              onPress={() => setFaceToFace((v) => !v)}
              hitSlop={10}
              style={[styles.iconButton, faceToFace && styles.iconButtonActive]}
              accessibilityRole="button"
              accessibilityLabel={
                faceToFace ? t('faceToFaceExit') : t('faceToFaceEnter')
              }
            >
              <Text
                style={[styles.icon, faceToFace && { color: colors.background }]}
              >
                ⇅
              </Text>
            </Pressable>

            <Pressable
              onPress={toggle}
              hitSlop={10}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel={
                themeName === 'dark' ? t('themeToLight') : t('themeToDark')
              }
            >
              <Text style={styles.icon}>{themeName === 'dark' ? '☀' : '☾'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {!faceToFace && (
        <View style={styles.selectorRow}>
          <View style={styles.selectorGrow}>
            <LanguageSelector
              sourceCode={sourceLanguage}
              targetCode={targetLanguage}
              onChangeSource={setSourceLanguage}
              onChangeTarget={setTargetLanguage}
              onSwap={swapLanguages}
              disabled={isRecording || isBusy}
            />
          </View>
        </View>
      )}

      {faceToFace ? (
        <FaceToFaceView
          exchange={latest}
          topLanguageCode={faceTopLanguageCode}
          bottomLanguageCode={faceBottomLanguageCode}
          recordingSide={recordingSide}
          isBusy={isBusy}
          onToggleTop={handleFaceTopToggle}
          onToggleBottom={handleFaceBottomToggle}
          onSwapLanguages={handleFaceToFaceSwap}
          onExit={() => setFaceToFace(false)}
          onActiveSideChange={(s) => setActiveTop(s === 'top')}
        />
      ) : (
        <>
          {exchanges.length === 0 ? (
            <View style={styles.empty} />
          ) : (
            <View style={styles.singleExchange}>
              <TranscriptBubble exchange={exchanges[0]} />
            </View>
          )}

          <View style={styles.footer}>
            <RecordButton
              isRecording={isRecording}
              isBusy={isBusy}
              onToggle={() =>
                toggleRecording('bottom', sourceLanguage, targetLanguage)
              }
            />
          </View>
        </>
      )}
      <Paywall
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onPremiumActivated={() => {
          setIsPremium(true);
          setPaywallOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    screenFace: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.md,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    title: { ...type.title, color: colors.text },
    status: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    statusDot: { width: 5, height: 5, borderRadius: 3 },
    statusText: { fontSize: 12, color: colors.textMuted },
    headerActions: { flexDirection: 'row', gap: spacing.sm },
    proButton: {
      height: 34,
      paddingHorizontal: 11,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accent,
    },
    proButtonText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.7,
      color: colors.accent,
    },
    iconButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    iconButtonActive: { backgroundColor: colors.text, borderColor: colors.text },
    icon: { fontSize: 15, color: colors.textSecondary },
    selector: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
    selectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      paddingTop: spacing.sm,
    },
    selectorGrow: { flex: 1 },
    exitButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    list: { flex: 1 },
    listContent: { paddingHorizontal: spacing.md },
    singleExchange: {
      flex: 1,
      paddingHorizontal: spacing.md,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    emptyBody: { ...type.body, color: colors.textMuted, textAlign: 'center' },
    footer: { paddingVertical: spacing.md, alignItems: 'center' },
  });
}
