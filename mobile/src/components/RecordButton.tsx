import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Palette, radius, type } from '../theme/tokens';

interface Props {
  isRecording: boolean;
  isBusy: boolean;
  onToggle: () => void;
}

/**
 * Bouton à bascule. Une touche démarre, une touche arrête.
 *
 * Au repos : un cercle sobre, bordure fine.
 * En enregistrement : le disque devient un carré rouge — la convention
 * "stop" qu'on retrouve sur tous les dictaphones.
 */
export function RecordButton({ isRecording, isBusy, onToggle }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const pulse = useRef(new Animated.Value(0)).current;
  const morph = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(morph, {
      toValue: isRecording ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    if (!isRecording) {
      pulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isRecording, pulse, morph]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.28] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  const coreSize = morph.interpolate({ inputRange: [0, 1], outputRange: [56, 28] });
  const coreRadius = morph.interpolate({ inputRange: [0, 1], outputRange: [28, 5] });

  const label = isBusy
    ? 'Traduction en cours'
    : isRecording
    ? 'Touche pour traduire'
    : 'Touche et parle';

  return (
    <View style={styles.wrapper}>
      <View style={styles.stack}>
        {isRecording && (
          <Animated.View
            style={[styles.ring, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
          />
        )}
        <Pressable
          onPress={isBusy ? undefined : onToggle}
          disabled={isBusy}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={isRecording ? 'Arrêter et traduire' : 'Démarrer l\'enregistrement'}
          style={({ pressed }) => [
            styles.button,
            isBusy && styles.buttonBusy,
            pressed && !isBusy && styles.buttonPressed,
          ]}
        >
          <Animated.View
            style={[
              styles.core,
              { width: coreSize, height: coreSize, borderRadius: coreRadius },
            ]}
          />
        </Pressable>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const SIZE = 72;

function createStyles(colors: Palette) {
  return StyleSheet.create({
    wrapper: { alignItems: 'center', gap: 12 },
    stack: {
      width: SIZE * 1.6,
      height: SIZE * 1.6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ring: {
      position: 'absolute',
      width: SIZE,
      height: SIZE,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: colors.accent,
    },
    button: {
      width: SIZE,
      height: SIZE,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    buttonBusy: { opacity: 0.4 },
    buttonPressed: { transform: [{ scale: 0.95 }] },
    core: { backgroundColor: colors.accent },
    label: { ...type.caption, color: colors.textMuted },
  });
}
