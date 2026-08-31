import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { InlineBanner } from '../../../../src/components/InlineBanner';
import { OfflineBanner } from '../../../../src/components/OfflineBanner';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { QCChecklist, type QcRow } from '../../../../src/components/QCChecklist';
import { VisitScreen } from '../../../../src/components/VisitScreen';
import { useVisitMutations } from '../../../../src/hooks/useVisitMutations';
import { colors } from '../../../../src/theme/tokens';

const DEFAULT_ITEMS: QcRow[] = [
  { code: 'ac_vent', label: 'AC vent temp OK', passed: true },
  { code: 'no_leak', label: 'No leak at fittings', passed: true },
  { code: 'dtc', label: 'Error codes clear', passed: true },
];

export default function QcScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mutations = useVisitMutations(id ?? '');
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [rework, setRework] = useState(false);
  const [odometer, setOdometer] = useState('');
  const allPass = items.every((item) => item.passed);

  if (!id) return null;

  async function complete() {
    const km = odometer.trim() ? Number(odometer) : undefined;
    if (km !== undefined && !(km > 0)) return;
    await mutations.qc(items, true);
    await mutations.complete(km ? { odometer_km: km } : {});
    router.replace('/(tech)/(tabs)/today');
  }

  return (
    <View style={styles.flex}>
      <OfflineBanner />
      <VisitScreen step={8}>
        <QCChecklist
          items={items}
          onToggle={(code) => {
            setRework(false);
            setItems((current) => {
              const next = current.map((item) =>
                item.code === code ? { ...item, passed: !item.passed } : item,
              );
              if (next.some((item) => !item.passed)) {
                setRework(true);
              }
              return next;
            });
          }}
        />
        {rework ? (
          <InlineBanner
            tone="warning"
            message="QC failed — rework the visit. Do not show invoice paid."
          />
        ) : null}
        {mutations.error ? <InlineBanner message={mutations.error} /> : null}
        <TextInput
          value={odometer}
          onChangeText={setOdometer}
          keyboardType="number-pad"
          placeholder="Odometer km (optional)"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          accessibilityLabel="Odometer in kilometres"
        />
        <PrimaryButton
          label="Mark visit complete"
          disabled={!allPass}
          loading={mutations.busy}
          onPress={() => void complete()}
        />
      </VisitScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    color: colors.text,
  },
});
