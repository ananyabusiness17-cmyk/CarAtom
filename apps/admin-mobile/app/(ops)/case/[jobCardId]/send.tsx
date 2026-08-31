import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@caratom/api-client';

import { InlineBanner } from '../../../../src/components/InlineBanner';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { Screen } from '../../../../src/components/Screen';
import { SecondaryButton } from '../../../../src/components/SecondaryButton';
import { apiClient } from '../../../../src/lib/api';
import { formatInr, newIdempotencyKey } from '../../../../src/lib/formatMoney';
import { useEstimateDraftStore } from '../../../../src/stores/estimateDraftStore';
import { colors, radius, type } from '../../../../src/theme/tokens';

export default function SendEstimateScreen() {
  const { jobCardId } = useLocalSearchParams<{ jobCardId: string }>();
  const router = useRouter();
  const lines = useEstimateDraftStore((s) => s.lines);
  const advisorCaseId = useEstimateDraftStore((s) => s.advisorCaseId);
  const customerName = useEstimateDraftStore((s) => s.customerName);
  const total = lines.reduce((sum, line) => sum + line.amount_minor, 0);

  const publish = useMutation({
    mutationFn: async () => {
      if (!advisorCaseId) throw new Error('Missing advisor case');
      return apiClient.publishAdminEstimate(
        jobCardId,
        {
          advisor_case_id: advisorCaseId,
          publish_to_customer: true,
          lines: lines.map((line) => ({
            kind: line.kind,
            label: line.label,
            repair_offering_slug: line.repair_offering_slug ?? null,
            amount_minor: line.amount_minor,
          })),
        },
        newIdempotencyKey(`publish-${jobCardId}`),
      );
    },
    onSuccess: () => {
      router.replace(`/(ops)/case/${jobCardId}`);
    },
  });

  const error =
    publish.error instanceof ApiError
      ? publish.error.message
      : publish.error instanceof Error
        ? publish.error.message
        : null;

  function confirmSend() {
    Alert.alert(
      'Send to customer app now?',
      `Total ${formatInr(total)} will land on ${customerName}'s app during the call.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => void publish.mutate() },
      ],
    );
  }

  return (
    <Screen>
      <View style={styles.card}>
        <Text style={styles.muted}>Estimate on customer app · during call</Text>
        <Text style={styles.total}>{formatInr(total)}</Text>
        <Text style={styles.note}>May match submitted cart — customer still Accepts or Denies</Text>
      </View>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Customer sees ⑩ Accept / Deny · Accept → ⑪ Slot · Deny → repairs cart
        </Text>
      </View>
      {error ? <InlineBanner message={error} /> : null}
      <PrimaryButton
        label="Send to customer app now"
        loading={publish.isPending}
        disabled={!advisorCaseId || lines.length === 0}
        onPress={confirmSend}
      />
      <SecondaryButton
        label={`Still on call with ${customerName}`}
        onPress={() => router.replace(`/(ops)/case/${jobCardId}`)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
    alignItems: 'center',
  },
  muted: { ...type.caption, color: colors.textMuted },
  total: { ...type.price, fontSize: 32, lineHeight: 38, color: colors.textStrong },
  note: { ...type.body, color: colors.textMuted, textAlign: 'center' },
  banner: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.card,
    padding: 12,
  },
  bannerText: { ...type.body, color: colors.brandStrong },
});
