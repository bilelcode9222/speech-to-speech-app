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
 * Repère visuel de la parole : la moitié active reste pleinement lisible et se
 * borde d'un liseré rouge, tandis que l'autre s'estompe. Le contraste dit qui
 * parle sans qu'on ait à lire quoi que ce soit — utile quand le téléphone est
 * posé sur une table entre deux personnes.
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
  // Un chargement ne s'affiche que si un echange est reellement en cours :
  // sans cela, les deux moities tournent dans le vide au demarrage.
  const pending =
    exchange !== null && exchange.status !== 'done' && exchange.status !== 'error';

  // Qui a la parole : celui qui enregistre, ou à défaut celui qui vient de
  // parler pendant que la traduction se calcule.
  const activeSide: Side | null =
    recordingSide || (isBusy ? (spokeFromBottom ? 'bottom' : 'top') : null);

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
  const isDimmed = activeSide !== null && !isActive;

  // Transition douce plutôt qu'un basculement sec : l'oeil suit le
  // déplacement de l'attention d'un côté à l'autre.
  const dim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(dim, {
      toValue: isDimmed ? 0.32 : 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isDimmed, dim]);

  const content = (
    <>
      <View style={styles.panel}>
        <View style={styles.labelRow}>
          {isActive && <View style={styles.speakingDot} />}
          <Text style={[styles.label, isActive && styles.labelActive]}>
            {isActive ? 'Parle' : label}
          </Text>
        </View>

        {errored ? (
          <Text style={styles.error}>{errorMessage}</Text>
        ) : text ? (
          <Text style={styles.text} numberOfLines={6} adjustsFontSizeToFit>
            {text}
          </Text>
        ) : pending ? (
          <View style={styles.waiting}>
            <ActivityIndicator size="small" color={colors.textMuted} />
          </View>
        ) : null}
      </View>

      <RecordButton isRecording={isRecording} isBusy={isBusy} onToggle={onToggle} />
    </>
  );

  return (
    <View style={[styles.half, isActive && styles.halfActive]}>
      <Animated.View
        style={[
          styles.inner,
          rotated && styles.rotated,
          { opacity: dim },
        ]}
      >
        {content}
      </Animated.View>
    </View>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    container: { flex: 1 },
    half: {
      flex: 1,
      borderRadius: 14,
      marginHorizontal: spacing.sm,
      marginVertical: 4,
      borderWidth: 1.5,
      // Bordure invisible au repos : la place est réservée pour éviter
      // que la mise en page ne saute quand elle apparaît.
      borderColor: 'transparent',
    },
    halfActive: { borderColor: colors.accent },
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
      backgroundColor: colors.accent,
    },
    label: { ...type.eyebrow, color: colors.textMuted },
    labelActive: { color: colors.accent },
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
