import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { RecordButton } from './RecordButton';
import { findLanguage } from '../constants/languages';
import { useTheme } from '../theme/ThemeProvider';
import { Palette, spacing, type } from '../theme/tokens';
import { Exchange } from '../types';

type Side = 'top' | 'bottom';

interface Props {
  exchange: Exchange | null;
  sourceLanguage: string;
  targetLanguage: string;
  recordingSide: Side | null;
  isBusy: boolean;
  onToggleTop: () => void;
  onToggleBottom: () => void;
}

/**
 * Mode face-à-face.
 *
 * L'écran est coupé en deux, la moitié haute pivotée à 180° pour la personne
 * assise en face.
 *
 * Repère visuel de la parole : la moitié active INVERSE ses couleurs — son
 * fond prend la teinte du texte, son texte celle du fond. Le contraste
 * bascule franchement d'un côté à l'autre, ce qui se lit d'un coup d'oeil
 * quand le téléphone est posé sur une table entre deux personnes.
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

  // Un chargement ne s'affiche que si un échange est réellement en cours :
  // sans cela, les deux moitiés tournent dans le vide au démarrage.
  const pending =
    exchange !== null && exchange.status !== 'done' && exchange.status !== 'error';

  // Qui a la parole : celui qui enregistre, ou à défaut celui qui vient de
  // parler pendant que la traduction se calcule.
  const activeSide: Side | null =
    recordingSide || (isBusy ? (spokeFromBottom ? "bottom" : "top") : "bottom");

  return (
    <View style={styles.container}>
      <Half
        side="top"
        rotated
        label={findLanguage(targetLanguage).label}
        text={topText}
        errored={errored}
        errorMessage={exchange?.errorMessage}
        activeSide={activeSide}
        isRecording={recordingSide === 'top'}
        isBusy={isBusy || recordingSide === 'bottom'}
        pending={pending}
        onToggle={onToggleTop}
        colors={colors}
      />

      <View style={styles.divider} />

      <Half
        side="bottom"
        label={findLanguage(sourceLanguage).label}
        text={bottomText}
        errored={errored}
        errorMessage={exchange?.errorMessage}
        activeSide={activeSide}
        isRecording={recordingSide === 'bottom'}
        isBusy={isBusy || recordingSide === 'top'}
        pending={pending}
        onToggle={onToggleBottom}
        colors={colors}
      />
    </View>
  );
}

interface HalfProps {
  side: Side;
  rotated?: boolean;
  label: string;
  text: string | null;
  errored: boolean;
  errorMessage?: string;
  activeSide: Side | null;
  isRecording: boolean;
  isBusy: boolean;
  pending: boolean;
  onToggle: () => void;
  colors: Palette;
}

function Half({
  side,
  rotated,
  label,
  text,
  errored,
  errorMessage,
  activeSide,
  isRecording,
  isBusy,
  pending,
  onToggle,
  colors,
}: HalfProps) {
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isActive = activeSide === side;

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: isActive ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      // L'interpolation de couleur n'est pas supportée par le driver natif
      useNativeDriver: false,
    }).start();
  }, [isActive, progress]);

  const bg = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.background, colors.text],
  });

  // Texte et pictogrammes s'inversent avec le fond pour rester lisibles
  const fg = isActive ? colors.background : colors.text;
  const fgMuted = isActive ? colors.background : colors.textMuted;

  const content = (
    <>
      <View style={styles.panel}>
        <View style={styles.labelRow}>
          {isActive && <View style={[styles.speakingDot, { backgroundColor: fg }]} />}
          <Text style={[styles.label, { color: fgMuted }]}>
            {isActive ? 'Parle' : label}
          </Text>
        </View>

        {errored ? (
          <Text style={styles.error}>{errorMessage}</Text>
        ) : text ? (
          <Text
            style={[styles.text, { color: fg }]}
            numberOfLines={6}
            adjustsFontSizeToFit
          >
            {text}
          </Text>
        ) : pending ? (
          <View style={styles.waiting}>
            <ActivityIndicator size="small" color={fgMuted} />
          </View>
        ) : null}
      </View>

      <RecordButton isRecording={isRecording} isBusy={isBusy} onToggle={onToggle} />
    </>
  );

  return (
    <Animated.View style={[styles.half, { backgroundColor: bg }]}>
      <View style={[styles.inner, rotated && styles.rotated]}>{content}</View>
    </Animated.View>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    container: { flex: 1 },
    half: {
      flex: 1,



      overflow: 'hidden',
    },
    inner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.sm,
    },
    rotated: { transform: [{ rotate: '180deg' }] },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: spacing.lg,
    },
    panel: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    speakingDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    label: { ...type.eyebrow },
    text: {
      fontSize: 30,
      lineHeight: 40,
      fontWeight: '400',
      letterSpacing: -0.4,
      textAlign: 'center',
    },
    error: { ...type.body, color: colors.danger, textAlign: 'center' },
    waiting: { height: 40, justifyContent: 'center' },
  });
}
