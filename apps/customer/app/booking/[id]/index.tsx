import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FlowRail } from '../../../src/components/FlowRail';
import { FlowScreen } from '../../../src/components/FlowScreen';
import { InspectionFlowRail } from '../../../src/components/InspectionFlowRail';
import { VisitTimeline, type TimelineVisit } from '../../../src/components/VisitTimeline';
import { HomeSkeleton } from '../../../src/components/home/HomeSkeleton';
import { InlineBanner } from '../../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../../src/components/home/PrimaryButton';
import { SecondaryButton } from '../../../src/components/SecondaryButton';
import { StatusChip } from '../../../src/components/StatusChip';
import { queryKeys } from '../../../src/coordinators/generalServiceCoordinator';
import { BookingProgressStepper } from '../../../src/features/booking/BookingProgressStepper';
import {
  pickPrimaryAction,
  primaryCtaLabel,
  resolvePrimaryRoute,
} from '../../../src/features/booking/bookingCoordinator';
import { PaymentStatusBanner } from '../../../src/features/payments/PaymentStatusBanner';
import { track } from '../../../src/lib/analytics';
import { apiClient } from '../../../src/lib/api';
import { requestPushPermission, registerPush } from '../../../src/notifications/registerPush';
import { colors, radius, type } from '../../../src/theme/tokens';

export default function BookingConfirmedScreen() {
  const { id, flow, phase, view } = useLocalSearchParams<{
    id: string;
    flow?: string;
    phase?: string;
    view?: string;
  }>();
  const router = useRouter();
  const query = useQuery({
    queryKey: queryKeys.booking(id),
    queryFn: () => apiClient.getBooking(id),
    enabled: Boolean(id),
    refetchInterval: (current) => {
      const key = current.state.data?.customer_progress?.key ?? current.state.data?.booking.customer_progress;
      if (view === 'repair-progress' || key === 'VISIT_IN_PROGRESS') return 30000;
      if (key === 'PAYMENT_VERIFICATION_PENDING') return 2000;
      return false;
    },
  });

  const booking = query.data?.booking;
  const progress = query.data?.customer_progress;
  const progressKey = progress?.key ?? booking?.customer_progress;
  const snapshot = query.data?.snapshot as
    | {
        estimate?: { line_items?: { kind: string; label?: string }[] };
        flow_policy?: string;
        confirmation_copy_key?: string | null;
        visits?: TimelineVisit[];
      }
    | undefined;

  useEffect(() => {
    if (booking?.id) {
      track('booking_detail_viewed', { booking_id: booking.id, customer_progress: progressKey });
      void requestPushPermission().then((granted) => {
        if (granted) void registerPush(apiClient, 'customer');
      });
    }
  }, [booking?.id, progressKey]);

  const ir = snapshot?.flow_policy === 'INSPECTION_REPAIR' || phase === 'visit1' || phase === 'visit2';
  const repairProgress = view === 'repair-progress' || progressKey === 'VISIT_IN_PROGRESS';
  const visit2 = phase === 'visit2' || Boolean(snapshot?.visits?.some((v) => v.visit_type === 'REPAIR'));
  const repairs =
    flow === 'service-repair' ||
    Boolean(snapshot?.estimate?.line_items?.some((line) => line.kind === 'REPAIR'));
  const oneMan = flow === 'oneman' || snapshot?.flow_policy === 'ONE_MAN';
  const postBooking = [
    'PAYMENT_DUE',
    'PAYMENT_VERIFICATION_PENDING',
    'COMPLETED',
    'PAID',
  ].includes(progressKey ?? '');

  const title = progress?.headline
    ? progress.headline
    : ir
      ? repairProgress && visit2
        ? 'Repair visit'
        : visit2
          ? 'Repair visit confirmed'
          : 'Inspection visit confirmed'
      : 'Booking confirmed';
  const note =
    progress?.subheadline ??
    (ir
      ? visit2
        ? repairProgress
          ? 'Technician status updates as the repair visit proceeds.'
          : 'Our technician will complete the approved repair on visit 2.'
        : 'Our technician will inspect your car and send findings for your approval.'
      : oneMan
        ? 'One-man job confirmed. Tech arrives with basic parts.'
        : repairs
          ? 'Service + repairs booked after you accepted on the call.'
          : (booking?.note ?? "We'll assign a van before your visit."));

  const action = pickPrimaryAction(query.data?.allowed_actions);
  const cta = primaryCtaLabel(action, query.data?.invoice?.balance_minor);
  const href = query.data ? resolvePrimaryRoute(query.data) : null;

  return (
    <FlowScreen>
      {!postBooking ? (
        ir ? (
          <InspectionFlowRail currentStep={visit2 ? 14 : 10} />
        ) : (
          <FlowRail
            currentStep={oneMan ? 6 : repairs ? 12 : 10}
            variant={oneMan ? 'oneman' : repairs ? 'gpr' : 'gs'}
          />
        )
      ) : null}
      {query.isLoading ? <HomeSkeleton /> : null}
      {query.isError ? (
        <InlineBanner message="Could not load booking." actionLabel="Retry" onAction={() => void query.refetch()} />
      ) : null}
      <ScrollView contentContainerStyle={styles.body}>
        {progress?.steps?.length ? <BookingProgressStepper steps={progress.steps} /> : null}
        {!postBooking ? (
          <View style={styles.check} accessibilityLabel={title}>
            <Ionicons name="checkmark" size={28} color={colors.surface} />
          </View>
        ) : (
          <StatusChip
            label={progressKey === 'PAYMENT_DUE' ? 'Payment due' : progressKey === 'COMPLETED' ? 'Completed' : 'Update'}
            tone={progressKey === 'COMPLETED' ? 'ok' : 'warn'}
          />
        )}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.note}>{note}</Text>
        {progressKey === 'PAYMENT_VERIFICATION_PENDING' ? (
          <PaymentStatusBanner
            tone="warn"
            pending
            message="Confirming your payment. This usually takes a few seconds."
          />
        ) : null}
        {ir && !postBooking ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{visit2 ? 'Visit 2 · Repair' : 'Visit 1 · Inspection'}</Text>
          </View>
        ) : null}
        <Row label="Reference" value={booking?.public_ref ?? booking?.job_card_ref ?? '—'} />
        <Row label="When" value={booking?.slot.display ?? '—'} />
        <Row label="Vehicle" value={booking?.vehicle_summary ?? '—'} />
        <Row label="Address" value={booking?.address_summary ?? '—'} />
        {snapshot?.visits?.length ? <VisitTimeline visits={snapshot.visits} /> : null}
      </ScrollView>
      {cta && href && progressKey !== 'PAYMENT_VERIFICATION_PENDING' ? (
        <PrimaryButton
          label={cta}
          onPress={() => {
            track('booking_action_started', { action: action ?? '', booking_id: booking?.id });
            router.push(href);
          }}
        />
      ) : (
        <PrimaryButton label="View orders" onPress={() => router.push('/(customer)/(tabs)/orders')} />
      )}
      <SecondaryButton label="Get help" onPress={() => router.push('/sos/pick')} />
    </FlowScreen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: 12, paddingBottom: 24 },
  check: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  title: { ...type.navTitle, fontSize: 20, color: colors.textStrong },
  note: { ...type.body, color: colors.textMuted, textAlign: 'center' },
  badge: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: { ...type.caption, color: colors.brandStrong, fontWeight: '700' },
  row: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowLabel: { ...type.body, color: colors.textMuted },
  rowValue: { ...type.bodyMedium, color: colors.textStrong, textAlign: 'right', flex: 1, paddingLeft: 16 },
});
