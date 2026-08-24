
import React, { useEffect, useMemo, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { RecordButton } from './RecordButton';
import { findLanguage } from '../constants/languages';
import { useTheme } from '../theme/ThemeProvider';
import { Palette, type } from '../theme/tokens';
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
  onSwapLanguages: () => void;
  onActiveSideChange?: (side: Side) => void;
  onExit: () => void;
}

/**
 * Mode face-à-face, plein écran.
 *
 * Deux moitiés strictement égales, la haute pivotée à 180° pour la personne
 * en face. Les noms de langues sont posés sur la ligne de séparation, avec
 * le bouton d'échange au centre : chacun lit le sien du bon côté, et la
 * frontière devient un repère plutôt qu'une simple limite.
 *
 * La moitié de celui qui a la parole inverse ses couleurs — fond de la
 * teinte du texte, texte de la teinte du fond. L'inversion PERSISTE après
 * la traduction : elle ne bascule que quand l'autre prend la parole.
 */
export function FaceToFaceView({
  exchange,
  sourceLanguage,
  targetLanguage,
  recordingSide,
  isBusy,
  onToggleTop,
  onToggleBottom,
  onSwapLanguages,
  onExit,
  onActiveSideChange,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles(colors, width, height, insets.top),
    [colors, width, height]
  );

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
  const pending =
    exchange !== null && exchange.status !== 'done' && exchange.status !== 'error';

  // Le côté actif ne revient jamais au neutre : il reste sur la dernière
  // personne à avoir parlé, jusqu'à ce que l'autre appuie sur son bouton.
  const lastSide = useRef<Side>('bottom');
  if (recordingSide) {
    lastSide.current = recordingSide;
  } else if (exchange) {
    lastSide.current = spokeFromBottom ? 'bottom' : 'top';
  }
  const activeSide: Side = recordingSide ?? lastSide.current;

  useEffect(() => {
    onActiveSideChange?.(activeSide);
  }, [activeSide, onActiveSideChange]);

  const topActive = activeSide === 'top';
  const bottomActive = activeSide === 'bottom';

  return (
    <View style={styles.container}>
      <Half
        side="top"
        rotated
        text={topText}
        errored={errored}
        errorMessage={exchange?.errorMessage}
        isActive={topActive}
        isRecording={recordingSide === 'top'}
        isBusy={isBusy || recordingSide === 'bottom'}
        pending={pending}
        onToggle={onToggleTop}
        colors={colors}
        styles={styles}
      />

      {/* Bandeau des langues, posé sur la frontière entre les deux moitiés */}
      <View style={styles.languageBar}>
        <Text style={[styles.languageLabel, styles.languageLabelTop]}>
          {findLanguage(targetLanguage).label}
        </Text>
        <Pressable onPress={onSwapLanguages} hitSlop={12} style={styles.swapButton}>
          <Text style={styles.swapIcon}>⇅</Text>
        </Pressable>
        <Text style={styles.languageLabel}>
          {findLanguage(sourceLanguage).label}
        </Text>
      </View>

      <Half
        side="bottom"
        text={bottomText}
        errored={errored}
        errorMessage={exchange?.errorMessage}
        isActive={bottomActive}
        isRecording={recordingSide === 'bottom'}
        isBusy={isBusy || recordingSide === 'top'}
        pending={pending}
        onToggle={onToggleBottom}
        colors={colors}
        styles={styles}
      />

      <Pressable
        onPress={onExit}
        hitSlop={14}
        style={styles.exitButton}
        accessibilityRole="button"
        accessibilityLabel="Quitter le mode face à face"
      >
        <Text style={styles.exitIcon}>✕</Text>
      </Pressable>
    </View>
  );
}

interface HalfProps {
  side: Side;
  rotated?: boolean;
  text: string | null;
  errored: boolean;
  errorMessage?: string;
  isActive: boolean;
  isRecording: boolean;
  isBusy: boolean;
  pending: boolean;
  onToggle: () => void;
  colors: Palette;
  styles: ReturnType<typeof createStyles>;
}

function Half({
  rotated,
  text,
  errored,
  errorMessage,
  isActive,
  isRecording,
  isBusy,
  pending,
  onToggle,
  colors,
  styles,
}: HalfProps) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(isActive ? 1 : 0)).current;

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

  const fg = isActive ? colors.background : colors.text;
  const fgMuted = isActive ? colors.background : colors.textMuted;

  return (
    <Animated.View style={[styles.half, { backgroundColor: bg }]}>
      <View style={[styles.inner, rotated && styles.rotated, rotated && { paddingBottom: insets.top }]}>
        <View style={styles.textZone}>
          {errored ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {errorMessage}
            </Text>
          ) : text ? (
            <Text
              style={[styles.text, { color: fg }]}
              numberOfLines={5}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {text}
            </Text>
          ) : pending ? (
            <ActivityIndicator size="small" color={fgMuted} />
          ) : null}
        </View>

        <View style={styles.buttonZone}>
          <RecordButton isRecording={isRecording} isBusy={isBusy} onToggle={onToggle} />
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Dimensions dérivées de la taille de l'écran plutôt que fixées en dur :
 * une valeur juste sur iPhone est disproportionnée sur iPad. Les bornes
 * min/max évitent les extrêmes aux deux bouts.
 */
function createStyles(colors: Palette, width: number, height: number, insetsTop = 0) {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const textSize = clamp(width * 0.075, 24, 64);
  const buttonZone = clamp(height * 0.21, 150, 340);
  const pad = clamp(width * 0.05, 14, 56);
  const barHeight = clamp(height * 0.05, 38, 72);

  return StyleSheet.create({
    container: { flex: 1 },
    half: {
      // flexBasis à 0 force un partage strictement égal : sans lui, la
      // moitié contenant le plus de texte s'approprie plus de hauteur.
      flex: 1,
      flexBasis: 0,
      overflow: 'hidden',
    },
    inner: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: pad,
    },
    rotated: { transform: [{ rotate: '180deg' }] },
    textZone: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    buttonZone: {
      height: buttonZone,
      justifyContent: 'center',
      alignItems: 'center',
    },
    text: {
      fontSize: textSize,
      lineHeight: textSize * 1.33,
      fontWeight: '400',
      letterSpacing: -0.4,
      textAlign: 'center',
    },
    errorText: { ...type.body, textAlign: 'center' },

    languageBar: {
      // Superposé à la frontière plutôt qu'inséré entre les deux moitiés :
      // inséré, il décalerait la ligne de séparation et romprait le 50/50.
      position: 'absolute',
      top: '50%',
      left: 0,
      right: 0,
      marginTop: -barHeight / 2,
      zIndex: 8,
      height: barHeight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: pad,
      backgroundColor: colors.surface,
    },
    languageLabel: {
      ...type.eyebrow,
      color: colors.textSecondary,
      flex: 1,
    },
    languageLabelTop: {
      // Pivoté pour être lisible par la personne d'en face
      transform: [{ rotate: '180deg' }],
      textAlign: 'right',
    },
    swapButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swapIcon: { fontSize: 16, color: colors.textMuted },

    exitButton: {
      position: 'absolute',
      top: insetsTop + 8,
      right: 14,
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      // Fond neutre translucide : reste visible que la moitié sous le
      // bouton soit claire ou sombre.
      backgroundColor: 'rgba(128,128,128,0.3)',
      zIndex: 10,
    },
    exitIcon: { fontSize: 15, color: '#FFFFFF' },
  });
}
