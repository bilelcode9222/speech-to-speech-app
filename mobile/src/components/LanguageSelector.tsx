import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  canBeTarget,
  findLanguage,
  Language,
  SUPPORTED_LANGUAGES,
} from '../constants/languages';
import { useTheme } from '../theme/ThemeProvider';
import { Palette, radius, spacing, type } from '../theme/tokens';
import { useTranslation } from '../i18n/useTranslation';
import { getLanguageDisplayName } from '../i18n/languageDisplayNames';

interface Props {
  sourceCode: string;
  targetCode: string;
  onChangeSource: (code: string) => void;
  onChangeTarget: (code: string) => void;
  onSwap: () => void;
  disabled: boolean;
}

const AUTO_LANGUAGE: Language = {
  code: 'auto',
  label: 'Detect language',
  flag: '🌐',
  // Jamais utilisé : 'auto' est refusé en cible.
  tts: false,
};

export function LanguageSelector({
  sourceCode,
  targetCode,
  onChangeSource,
  onChangeTarget,
  onSwap,
  disabled,
}: Props) {
  const { t, locale } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [picking, setPicking] = useState<'source' | 'target' | null>(null);

  // L'API refuse les codes hors des 57 supportées, y compris en source.
  // Les autres langues restent joignables via 'auto', qui n'envoie aucun
  // code et laisse Whisper deviner.
  const sourceLanguages = useMemo(
    () => [AUTO_LANGUAGE, ...SUPPORTED_LANGUAGES],
    [],
  );

  const displayLabel = (language: Language) => {
    if (language.code === 'auto') {
      return getLanguageDisplayName('auto', locale);
    }

    const translated = getLanguageDisplayName(language.code, locale);
    return translated === language.code ? language.label : translated;
  };

  const source =
    sourceCode === 'auto' ? AUTO_LANGUAGE : findLanguage(sourceCode);
  const target = findLanguage(targetCode);

  const select = (code: string) => {
    if (picking === 'source') {
      onChangeSource(code);
    }

    if (picking === 'target' && code !== 'auto') {
      onChangeTarget(code);
    }

    setPicking(null);
  };

  // La cible n'expose que les langues dotées d'une voix : traduire vers
  // une langue qu'on ne sait pas prononcer n'a pas de sens ici.
  const list = picking === 'source' ? sourceLanguages : SUPPORTED_LANGUAGES;

  // Échanger source et cible n'a de sens que si la source peut devenir
  // une cible valide. 'auto' est géré séparément par le store.
  const canSwap = sourceCode === 'auto' || canBeTarget(sourceCode);

  return (
    <>
      <View style={styles.row}>
        <Pressable
          style={styles.chip}
          onPress={() => setPicking('source')}
          disabled={disabled}
        >
          <Text style={styles.chipLabel} numberOfLines={1}>
            {source.flag} {displayLabel(source)}
          </Text>
        </Pressable>

        <Pressable
          style={styles.swap}
          onPress={onSwap}
          disabled={disabled || !canSwap}
        >
          <Text style={[styles.swapIcon, !canSwap && styles.swapIconOff]}>
            ⇄
          </Text>
        </Pressable>

        <Pressable
          style={styles.chip}
          onPress={() => setPicking('target')}
          disabled={disabled}
        >
          <Text style={styles.chipLabel} numberOfLines={1}>
            {target.flag} {displayLabel(target)}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={picking !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setPicking(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPicking(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />

            <Text style={styles.sheetTitle}>
              {picking === 'source' ? t('spokenLanguage') : t('translateTo')}
            </Text>

            <FlatList
              data={list}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const active =
                  picking === 'source'
                    ? item.code === sourceCode
                    : item.code === targetCode;

                return (
                  <Pressable
                    style={styles.option}
                    onPress={() => select(item.code)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        active && styles.optionTextActive,
                      ]}
                    >
                      {item.flag} {displayLabel(item)}
                    </Text>

                    {active && <Text style={styles.optionCheck}>✓</Text>}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    chip: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: 'center',
    },
    chipLabel: { fontSize: 14, fontWeight: '500', color: colors.text },
    swap: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swapIcon: { color: colors.textMuted, fontSize: 16 },
    swapIconOff: { opacity: 0.25 },
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      maxHeight: '75%',
      backgroundColor: colors.background,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.xl,
      paddingTop: spacing.sm,
    },
    grabber: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderStrong,
      alignSelf: 'center',
      marginBottom: spacing.md,
    },
    sheetTitle: {
      ...type.eyebrow,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    option: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    optionText: { fontSize: 16, color: colors.textSecondary },
    optionTextActive: { color: colors.text, fontWeight: '500' },
    optionCheck: { color: colors.text, fontSize: 15 },
  });
}
