import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { FlowRail } from '../../src/components/FlowRail';
import { FlowScreen } from '../../src/components/FlowScreen';
import { SecondaryButton } from '../../src/components/SecondaryButton';
import { VehicleSummaryCard } from '../../src/components/VehicleSummaryCard';
import { InlineBanner } from '../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../src/components/home/PrimaryButton';
import { isDraftComplete, vehicleLabel, vehicleSummaryLine } from '../../src/lib/vehicleDraft';
import { useJobCardFlowStore } from '../../src/stores/jobCardFlowStore';
import { useVehicleDraftStore } from '../../src/stores/vehicleDraftStore';
import { colors, type } from '../../src/theme/tokens';

export default function OneManVehicleScreen() {
  const router = useRouter();
  const { jobCardId } = useLocalSearchParams<{ jobCardId?: string }>();
  const storedId = useJobCardFlowStore((s) => s.activeJobCardId);
  const offeringSlug = useJobCardFlowStore((s) => s.offeringSlug);
  const setFlowKind = useJobCardFlowStore((s) => s.setFlowKind);
  const draft = useVehicleDraftStore();
  const id = jobCardId ?? storedId ?? '';
  const complete = isDraftComplete(draft);
  const label = vehicleLabel(draft) ?? 'Add your car';
  const jobName =
    offeringSlug === 'bulb-headlight'
      ? 'Bulb / headlight'
      : offeringSlug.replace(/-/g, ' ') || 'One-man job';

  return (
    <FlowScreen>
      <FlowRail currentStep={3} variant="oneman" />
      <Text style={styles.sub} numberOfLines={3}>{`${jobName} · ${label}`}</Text>
      {!complete ? (
        <InlineBanner
          message="Add your car to continue."
          actionLabel="Change vehicle"
          onAction={() =>
            router.push({
              pathname: '/vehicle/make',
              params: {
                flow: 'oneman',
                returnTo: `/oneman/vehicle?jobCardId=${id}`,
              },
            })
          }
        />
      ) : null}
      <View style={styles.preview}>
        <View style={styles.photo} />
        <Text style={styles.caption}>Vehicle preview</Text>
      </View>
      <VehicleSummaryCard summary={vehicleSummaryLine(draft)} />
      <SecondaryButton
        label="Change vehicle"
        onPress={() =>
          router.push({
            pathname: '/vehicle/make',
            params: {
              flow: 'oneman',
              returnTo: `/oneman/vehicle?jobCardId=${id}`,
            },
          })
        }
      />
      <PrimaryButton
        label="Continue"
        disabled={!complete}
        onPress={() => {
          if (!complete) return;
          setFlowKind('oneman');
          router.push({
            pathname: '/checkout/details',
            params: { jobCardId: id, flow: 'oneman' },
          });
        }}
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  sub: { ...type.caption, color: colors.textMuted },
  preview: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  photo: {
    width: 160,
    height: 88,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
  },
  caption: { ...type.caption, color: colors.textMuted },
});
