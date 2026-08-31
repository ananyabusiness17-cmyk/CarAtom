import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { OneManJob } from '@caratom/contracts';

import { colors, radius, type } from '../../theme/tokens';

function formatPrice(amountMinor: number): string {
  return `₹${Math.round(amountMinor / 100)}`;
}

const JOB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'bulb-headlight': 'bulb',
  'sensor-obd': 'hardware-chip',
  'wiper-blades': 'rainy',
  'battery-check': 'battery-half',
  'interior-light': 'moon',
  'panel-clip-fit': 'apps',
};

const JOB_TONE = [
  { bg: colors.brandSoft, fg: colors.brandStrong },
  { bg: colors.successSoft, fg: colors.success },
  { bg: colors.warningSoft, fg: colors.warning },
  { bg: colors.dangerSoft, fg: colors.danger },
] as const;

export function OneManGrid({
  jobs,
  onSelect,
}: {
  jobs: OneManJob[];
  onSelect: (slug: string) => void;
}) {
  return (
    <View style={styles.grid}>
      {jobs.map((job, index) => (
        <Pressable
          key={job.slug}
          accessibilityRole="button"
          accessibilityLabel={`${job.name}, ${formatPrice(job.display_price.amount_minor)}, ${job.duration_minutes ?? 0} minutes`}
          onPress={() => onSelect(job.slug)}
          style={styles.card}
        >
          <View style={[styles.glyph, { backgroundColor: JOB_TONE[index % JOB_TONE.length].bg }]}>
            <Ionicons
              name={JOB_ICONS[job.slug] ?? 'flash'}
              size={24}
              color={JOB_TONE[index % JOB_TONE.length].fg}
            />
          </View>
          <Text style={styles.name}>{job.name}</Text>
          <Text style={styles.meta}>{job.duration_minutes ? `${job.duration_minutes} min` : ''}</Text>
          <Text style={styles.price}>{formatPrice(job.display_price.amount_minor)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    flexBasis: '47%',
    maxWidth: '48%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.tile,
    padding: 14,
    minHeight: 118,
    borderWidth: 1,
    borderColor: colors.border,
  },
  glyph: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  name: { ...type.bodyMedium, color: colors.textStrong, fontSize: 13, lineHeight: 18 },
  meta: { ...type.caption, color: colors.textMuted, marginTop: 4 },
  price: { ...type.price, color: colors.textStrong, marginTop: 8, fontSize: 16, lineHeight: 20 },
});
