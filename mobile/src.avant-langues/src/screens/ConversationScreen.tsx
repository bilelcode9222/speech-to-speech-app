import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setAudioModeAsync } from 'expo-audio';

import { FaceToFaceView } from '../components/FaceToFaceView';
import { LanguageSelector } from '../components/LanguageSelector';
import { Logo } from '../components/Logo';
import { RecordButton } from '../components/RecordButton';
import { TranscriptBubble } from '../components/TranscriptBubble';
import { MAX_RECORDING_MS, SERVER_URL } from '../constants/config';
import { useTranslationSocket } from '../hooks/useTranslationSocket';
import { useSilenceDetection } from '../hooks/useSilenceDetection';
import {
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

/** Quelle moitié de l'écran a lancé l'enregistrement en mode face-à-face */
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
  // Cote actif en face-a-face, pour accorder la zone securisee du haut
  const [activeTop, setActiveTop] = useState(false);
  const autoStop = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyToggling = useRef(false);
  // Instant de démarrage, pour mesurer la durée de l'enregistrement
  const startedAt = useRef<number>(0);
  // Mémorise le sens de la phrase en cours, pour l'attribuer à l'échange
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

  useTranslationSocket();

  // Arrêt automatique après un silence : plus besoin d'appuyer une
  // seconde fois pour envoyer.

  useEffect(() => {
    prepareAudioSession().then((granted) => {
      setMicReady(granted);
      if (!granted) {
        Alert.alert(
          t('micDenied'),
          t('micDeniedBody')
        );
      }
    });
  }, []);

  const isRecording = recordingSide !== null;

  // Arrêt automatique après un silence : plus besoin d'appuyer une seconde fois.
  useSilenceDetection(recorder, isRecording, () => stopRecording());
  const isBusy = exchanges.some((e) => e.status !== 'done' && e.status !== 'error');

  const startRecording = useCallback(
    async (side: Side, from: string, to: string) => {
      if (!micReady) return;
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
    [micReady, recorder]
  );

  const stopRecording = useCallback(async () => {
    if (autoStop.current) {
      clearTimeout(autoStop.current);
      autoStop.current = null;
    }
    setRecordingSide(null);

    const direction = directionRef.current || { from: sourceLanguage, to: targetLanguage };

    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return;

      // Un appui accidentel ne contient aucune parole : l'envoyer ferait
      // halluciner le modèle, qui produirait un mot au hasard.
      if (Date.now() - startedAt.current < 700) return;

      const requestId = `req-${Date.now()}`;

      addExchange({
        id: requestId,
        sourceLanguage: direction.from,
        targetLanguage: direction.to,
        originalText: null,
        translatedText: null,
        status: 'transcribing',
      });

      const audioBase64 = await readRecordingAsBase64(uri);

      const socket = getSocket();
      if (!socket.connected) {
        updateExchange(requestId, {
          status: 'error',
          errorMessage: `Serveur injoignable à ${SERVER_URL}. Vérifie que le backend tourne et que l'adresse dans src/constants/config.ts est la bonne.`,
        });
        return;
      }

      socket.emit(SOCKET_EVENTS.TRANSLATE, {
        requestId,
        audioBase64,
        audioFormat: formatFromUri(uri),
        sourceLanguage: direction.from,
        targetLanguage: direction.to,
      });
    } catch (error) {
      console.log('[record] arrêt impossible', error);
    }
  }, [recorder, sourceLanguage, targetLanguage, addExchange, updateExchange]);

  const toggleRecording = useCallback(
    async (side: Side, from: string, to: string) => {
      if (busyToggling.current) return;
      busyToggling.current = true;
      try {
        if (isRecording) await stopRecording();
        else await startRecording(side, from, to);
      } finally {
        setTimeout(() => {
          busyToggling.current = false;
        }, 300);
      }
    },
    [isRecording, startRecording, stopRecording]
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
      // En face-à-face, les moitiés colorées doivent aller jusqu'aux bords
      // physiques de l'écran : réserver les zones sécurisées y laisserait
      // des bandes de fond visibles en haut et en bas.
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
        {faceToFace && (
          <Pressable
            onPress={() => setFaceToFace(false)}
            hitSlop={10}
            style={styles.exitButton}
            accessibilityRole="button"
            accessibilityLabel="Quitter le mode face à face"
          >
            <Text style={styles.icon}>✕</Text>
          </Pressable>
        )}
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
              onToggle={() => toggleRecording('bottom', sourceLanguage, targetLanguage)}
            />
          </View>
        </>
      )}
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
    // Seule la traduction en cours est affichée : l'historique reste en
    // mémoire mais n'encombre plus l'écran, qui redevient un espace de
    // lecture plutôt qu'un journal.
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
