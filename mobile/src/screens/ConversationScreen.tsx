import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguageSelector } from '../components/LanguageSelector';
import { RecordButton } from '../components/RecordButton';
import { TranscriptBubble } from '../components/TranscriptBubble';
import { MAX_RECORDING_MS, SERVER_URL } from '../constants/config';
import { useTranslationSocket } from '../hooks/useTranslationSocket';
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

export function ConversationScreen() {
  const { colors, name: themeName, toggle } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const recorder = useRecorder();
  const [isRecording, setIsRecording] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const autoStop = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyToggling = useRef(false);

  const {
    sourceLanguage,
    targetLanguage,
    exchanges,
    isConnected,
    setSourceLanguage,
    setTargetLanguage,
    swapLanguages,
    addExchange,
    updateExchange,
  } = useAppStore();

  useTranslationSocket();

  useEffect(() => {
    prepareAudioSession().then((granted) => {
      setMicReady(granted);
      if (!granted) {
        Alert.alert(
          'Micro refusé',
          "L'application ne peut pas fonctionner sans accès au micro. Autorise-le dans Réglages > Voix."
        );
      }
    });
  }, []);

  const isBusy = exchanges.some((e) => e.status !== 'done' && e.status !== 'error');

  const startRecording = useCallback(async () => {
    if (!micReady) return;
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      autoStop.current = setTimeout(() => stopRecording(), MAX_RECORDING_MS);
    } catch (error) {
      console.log('[record] démarrage impossible', error);
      Alert.alert('Micro indisponible', "L'enregistrement n'a pas pu démarrer.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micReady, recorder]);

  const stopRecording = useCallback(async () => {
    if (autoStop.current) {
      clearTimeout(autoStop.current);
      autoStop.current = null;
    }
    setIsRecording(false);

    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return;

      const requestId = `req-${Date.now()}`;

      addExchange({
        id: requestId,
        sourceLanguage,
        targetLanguage,
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
        sourceLanguage,
        targetLanguage,
      });
    } catch (error) {
      console.log('[record] arrêt impossible', error);
    }
  }, [recorder, sourceLanguage, targetLanguage, addExchange, updateExchange]);

  const toggleRecording = useCallback(async () => {
    if (busyToggling.current) return;
    busyToggling.current = true;
    try {
      if (isRecording) await stopRecording();
      else await startRecording();
    } finally {
      setTimeout(() => {
        busyToggling.current = false;
      }, 300);
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Voix</Text>
          <View style={styles.status}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isConnected ? colors.textMuted : colors.danger },
              ]}
            />
            <Text style={styles.statusText}>
              {isConnected ? 'Connecté' : 'Serveur hors ligne'}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={toggle}
          hitSlop={10}
          style={styles.themeButton}
          accessibilityRole="button"
          accessibilityLabel={
            themeName === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'
          }
        >
          <Text style={styles.themeIcon}>{themeName === 'dark' ? '☀' : '☾'}</Text>
        </Pressable>
      </View>

      <View style={styles.selector}>
        <LanguageSelector
          sourceCode={sourceLanguage}
          targetCode={targetLanguage}
          onChangeSource={setSourceLanguage}
          onChangeTarget={setTargetLanguage}
          onSwap={swapLanguages}
          disabled={isRecording || isBusy}
        />
      </View>

      {exchanges.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyBody}>
            Touche le bouton, dis une phrase, touche à nouveau.
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={exchanges}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TranscriptBubble exchange={item} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.footer}>
        <RecordButton isRecording={isRecording} isBusy={isBusy} onToggle={toggleRecording} />
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
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

    themeButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    themeIcon: { fontSize: 15, color: colors.textSecondary },

    selector: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },

    list: { flex: 1 },
    listContent: { paddingHorizontal: spacing.md },

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
