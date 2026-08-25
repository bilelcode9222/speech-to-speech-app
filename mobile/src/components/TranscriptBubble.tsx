import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Palette, radius, spacing, type } from '../theme/tokens';
import { Exchange } from '../types';
import { findLanguage } from '../constants/languages';
import { useTranslation } from '../i18n/useTranslation';

/**
 * Un échange = ce que tu as dit, puis sa traduction.
 *
 * La hiérarchie remplace la couleur : l'original reste petit et discret,
 * la traduction occupe l'espace et le contraste. Un filet vertical fin
 * relie les deux, comme un bloc cité dans Notion.
 */
export function TranscriptBubble({ exchange }: { exchange: Exchange }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const source = findLanguage(exchange.sourceLanguage);
  const target = findLanguage(exchange.targetLanguage);

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
          <Text style={styles.label}>{source.label}</Text>
          {exchange.originalText ? (
            <Text style={styles.original}>{exchange.originalText}</Text>
          ) : (
            <Pending label="Transcription" colors={colors} />
          )}
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>{target.label}</Text>
          {exchange.translatedText ? (
            <Text style={styles.translated}>{exchange.translatedText}</Text>
          ) : (
            <Pending label="Traduction" colors={colors} />
          )}
        </View>

        {exchange.timings && (
          <Text style={styles.timing}>
            {(exchange.timings.total / 1000).toFixed(1)} s · transcription{' '}
            {exchange.timings.stt} ms · traduction {exchange.timings.translation} ms · voix{' '}
            {exchange.timings.tts} ms
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
