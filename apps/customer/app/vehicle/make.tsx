import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FlowRail } from '../../src/components/FlowRail';
import { SelectTile } from '../../src/components/SelectTile';
import { VehicleSegment } from '../../src/components/VehicleSegment';
import { FlowScreen } from '../../src/components/FlowScreen';
import { PrimaryButton } from '../../src/components/home/PrimaryButton';
import { MAKES } from '../../src/data/vehicleCatalog';
import { useEscapeBack } from '../../src/hooks/useEscapeBack';
import { useFlowRail } from '../../src/hooks/useFlowRail';
import { track } from '../../src/lib/analytics';
import { passAlongParams } from '../../src/lib/vehicleNav';
import { useJobCardFlowStore } from '../../src/stores/jobCardFlowStore';
import { useVehicleDraftStore } from '../../src/stores/vehicleDraftStore';
import { colors, type } from '../../src/theme/tokens';

export default function MakeScreen() {
  useEscapeBack();
  const router = useRouter();
  const params = useLocalSearchParams<{ offering?: string; returnTo?: string; flow?: string }>();
  const makeId = useVehicleDraftStore((s) => s.makeId) ?? 'honda';
  const setMake = useVehicleDraftStore((s) => s.setMake);
  const setOfferingSlug = useJobCardFlowStore((s) => s.setOfferingSlug);
  const rail = useFlowRail(2, 3, 3, 4);
  const [query, setQuery] = useState('');

  useEffect(() => {
    track('vehicle_context_started');
    if (params.offering) setOfferingSlug(params.offering);
  }, [params.offering, setOfferingSlug]);

  const filtered = MAKES.filter((make) =>
    make.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const rows: (typeof MAKES)[number][][] = [];
  for (let i = 0; i < filtered.length; i += 3) {
    rows.push(filtered.slice(i, i + 3));
  }

  return (
    <FlowScreen>
      <FlowRail currentStep={rail.currentStep} variant={rail.variant} />
      <VehicleSegment active="make" />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search company"
        placeholderTextColor={colors.textMuted}
        style={styles.search}
        accessibilityLabel="Search company"
      />
      <ScrollView contentContainerStyle={styles.grid}>
        {rows.map((row) => (
          <View key={row.map((item) => item.id).join('-')} style={styles.row}>
            {row.map((make) => (
              <SelectTile
                key={make.id}
                label={make.label}
                mark={make.logoKey}
                selected={make.id === makeId}
                onPress={() => setMake(make.id, make.label)}
              />
            ))}
            {row.length < 3
              ? Array.from({ length: 3 - row.length }).map((_, index) => (
                  <View key={`pad-${index}`} style={styles.pad} />
                ))
              : null}
          </View>
        ))}
      </ScrollView>
      <PrimaryButton
        label="Continue to model"
        onPress={() => {
          const selected = MAKES.find((item) => item.id === makeId);
          const current = useVehicleDraftStore.getState();
          if (!current.make && selected) setMake(selected.id, selected.label);
          router.push({
            pathname: '/vehicle/model',
            params: passAlongParams(rail.flowParam, params.returnTo),
          });
        }}
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    color: colors.text,
    ...type.body,
  },
  grid: { gap: 10, paddingBottom: 16 },
  row: { flexDirection: 'row', gap: 10 },
  pad: { flex: 1 },
});
