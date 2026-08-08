import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConversationScreen } from './src/screens/ConversationScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

/**
 * La barre d'état doit s'inverser avec le thème, donc elle vit à l'intérieur
 * du provider — d'où ce petit composant intermédiaire.
 */
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
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
