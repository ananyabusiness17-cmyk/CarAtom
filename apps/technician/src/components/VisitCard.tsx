import type { TechnicianVisitSummary } from '@caratom/contracts';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, type } from '../theme/tokens';

export function VisitCard({
  visit,
  emphasized,
  pendingSync,
  onPress,
}: {
  visit: TechnicianVisitSummary;
  emphasized?: boolean;
  pendingSync?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${visit.scheduled_label}. ${visit.job_card_ref}. ${visit.vehicle_label}. ${visit.address_short}`}
      style={({ pressed }) => [styles.card, emphasized ? styles.emphasis : null, pressed ? styles.pressed : null]}
    >
      <View style={styles.row}>
        <Text style={styles.title}>{visit.scheduled_label}</Text>
        {visit.distance_km != null ? (
          <View style={styles.chip}>
            <Text style={styles.chipText}>{visit.distance_km} km</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.job}>
        {visit.job_card_ref} · {visit.vehicle_label}
      </Text>
      <Text style={styles.address}>{visit.address_short}</Text>
      {pendingSync ? <Text style={styles.pending}>Pending sync</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emphasis: {
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
  },
  pressed: { opacity: 0.92 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { ...type.bodyMedium, color: colors.textStrong, flex: 1 },
  chip: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 24,
    justifyContent: 'center',
  },
  chipText: { ...type.caption, color: colors.brandStrong },
  job: { ...type.body, color: colors.text },
  address: { ...type.caption, color: colors.textMuted },
  pending: { ...type.caption, color: colors.warning, marginTop: 4 },
});
