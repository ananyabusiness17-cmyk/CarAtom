import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ApiError } from '@caratom/api-client';

import { FlowRail } from '../../src/components/FlowRail';
import { FlowScreen } from '../../src/components/FlowScreen';
import { SelectTile } from '../../src/components/SelectTile';
import { VehicleSegment } from '../../src/components/VehicleSegment';
import { InlineBanner } from '../../src/components/home/InlineBanner';
import { PolicyNote } from '../../src/components/home/PolicyNote';
import { PrimaryButton } from '../../src/components/home/PrimaryButton';
import { FUELS } from '../../src/data/vehicleCatalog';
import { useEscapeBack } from '../../src/hooks/useEscapeBack';
import { useFlowRail } from '../../src/hooks/useFlowRail';
import { track } from '../../src/lib/analytics';
import { createFlowJobCard } from '../../src/lib/createFlowJobCard';
import { safeReturnTo } from '../../src/lib/safeReturnTo';
import { isDraftComplete, vehicleLabel } from '../../src/lib/vehicleDraft';
import { useJobCardFlowStore } from '../../src/stores/jobCardFlowStore';
import { useRepairCartStore } from '../../src/stores/repairCartStore';
import { useVehicleDraftStore } from '../../src/stores/vehicleDraftStore';
import { colors, radius, type } from '../../src/theme/tokens';

export default function FuelScreen() {
  useEscapeBack();
  const router = useRouter();
  const draft = useVehicleDraftStore();
  const offeringSlug = useJobCardFlowStore((s) => s.offeringSlug);
  const setJobCard = useJobCardFlowStore((s) => s.setJobCard);
  const rail = useFlowRail(5, 6, 3, 7);
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const caption = vehicleLabel(draft) ?? 'Select your car';
  const fuel = draft.fuelType;
  const transmission = draft.transmission ?? 'MANUAL';

  async function submit() {
    if (!isDraftComplete(draft)) {
      setError('Select make, model, year, and fuel first.');
      return;
    }
    if (params.returnTo) {
      router.replace(safeReturnTo(params.returnTo));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const vehicle = useVehicleDraftStore.getState();
      const offering = rail.isIr
        ? offeringSlug || 'inspection-and-repair'
        : offeringSlug || 'general-service-health-report';
      const kind = rail.isIr ? 'ir' : rail.isGpr ? 'gpr' : 'gs';
      const jobCardId = await createFlowJobCard({
        kind,
        offeringSlug: offering,
        vehicle,
        symptoms: useJobCardFlowStore.getState().symptoms,
        photoAssetIds: useJobCardFlowStore.getState().photoAssetIds,
        repairSlugs: kind === 'gpr' ? useRepairCartStore.getState().selectedSlugs : undefined,
      });
      if (kind === 'gpr') useRepairCartStore.getState().clear();
      setJobCard(jobCardId, offering);
      track('vehicle_context_completed', { vehicle: vehicleLabel(vehicle) ?? 'vehicle' });
      if (rail.isIr) {
        router.replace(`/checkout/details?flow=ir&jobCardId=${jobCardId}`);
        return;
      }
      router.replace(`/job-card/${jobCardId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create job card.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <FlowScreen>
      <FlowRail currentStep={rail.currentStep} variant={rail.variant} />
      <VehicleSegment active="fuel" />
      <View style={styles.preview}>
        <View style={styles.photo} />
        <Text style={styles.caption}>{caption}</Text>
      </View>
      <View style={styles.chips}>
        {(['MANUAL', 'AUTOMATIC'] as const).map((value) => {
          const active = transmission === value;
          return (
            <Pressable
              key={value}
              onPress={() => draft.setTransmission(value)}
              accessibilityRole="button"
              accessibilityLabel={value === 'MANUAL' ? 'Manual' : 'Automatic'}
              accessibilityState={{ selected: active }}
              style={[styles.chip, active ? styles.chipActive : null]}
            >
              <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>
                {value === 'MANUAL' ? 'Manual' : 'Automatic'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <SelectTile
        label="Petrol"
        caption="Selected fuel"
        selected={fuel === 'PETROL'}
        onPress={() => draft.setFuel('PETROL')}
      />
      <View style={styles.fuels}>
        {FUELS.filter((item) => item.id !== 'PETROL').map((item) => (
          <Pressable
            key={item.id}
            onPress={() => draft.setFuel(item.id)}
            style={[styles.altFuel, fuel === item.id ? styles.chipActive : null]}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: fuel === item.id }}
          >
            <Text style={styles.chipLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <InlineBanner message={error} /> : null}
      {rail.isIr ? (
        <PolicyNote>Vehicle helps us assign the right technician and van.</PolicyNote>
      ) : null}
      <PrimaryButton
        label={rail.isIr ? 'Continue to your details' : 'Use this car'}
        loading={busy}
        disabled={busy || !isDraftComplete(draft)}
        onPress={() => void submit()}
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  preview: {
    height: 140,
    borderRadius: radius.card,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: 120,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.border,
    marginBottom: 8,
  },
  caption: { ...type.bodyMedium, color: colors.textStrong },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.selectionBorder, backgroundColor: colors.selectionBg },
  chipLabel: { ...type.bodyMedium, color: colors.textMuted },
  chipLabelActive: { color: colors.brandStrong },
  fuels: { flexDirection: 'row', gap: 8 },
  altFuel: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
