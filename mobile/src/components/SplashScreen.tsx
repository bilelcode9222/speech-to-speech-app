import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

interface Props {
  /** Appelé une fois l'animation terminée, pour révéler l'app */
  onFinish: () => void;
}

/**
 * Écran d'ouverture animé.
 *
 * Le splash natif d'iOS est une image figée : il ne peut pas être animé.
 * Ce composant prend le relais dès que React est monté, et joue l'apparition
 * du logo avant de s'effacer.
 *
 * L'animation suit la convention de la plupart des apps : le logo monte
 * légèrement en opacité et en échelle (il "arrive" vers l'utilisateur),
 * marque une courte pause, puis l'écran entier se dissout.
 */
export function SplashScreen({ onFinish }: Props) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Apparition du logo : fondu + léger agrandissement, en parallèle
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 900,
          // easing légèrement élastique : donne l'impression que le logo
          // se pose plutôt qu'il ne s'arrête net
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]),
      // 2. Pause : laisse le logo respirer avant de disparaître
      Animated.delay(450),
      // 3. Disparition de tout l'écran, révélant l'app en dessous
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 450,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onFinish();
    });
  }, [logoOpacity, logoScale, screenOpacity, onFinish]);

  return (
    <Animated.View
      style={[styles.container, { opacity: screenOpacity }]}
      pointerEvents="none"
    >
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
        }}
      >
        <Image
          source={require('../../assets/logo-header-noir.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    // au-dessus de tout le reste
    zIndex: 999,
  },
  logo: {
    width: 110,
    height: 110,
  },
});
