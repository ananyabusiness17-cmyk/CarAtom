import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../theme/tokens';

const SEVERITY_ICON: Record<string, { name: keyof typeof Ionicons.glyphMap; label: string }> = {
  HIGH: { name: 'alert-circle', label: 'High' },
  MEDIUM: { name: 'alert', label: 'Medium' },
  LOW: { name: 'information-circle-outline', label: 'Low' },
};

export function FindingCard({
  title,
  severity,
  body,
  recommendation,
}: {
  title: string;
  severity: string;
  body: string;
  recommendation?: string | null;
}) {
  const key = severity.toUpperCase();
  const meta = SEVERITY_ICON[key] ?? SEVERITY_ICON.MEDIUM;
  return (
    <View style={styles.card} accessibilityLabel={`${title}, severity ${meta.label}`}>
      <View style={styles.header}>
        <Ionicons name={meta.name} size={20} color={colors.textStrong} />
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.severity}>{meta.label}</Text>
        </View>
      </View>
      <Text style={styles.body}>{body}</Text>
      {recommendation ? <Text style={styles.rec}>{recommendation}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  copy: { flex: 1, gap: 2 },
  title: { ...type.bodyMedium, color: colors.textStrong },
  severity: { ...type.caption, color: colors.textMuted },
  body: { ...type.body, color: colors.text },
  rec: { ...type.caption, color: colors.brandStrong },
});
