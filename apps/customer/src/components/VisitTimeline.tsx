import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../theme/tokens';

export type TimelineVisit = {
  visit_type: string;
  status: string;
  scheduled_start_at?: string;
};

function visitLabel(visitType: string, index: number): string {
  if (visitType === 'INSPECTION') return 'Visit 1 · Inspection';
  if (visitType === 'REPAIR') return 'Visit 2 · Repair';
  return `Visit ${index + 1}`;
}

function statusLabel(status: string): string {
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'SCHEDULED' || status === 'ASSIGNED') return 'Confirmed';
  if (status === 'EN_ROUTE') return 'En route';
  if (status === 'ON_SITE' || status === 'SERVICE_IN_PROGRESS') return 'In progress';
  if (status === 'QC_PENDING') return 'Quality check';
          return status.replace(/_/g, ' ');
}

export function VisitTimeline({ visits }: { visits: TimelineVisit[] }) {
  if (!visits.length) return null;
  return (
    <View style={styles.wrap} accessibilityLabel="Visit timeline">
      {visits.map((visit, index) => {
        const done = visit.status === 'COMPLETED';
        return (
          <View key={`${visit.visit_type}-${index}`} style={styles.row}>
            <Ionicons
              name={done ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={done ? colors.success : colors.brandStrong}
            />
            <View style={styles.copy}>
              <Text style={styles.title}>{visitLabel(visit.visit_type, index)}</Text>
              <Text style={styles.status}>{statusLabel(visit.status)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 10,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.card,
    padding: 12,
  },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  copy: { flex: 1 },
  title: { ...type.bodyMedium, color: colors.textStrong },
  status: { ...type.caption, color: colors.textMuted },
});
