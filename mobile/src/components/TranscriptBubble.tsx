import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Palette, radius, spacing, type } from '../theme/tokens';
import { Exchange } from '../types';
import { findLanguage } from '../constants/languages';
import { useTranslation } from '../i18n/useTranslation';
import { getLanguageDisplayName } from '../i18n/languageDisplayNames';

export function TranscriptBubble({ exchange }: { exchange: Exchange }) {
  const { t, locale } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const displayLanguage = (code: string): string => {
    if (code === 'auto') return getLanguageDisplayName('auto', locale);
    const fallback = findLanguage(code).label;
    const translated = getLanguageDisplayName(code, locale);
    return translated === code ? fallback : translated;
  };

  if (exchange.status === 'error') {
    return (
      <View style={[styles.card, styles.cardError]}>
        <Text style={styles.errorTitle}>{t('translationFailed')}</Text>
        <Text style={styles.errorBody}>{exchange.errorMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.rule} />

      <View style={styles.content}>
        <View style={styles.block}>
          <Text style={styles.label}>{displayLanguage(exchange.sourceLanguage)}</Text>
          {exchange.originalText ? (
            <Text style={styles.original}>{exchange.originalText}</Text>
          ) : (
            <Pending label={t('translating')} colors={colors} />
          )}
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>{displayLanguage(exchange.targetLanguage)}</Text>
          {exchange.translatedText ? (
            <Text style={styles.translated}>{exchange.translatedText}</Text>
          ) : (
            <Pending label={t('translating')} colors={colors} />
          )}
        </View>

        {exchange.timings && (
          <Text style={styles.timing}>
            {(exchange.timings.total / 1000).toFixed(1)} s · STT {exchange.timings.stt} ms · AI{' '}
            {exchange.timings.translation} ms · TTS {exchange.timings.tts} ms
          </Text>
        )}
      </View>
    </View>
  );
}

function Pending({ label, colors }: { label: string; colors: Palette }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: 2 }}>
      <ActivityIndicator size="small" color={colors.textMuted} />
      <Text style={{ ...type.caption, color: colors.textMuted }}>{label}…</Text>
    </View>
  );
}

function createStyles(colors: Palette) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingRight: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    cardError: {
      flexDirection: 'column',
      gap: 6,
      backgroundColor: colors.accentSoft,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 0,
      marginBottom: spacing.sm,
    },
    rule: { width: 2, borderRadius: 1, backgroundColor: colors.border },
    content: { flex: 1, gap: spacing.md },
    block: { gap: 4 },
    label: { ...type.eyebrow, color: colors.textMuted },
    original: { ...type.body, color: colors.textSecondary },
    translated: { ...type.translation, color: colors.text },
    timing: { fontSize: 11, color: colors.textMuted },
    errorTitle: { ...type.eyebrow, color: colors.danger },
    errorBody: { ...type.body, color: colors.text },
  });
}
