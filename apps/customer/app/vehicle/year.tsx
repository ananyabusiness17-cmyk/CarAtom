import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { FlowRail } from '../../src/components/FlowRail';
import { FlowScreen } from '../../src/components/FlowScreen';
import { SelectTile } from '../../src/components/SelectTile';
import { VehicleSegment } from '../../src/components/VehicleSegment';
import { PrimaryButton } from '../../src/components/home/PrimaryButton';
import { YEARS } from '../../src/data/vehicleCatalog';
import { useEscapeBack } from '../../src/hooks/useEscapeBack';
import { useFlowRail } from '../../src/hooks/useFlowRail';
import { passAlongParams } from '../../src/lib/vehicleNav';
import { useVehicleDraftStore } from '../../src/stores/vehicleDraftStore';

export default function YearScreen() {
  useEscapeBack();
  const router = useRouter();
  const year = useVehicleDraftStore((s) => s.year) ?? 2019;
  const setYear = useVehicleDraftStore((s) => s.setYear);
  const rail = useFlowRail(4, 5, 3, 6);
  const params = useLocalSearchParams<{ returnTo?: string; offering?: string; intent?: string }>();
  const rows: number[][] = [];
  for (let i = 0; i < YEARS.length; i += 3) {
    rows.push(YEARS.slice(i, i + 3));
  }

  return (
    <FlowScreen>
      <FlowRail currentStep={rail.currentStep} variant={rail.variant} />
      <VehicleSegment active="year" />
      <ScrollView contentContainerStyle={styles.grid}>
        {rows.map((row) => (
          <View key={row.join('-')} style={styles.row}>
            {row.map((value) => (
              <SelectTile
                key={value}
                label={String(value)}
                selected={value === year}
                onPress={() => setYear(value)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      <PrimaryButton
        label="Continue to fuel"
        onPress={() => {
          if (!useVehicleDraftStore.getState().year) setYear(year);
          router.push({
            pathname: '/vehicle/fuel',
            params: passAlongParams(
              { ...rail.flowParam, offering: params.offering, intent: params.intent },
              params.returnTo,
            ),
          });
        }}
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 10, paddingBottom: 16 },
  row: { flexDirection: 'row', gap: 10 },
});
