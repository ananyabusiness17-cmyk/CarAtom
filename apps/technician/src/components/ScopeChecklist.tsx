import type { TechnicianScopeLine } from '@caratom/contracts';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../theme/tokens';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Queued',
  IN_PROGRESS: 'Now',
  DONE: 'Done',
  NOT_APPLICABLE: 'N/A',
};

function nextStatus(status: string): TechnicianScopeLine['status'] {
  if (status === 'PENDING') return 'IN_PROGRESS';
  if (status === 'IN_PROGRESS') return 'DONE';
  if (status === 'DONE') return 'PENDING';
  return 'PENDING';
}

export function ScopeChecklist({
  lines,
  interactive,
  mode = 'progress',
  onCycle,
}: {
  lines: TechnicianScopeLine[];
  interactive?: boolean;
  mode?: 'progress' | 'scope';
  onCycle?: (line: TechnicianScopeLine) => void;
}) {
  return (
    <View style={styles.list}>
      {lines.map((line) => {
        const chip =
          mode === 'scope'
            ? line.kind === 'SERVICE'
              ? 'In scope'
              : 'Approved'
            : (STATUS_LABEL[line.status] ?? line.status);
        const body = (
          <View style={styles.row}>
            <Text style={styles.label}>{line.label}</Text>
            <View
              style={[
                styles.chip,
                mode === 'scope' || line.status === 'DONE'
                  ? styles.ok
                  : line.status === 'IN_PROGRESS'
                    ? styles.now
                    : styles.queued,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  mode === 'scope' || line.status === 'DONE'
                    ? styles.okText
                    : line.status === 'IN_PROGRESS'
                      ? styles.nowText
                      : null,
                ]}
              >
                {chip}
              </Text>
            </View>
          </View>
        );
        if (!interactive) {
          return (
            <View key={line.id} style={styles.item}>
              {body}
            </View>
          );
        }
        return (
          <Pressable
            key={line.id}
            accessibilityRole="button"
            accessibilityLabel={`${line.label}, ${chip}`}
            onPress={() => onCycle?.({ ...line, status: nextStatus(line.status) })}
            style={styles.item}
          >
            {body}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    padding: 12,
    minHeight: 44,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  label: { ...type.body, color: colors.text, flex: 1 },
  chip: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  queued: { backgroundColor: colors.surfaceSubtle },
  now: { backgroundColor: colors.brandSoft },
  ok: { backgroundColor: colors.successSoft },
  chipText: { ...type.caption, color: colors.textMuted },
  nowText: { color: colors.brandStrong },
  okText: { color: colors.success },
});
