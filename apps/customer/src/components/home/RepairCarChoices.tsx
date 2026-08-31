import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ChoiceRow } from '../ChoiceRow';
import { apiClient } from '../../lib/api';
import {
  draftFromSavedVehicle,
  gprVehicleParams,
  gsVehicleParams,
  hasMakeModelYear,
  nextVehicleGate,
} from '../../lib/presentVehicle';
import { pickVehicleDraft, vehicleLabel, type VehicleDraft } from '../../lib/vehicleDraft';
import { useAuth } from '../../providers/AuthProvider';
import { useJobCardFlowStore } from '../../stores/jobCardFlowStore';
import { useVehicleDraftStore } from '../../stores/vehicleDraftStore';
import { colors, type } from '../../theme/tokens';

export function RepairCarChoices({
  offeringSlug,
  flow = 'gpr',
}: {
  offeringSlug: string;
  flow?: 'gs' | 'gpr';
}) {
  const router = useRouter();
  const { session } = useAuth();
  const draft = useVehicleDraftStore();
  const applyVehicle = useVehicleDraftStore((s) => s.applyVehicle);
  const setFlowKind = useJobCardFlowStore((s) => s.setFlowKind);
  const setOfferingSlug = useJobCardFlowStore((s) => s.setOfferingSlug);

  const savedQuery = useQuery({
    queryKey: ['me', 'vehicles'],
    queryFn: () => apiClient.listVehicles(),
    enabled: Boolean(session),
    staleTime: 60_000,
  });

  const saved = savedQuery.data?.items.find((item) => !item.is_archived);
  const present: VehicleDraft = hasMakeModelYear(draft)
    ? pickVehicleDraft(draft)
    : saved
      ? draftFromSavedVehicle(saved)
      : pickVehicleDraft(draft);
  const presentLabel = vehicleLabel(present);
  const hasPresent = hasMakeModelYear(present);

  function vehicleParams() {
    return flow === 'gpr' ? gprVehicleParams() : gsVehicleParams(offeringSlug);
  }

  function startFlow() {
    setFlowKind(flow);
    setOfferingSlug(offeringSlug);
  }

  function openNewCar() {
    startFlow();
    router.push({
      pathname: '/vehicle/make',
      params: vehicleParams(),
    });
  }

  function openPresentCar() {
    if (!hasPresent) {
      openNewCar();
      return;
    }
    startFlow();
    applyVehicle(present);
    const gate = nextVehicleGate(pickVehicleDraft(useVehicleDraftStore.getState()));
    if (flow === 'gpr' && gate === 'complete') {
      router.push('/job-card/repairs-cart');
      return;
    }
    if (gate === 'make') {
      openNewCar();
      return;
    }
    router.push({
      pathname: '/vehicle/fuel',
      params: vehicleParams(),
    });
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>Choose car</Text>
      <ChoiceRow
        label="Present car"
        caption={presentLabel ?? 'No car saved yet — use New car'}
        selected={hasPresent}
        disabled={!hasPresent}
        onPress={openPresentCar}
      />
      <ChoiceRow
        label="New car"
        caption="Make, model, year, then fuel"
        onPress={openNewCar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  section: { ...type.sectionTitle, color: colors.textStrong },
});
