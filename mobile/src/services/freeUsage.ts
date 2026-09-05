import AsyncStorage from '@react-native-async-storage/async-storage';

const FREE_TRANSLATION_COUNT_KEY = '@nevi/free_translation_count';
export const FREE_TRANSLATION_LIMIT = 3;

export async function getFreeTranslationCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(FREE_TRANSLATION_COUNT_KEY);
    const value = Number(raw ?? '0');

    if (!Number.isFinite(value) || value < 0) {
      return 0;
    }

    return Math.min(Math.floor(value), FREE_TRANSLATION_LIMIT);
  } catch (error) {
    console.log('[freeUsage] lecture impossible', error);
    return 0;
  }
}

export async function incrementFreeTranslationCount(): Promise<number> {
  const current = await getFreeTranslationCount();
  const next = Math.min(current + 1, FREE_TRANSLATION_LIMIT);

  try {
    await AsyncStorage.setItem(FREE_TRANSLATION_COUNT_KEY, String(next));
  } catch (error) {
    console.log('[freeUsage] écriture impossible', error);
  }

  return next;
}

export async function resetFreeTranslationCount(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FREE_TRANSLATION_COUNT_KEY);
  } catch (error) {
    console.log('[freeUsage] réinitialisation impossible', error);
  }
}
