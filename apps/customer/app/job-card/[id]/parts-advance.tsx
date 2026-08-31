import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@caratom/api-client';
import type { PartsAdvanceOrderResponse } from '@caratom/contracts';

import { FlowScreen } from '../../../src/components/FlowScreen';
import { InspectionFlowRail } from '../../../src/components/InspectionFlowRail';
import { PartsAdvanceSummary } from '../../../src/components/PartsAdvanceSummary';
import { InlineBanner } from '../../../src/components/home/InlineBanner';
import { PolicyNote } from '../../../src/components/home/PolicyNote';
import { PrimaryButton } from '../../../src/components/home/PrimaryButton';
import { queryKeys } from '../../../src/coordinators/generalServiceCoordinator';
import { routeFromInspectionRepairState } from '../../../src/coordinators/inspectionRepairCoordinator';
import { PaymentStatusBanner } from '../../../src/features/payments/PaymentStatusBanner';
import {
  checkoutKey,
  isStubCheckoutKey,
  RazorpayCheckout,
} from '../../../src/features/payments/RazorpayCheckout';
import { track } from '../../../src/lib/analytics';
import { apiClient } from '../../../src/lib/api';
import { formatInr, newIdempotencyKey, partsAdvancePercent } from '../../../src/lib/formatMoney';
import { colors, radius, type } from '../../../src/theme/tokens';

function isCaptured(status: { status?: string; verification_status?: string }): boolean {
  return status.verification_status === 'VERIFIED' || status.status === 'CAPTURED';
}

export default function PartsAdvanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [why, setWhy] = useState(false);
  const [checkout, setCheckout] = useState<PartsAdvanceOrderResponse | null>(null);

  const jobQuery = useQuery({
    queryKey: queryKeys.jobCard(id),
    queryFn: () => apiClient.getJobCard(id),
    enabled: Boolean(id),
  });
  const findingsQuery = useQuery({
    queryKey: ['inspection-findings', id],
    queryFn: () => apiClient.getInspectionFindings(id),
    enabled: Boolean(id),
  });

  const estimate = findingsQuery.data?.estimate_summary;
  const advance = estimate?.parts_advance.amount_minor ?? 0;
  const total = estimate?.total.amount_minor ?? 0;
  const partsSubtotal = (estimate?.line_items ?? [])
    .filter((line) => line.kind === 'PART')
    .reduce((sum, line) => sum + line.amount_minor, 0);
  const balance = Math.max(total - advance, 0);

  useEffect(() => {
    if (
      jobQuery.data?.job_card.customer_progress &&
      jobQuery.data.job_card.customer_progress !== 'PARTS_PAYMENT_REQUIRED'
    ) {
      router.replace(
        routeFromInspectionRepairState({
          jobCard: jobQuery.data.job_card,
          flowDecision: jobQuery.data.flow_decision,
        }),
      );
    }
  }, [jobQuery.data, router]);

  async function pollUntilCaptured(paymentId: string, keyId: string) {
    setVerifying(true);
    setCheckout(null);
    let status = await apiClient.getPayment(paymentId);
    if (!isCaptured(status) && isStubCheckoutKey(keyId)) {
      await apiClient.capturePartsAdvanceDev(paymentId);
      status = await apiClient.getPayment(paymentId);
    }
    for (let i = 0; i < 15 && !isCaptured(status); i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      status = await apiClient.getPayment(paymentId);
    }
    if (!isCaptured(status)) {
      throw new Error('Payment is still verifying. Stay on this screen and try again.');
    }
    return apiClient.getJobCard(id);
  }

  const pay = useMutation({
    mutationFn: async () => {
      if (!estimate) throw new Error('Missing estimate');
      return apiClient.createPartsAdvanceOrder(
        id,
        { estimate_id: estimate.estimate_id, expected_amount_minor: advance },
        newIdempotencyKey(`advance-${id}`),
      );
    },
    onSuccess: (order) => {
      setCheckout(order);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not start payment. Try again.');
    },
  });

  const confirm = useMutation({
    mutationFn: async (args: { paymentId: string; keyId: string }) =>
      pollUntilCaptured(args.paymentId, args.keyId),
    onSuccess: (envelope) => {
      track('parts_advance_paid', { id });
      setVerifying(false);
      router.replace(
        routeFromInspectionRepairState({
          jobCard: envelope.job_card,
          flowDecision: envelope.flow_decision,
        }),
      );
    },
    onError: (err) => {
      setVerifying(false);
      setError(err instanceof ApiError ? err.message : 'Payment did not complete. Try again.');
    },
  });

  return (
    <FlowScreen>
      <InspectionFlowRail currentStep={13} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>Parts advance payment</Text>
        <Text style={styles.sub}>
          We order parts after you pay the advance. Repair visit is booked once parts are ready.
        </Text>
        {error ? <InlineBanner message={error} /> : null}
        {verifying ? (
          <PaymentStatusBanner
            tone="warn"
            pending
            message="Confirming your payment. This usually takes a few seconds."
          />
        ) : null}
        {findingsQuery.isError ? (
          <InlineBanner
            message="Could not load the advance amount."
            actionLabel="Retry"
            onAction={() => void findingsQuery.refetch()}
          />
        ) : null}
        <PartsAdvanceSummary
          partsSubtotalMinor={partsSubtotal}
          advanceMinor={advance}
          balanceMinor={balance}
          percent={partsAdvancePercent(partsSubtotal, advance)}
        />
        <PolicyNote>Advance is applied to your final invoice. Cancellation refund policy applies.</PolicyNote>
        <Pressable onPress={() => setWhy(true)} accessibilityRole="button">
          <Text style={styles.link}>Why do I pay before repair?</Text>
        </Pressable>
      </ScrollView>
      <PrimaryButton
        label={`Pay parts advance · ${formatInr(advance)}`}
        accessibilityLabel={`Pay parts advance ${formatInr(advance)}`}
        loading={pay.isPending || verifying || confirm.isPending}
        disabled={!estimate || advance <= 0}
        onPress={() => void pay.mutate()}
      />
      <Modal visible={why} transparent animationType="slide" onRequestClose={() => setWhy(false)}>
        <Pressable style={styles.scrim} onPress={() => setWhy(false)}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Why an advance?</Text>
            <Text style={styles.sub}>
              We order the approved parts after this payment. The remainder is billed on the final invoice after
              visit 2.
            </Text>
            <PrimaryButton label="Close" onPress={() => setWhy(false)} />
          </View>
        </Pressable>
      </Modal>
      {checkout ? (
        <RazorpayCheckout
          order={checkout}
          onVerificationPending={(paymentId) => {
            void confirm.mutate({ paymentId, keyId: checkoutKey(checkout) });
          }}
          onCheckoutDismissed={() => setCheckout(null)}
        />
      ) : null}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 16 },
  title: { ...type.navTitle, color: colors.textStrong },
  sub: { ...type.body, color: colors.textMuted },
  link: { ...type.bodyMedium, color: colors.brandStrong },
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,37,50,0.35)' },
  sheet: {
    backgroundColor: colors.canvas,
    padding: 20,
    gap: 12,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
});
