import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { FlowRail } from '../../src/components/FlowRail';
import { FlowScreen } from '../../src/components/FlowScreen';
import { SelectTile } from '../../src/components/SelectTile';
import { VehicleSegment } from '../../src/components/VehicleSegment';
import { PrimaryButton } from '../../src/components/home/PrimaryButton';
import { MODELS_BY_MAKE } from '../../src/data/vehicleCatalog';
import { useEscapeBack } from '../../src/hooks/useEscapeBack';
import { useFlowRail } from '../../src/hooks/useFlowRail';
import { passAlongParams } from '../../src/lib/vehicleNav';
import { useVehicleDraftStore } from '../../src/stores/vehicleDraftStore';
import { colors, type } from '../../src/theme/tokens';

export default function ModelScreen() {
  useEscapeBack();
  const router = useRouter();
  const makeId = useVehicleDraftStore((s) => s.makeId) ?? 'honda';
  const make = useVehicleDraftStore((s) => s.make) ?? 'Honda';
  const selected = useVehicleDraftStore((s) => s.model) ?? 'City';
  const setModel = useVehicleDraftStore((s) => s.setModel);
  const rail = useFlowRail(3, 4, 3, 5);
  const params = useLocalSearchParams<{ returnTo?: string; offering?: string; intent?: string }>();
  const models = MODELS_BY_MAKE[makeId] ?? MODELS_BY_MAKE.honda;

  const rows: (typeof models)[] = [];
  for (let i = 0; i < models.length; i += 3) {
    rows.push(models.slice(i, i + 3));
  }

  return (
    <FlowScreen>
      <FlowRail currentStep={rail.currentStep} variant={rail.variant} />
      <VehicleSegment active="model" />
      <Text style={styles.context}>{make}</Text>
      <ScrollView contentContainerStyle={styles.grid}>
        {rows.map((row) => (
          <View key={row.map((item) => item.name).join('-')} style={styles.row}>
            {row.map((model) => (
              <SelectTile
                key={model.name}
                label={model.name}
                caption={model.bodyType}
                selected={model.name === selected}
                onPress={() => setModel(model.name)}
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
        label="Continue to year"
        disabled={!selected}
        onPress={() => {
          if (!useVehicleDraftStore.getState().model) setModel(selected);
          router.push({
            pathname: '/vehicle/year',
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
  context: { ...type.bodyMedium, color: colors.textMuted },
  grid: { gap: 10, paddingBottom: 16 },
  row: { flexDirection: 'row', gap: 10 },
  pad: { flex: 1 },
});
