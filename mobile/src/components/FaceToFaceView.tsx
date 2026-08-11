import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { RecordButton } from './RecordButton';
import { findLanguage } from '../constants/languages';
import { useTheme } from '../theme/ThemeProvider';
import { Palette, spacing, type } from '../theme/tokens';
import { Exchange } from '../types';

interface Props {
  exchange: Exchange | null;
  sourceLanguage: string;
  targetLanguage: string;
  /** Direction en cours d'enregistrement, null si aucun */
  recordingSide: 'top' | 'bottom' | null;
  isBusy: boolean;
  onToggleTop: () => void;
  onToggleBottom: () => void;
}

/**
 * Mode face-à-face.
 *
 * L'écran est coupé en deux. La moitié haute est pivotée à 180° : elle est
 * lisible par la personne assise en face, chacun voyant sa propre langue
 * du bon côté. Le téléphone se pose à plat entre les deux.
 *
 * Chaque moitié a son bouton : celui du haut enregistre dans la langue
 * cible, celui du bas dans la langue source. La conversation va donc dans
 * les deux sens sans jamais reprendre le téléphone en main.
 */
export function FaceToFaceView({
  exchange,
  sourceLanguage,
  targetLanguage,
  recordingSide,
  isBusy,
  onToggleTop,
  onToggleBottom,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Chaque moitié affiche le texte dans SA langue, quel que soit le sens
  // dans lequel la dernière phrase a circulé.
  const spokeFromBottom = exchange?.sourceLanguage === sourceLanguage;

  const topText = exchange
    ? spokeFromBottom
      ? exchange.translatedText
      : exchange.originalText
    : null;

  const bottomText = exchange
    ? spokeFromBottom
      ? exchange.originalText
      : exchange.translatedText
    : null;

  const errored = exchange?.status === 'error';

  return (
    <View style={styles.container}>
      <View style={[styles.half, styles.halfTop]}>
        <View style={styles.rotated}>
          <Panel
            label={findLanguage(targetLanguage).label}
            text={topText}
            errored={errored}
            errorMessage={exchange?.errorMessage}
            colors={colors}
          />
          <RecordButton
            isRecording={recordingSide === 'top'}
            isBusy={isBusy || recordingSide === 'bottom'}
            onToggle={onToggleTop}
          />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.half}>
        <Panel
          label={findLanguage(sourceLanguage).label}
          text={bottomText}
          errored={errored}
          errorMessage={exchange?.errorMessage}
          colors={colors}
        />
        <RecordButton
          isRecording={recordingSide === 'bottom'}
          isBusy={isBusy || recordingSide === 'top'}
          onToggle={onToggleBottom}
        />
      </View>
    </View>
  );
}

function Panel({
  label,
  text,
  errored,
  errorMessage,
  colors,
}: {
  label: string;
  text: string | null;
  errored: boolean;
  errorMessage?: string;
  colors: Palette;
}) {
  const styles = createStyles(colors);

  return (
    <View style={styles.panel}>
      <Text style={styles.label}>{label}</Text>
      {errored ? (
        <Text style={styles.error}>{errorMessage}</Text>
      ) : text ? (
        <Text style={styles.text} numberOfLines={6} adjustsFontSizeToFit>
          {text}
        </Text>
      ) : (
        <View style={styles.waiting}>
          <ActivityIndicator size="small" color={colors.textMuted} />
        </View>
      )}
    </View>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    container: { flex: 1 },
    half: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
    },
    halfTop: { justifyContent: 'center' },
    // C'est cette rotation qui rend la moitié haute lisible d'en face
    rotated: {
      flex: 1,
      width: '100%',
      transform: [{ rotate: '180deg' }],
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.lg,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: spacing.md,
    },
    panel: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    label: { ...type.eyebrow, color: colors.textMuted },
    text: {
      fontSize: 30,
      lineHeight: 40,
      fontWeight: '400',
      letterSpacing: -0.4,
      color: colors.text,
      textAlign: 'center',
    },
    error: { ...type.body, color: colors.danger, textAlign: 'center' },
    waiting: { height: 40, justifyContent: 'center' },
  });
}
