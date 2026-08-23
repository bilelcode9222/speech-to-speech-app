import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConversationScreen } from './src/screens/ConversationScreen';
import { SplashScreen } from './src/components/SplashScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

function Root() {
  const { name } = useTheme();
  return (
    <>
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      <ConversationScreen />
    </>
  );
}

export default function App() {
  // L'écran d'ouverture reste monté par-dessus l'app jusqu'à la fin de
  // l'animation. L'app se charge en dessous pendant ce temps, donc rien
  // n'est perdu : l'attente devient l'animation.
  const [showSplash, setShowSplash] = useState(true);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
