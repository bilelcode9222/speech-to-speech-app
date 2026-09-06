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
import { getLanguageDisplayName } from '../i18n/languageDisplayNames';
import { useTheme } from '../theme/ThemeProvider';
import { Palette, type } from '../theme/tokens';
import { Exchange } from '../types';
import { useTranslation } from '../i18n/useTranslation';

type Side = 'top' | 'bottom';

interface Props {
  exchange: Exchange | null;
  topLanguageCode: string;
  bottomLanguageCode: string;
  recordingSide: Side | null;
  isBusy: boolean;
  onToggleTop: () => void;
  onToggleBottom: () => void;
  onSwapLanguages: () => void;
  onActiveSideChange?: (side: Side) => void;
  onExit: () => void;
}

export function FaceToFaceView({
  exchange,
  topLanguageCode,
  bottomLanguageCode,
  recordingSide,
  isBusy,
  onToggleTop,
  onToggleBottom,
  onSwapLanguages,
  onExit,
  onActiveSideChange,
}: Props) {
  const { t, locale } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles(colors, width, height, insets.top),
    [colors, width, height, insets.top],
  );

  const lastSide = useRef<Side>('bottom');
  if (recordingSide) lastSide.current = recordingSide;

  const spokeFromBottom = lastSide.current === 'bottom';
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
  const activeSide: Side = recordingSide ?? lastSide.current;

  useEffect(() => {
    onActiveSideChange?.(activeSide);
  }, [activeSide, onActiveSideChange]);

  const languageLabel = (code: string) => {
    if (code === 'auto') {
      return `🌐 ${getLanguageDisplayName('auto', locale)}`;
    }
    const language = findLanguage(code);
    const translated = getLanguageDisplayName(code, locale);
    const label = translated === code ? language.label : translated;
    return `${language.flag} ${label}`;
  };

  return (
    <View style={styles.container}>
      <Half
        rotated
        text={topText}
        errored={errored}
        errorMessage={exchange?.errorMessage}
        isActive={activeSide === 'top'}
        isRecording={recordingSide === 'top'}
        isBusy={isBusy || recordingSide === 'bottom'}
        pending={pending}
        onToggle={onToggleTop}
        colors={colors}
        styles={styles}
      />

      <View style={styles.languageBar}>
        <Text style={[styles.languageLabel, styles.languageLabelTop]} numberOfLines={1}>
          {languageLabel(topLanguageCode)}
        </Text>
        <Pressable
          onPress={onSwapLanguages}
          disabled={isBusy || recordingSide !== null}
          hitSlop={12}
          style={styles.swapButton}
          accessibilityRole="button"
          accessibilityLabel={t('swapLanguages')}
        >
          <Text style={styles.swapIcon}>⇅</Text>
        </Pressable>
        <Text style={styles.languageLabel} numberOfLines={1}>
          {languageLabel(bottomLanguageCode)}
        </Text>
      </View>

      <Half
        text={bottomText}
        errored={errored}
        errorMessage={exchange?.errorMessage}
        isActive={activeSide === 'bottom'}
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
        accessibilityLabel={t('faceToFaceExit')}
      >
        <Text style={styles.exitIcon}>✕</Text>
      </Pressable>
    </View>
  );
}

interface HalfProps {
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
      <View
        style={[
          styles.inner,
          rotated && styles.rotated,
          { paddingBottom: rotated ? insets.top : insets.bottom },
        ]}
      >
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

function createStyles(colors: Palette, width: number, height: number, insetsTop = 0) {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const textSize = clamp(width * 0.075, 24, 64);
  const buttonZone = clamp(height * 0.21, 150, 340);
  const pad = clamp(width * 0.05, 14, 56);
  const barHeight = clamp(height * 0.05, 38, 72);

  return StyleSheet.create({
    container: { flex: 1 },
    half: { flex: 1, flexBasis: 0, overflow: 'hidden' },
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
      transform: [{ rotate: '180deg' }],
      textAlign: 'right',
    },
    swapButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swapIcon: { fontSize: 16, color: colors.textMuted },
    exitButton: {
      position: 'absolute',
      top: insetsTop + 8,
      right: 14,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(128,128,128,0.3)',
      zIndex: 10,
    },
    exitIcon: { fontSize: 17, color: '#FFFFFF' },
  });
}
