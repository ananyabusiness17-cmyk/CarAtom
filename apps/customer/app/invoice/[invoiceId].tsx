import { useMutation, useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@caratom/api-client';
import type { PaymentOrderCreateResponse, PaymentPurpose } from '@caratom/contracts';

import { HomeSkeleton } from '../../src/components/home/HomeSkeleton';
import { InlineBanner } from '../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../src/components/home/PrimaryButton';
import { StatusChip } from '../../src/components/StatusChip';
import { PaymentStatusBanner } from '../../src/features/payments/PaymentStatusBanner';
import { PaymentVerifyOnResume } from '../../src/recovery/PaymentVerifyOnResume';
import {
  checkoutKey,
  isStubCheckoutKey,
  RazorpayCheckout,
} from '../../src/features/payments/RazorpayCheckout';
import { track } from '../../src/lib/analytics';
import { apiClient } from '../../src/lib/api';
import { formatInr, newIdempotencyKey } from '../../src/lib/formatMoney';
import { colors, type } from '../../src/theme/tokens';

export default function InvoiceScreen() {
  const { invoiceId, purpose } = useLocalSearchParams<{ invoiceId: string; purpose?: string }>();
  const router = useRouter();
  const payPurpose = (purpose === 'PARTS_ADVANCE' ? 'PARTS_ADVANCE' : 'BALANCE') as PaymentPurpose;
  const [order, setOrder] = useState<PaymentOrderCreateResponse | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invoiceQuery = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => apiClient.getInvoice(invoiceId),
    enabled: Boolean(invoiceId),
  });

  const paymentQuery = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => apiClient.getInvoicePayment(paymentId!),
    enabled: Boolean(paymentId),
    refetchInterval: (current) => {
      const pending =
        current.state.data?.verification_status === 'PENDING' || current.state.data?.status === 'PENDING';
      if (!pending) return false;
      if (pollStartedAt && Date.now() - pollStartedAt > 30_000) return false;
      return 2000;
    },
  });

  useEffect(() => {
    if (invoiceQuery.data?.id) track('invoice_viewed', { invoice_id: invoiceQuery.data.id });
  }, [invoiceQuery.data?.id]);

  useEffect(() => {
    if (paymentQuery.data?.verification_status === 'VERIFIED') {
      void invoiceQuery.refetch();
    }
  }, [invoiceQuery, paymentQuery.data?.verification_status]);

  const verified =
    paymentQuery.data?.verification_status === 'VERIFIED' || invoiceQuery.data?.status === 'PAID';

  useEffect(() => {
    if (!paymentId || verified) {
      setPollTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setPollTimedOut(true), 30_000);
    return () => clearTimeout(timer);
  }, [paymentId, verified]);

  const pending =
    Boolean(paymentId) &&
    !verified &&
    !pollTimedOut &&
    (paymentQuery.data?.verification_status === 'PENDING' || !paymentQuery.data);

  const pay = useMutation({
    mutationFn: () => apiClient.createPaymentOrder(invoiceId, payPurpose, newIdempotencyKey('pay')),
    onSuccess: (result) => {
      track('payment_started', { amount_minor: result.amount_minor, purpose: result.purpose });
      setOrder(result);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.problem?.code === 'PAYMENT_ALREADY_SETTLED') {
        void invoiceQuery.refetch();
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Could not start payment.');
    },
  });

  const invoice = invoiceQuery.data;
  const badge = verified ? 'Paid' : pending ? 'Verifying…' : invoice?.status === 'PARTIALLY_PAID' ? 'Partial' : 'Due';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <Text style={styles.title}>Invoice</Text>
          <StatusChip label={badge} tone={verified ? 'ok' : pending ? 'warn' : 'warn'} />
        </View>
        {invoiceQuery.isLoading ? <HomeSkeleton /> : null}
        {invoiceQuery.isError ? (
          <InlineBanner
            message="Could not load invoice."
            actionLabel="Retry"
            onAction={() => void invoiceQuery.refetch()}
          />
        ) : null}
        {error ? <InlineBanner message={error} /> : null}
        {invoice ? (
          <>
            <Text style={styles.muted}>Invoice #{invoice.invoice_number}</Text>
            <Text style={styles.section}>Summary</Text>
            {invoice.line_items
              .filter((line) => line.kind !== 'TAX')
              .map((line) => (
                <View key={line.id} style={styles.line}>
                  <Text style={styles.lineLabel} numberOfLines={2}>
                    {line.label}
                  </Text>
                  <Text style={styles.lineAmt}>{formatInr(line.amount_minor)}</Text>
                </View>
              ))}
            <View style={styles.divider} />
            <View style={styles.line}>
              <Text style={styles.muted}>Subtotal</Text>
              <Text style={styles.lineAmt}>{formatInr(invoice.subtotal_minor)}</Text>
            </View>
            <View style={styles.line}>
              <Text style={styles.muted}>GST (18%)</Text>
              <Text style={styles.lineAmt}>{formatInr(invoice.tax_minor)}</Text>
            </View>
            <View style={styles.line}>
              <Text
                style={styles.total}
                accessibilityLabel={`Total amount, ${Math.round(invoice.total_minor / 100)} rupees`}
              >
                Total
              </Text>
              <Text style={styles.total}>{formatInr(invoice.total_minor)}</Text>
            </View>
            {invoice.paid_minor > 0 ? (
              <View style={styles.line}>
                <Text style={styles.muted}>Paid</Text>
                <Text style={styles.lineAmt}>{formatInr(invoice.paid_minor)}</Text>
              </View>
            ) : null}
            {invoice.balance_minor > 0 && !verified ? (
              <View style={styles.line}>
                <Text style={styles.lineLabel}>Balance due</Text>
                <Text style={styles.lineAmt}>{formatInr(invoice.balance_minor)}</Text>
              </View>
            ) : null}
            {invoice.payment_method === 'OFFLINE' ? (
              <Text style={styles.muted}>Paid at service (cash)</Text>
            ) : null}
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Download invoice PDF"
                onPress={() => {
                  if (invoice.pdf_download_url) void Linking.openURL(invoice.pdf_download_url);
                }}
                style={styles.iconBtn}
              >
                <Text style={styles.iconLbl}>Download</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share invoice"
                onPress={() => {
                  if (invoice.pdf_download_url) {
                    void Share.share({ url: invoice.pdf_download_url, message: invoice.pdf_download_url });
                  }
                }}
                style={styles.iconBtn}
              >
                <Text style={styles.iconLbl}>Share</Text>
              </Pressable>
            </View>
          </>
        ) : null}
        {pending ? (
          <PaymentVerifyOnResume invoiceId={invoiceId} pending />
        ) : null}
        {verified ? (
          <PaymentStatusBanner tone="ok" message="Payment received. Thank you. Your receipt is ready to download." />
        ) : null}
        {paymentQuery.data?.verification_status === 'FAILED' ? (
          <PaymentStatusBanner tone="err" message="Payment could not be completed. Try again." />
        ) : null}
        {pollTimedOut && !verified ? (
          <PaymentStatusBanner
            tone="warn"
            message="Still confirming your payment. You can wait or try again."
          />
        ) : null}
      </ScrollView>
      {invoice && invoice.balance_minor > 0 && !verified && !pending ? (
        <View style={styles.payBar}>
          <PrimaryButton
            label={`Pay ${formatInr(invoice.balance_minor)}`}
            onPress={() => {
              setError(null);
              pay.mutate();
            }}
            disabled={pay.isPending}
          />
        </View>
      ) : null}
      {verified ? (
        <View style={styles.payBar}>
          <PrimaryButton
            label="Rate this service"
            onPress={() => router.push(`/review/${invoice?.booking_id}`)}
          />
        </View>
      ) : null}
      {order ? (
        <RazorpayCheckout
          order={order}
          onVerificationPending={(id) => {
            const stub = isStubCheckoutKey(checkoutKey(order));
            setPollStartedAt(Date.now());
            setPaymentId(id);
            setOrder(null);
            if (stub) {
              void apiClient.capturePartsAdvanceDev(id).then(() => {
                void invoiceQuery.refetch();
              });
            }
          }}
          onCheckoutDismissed={() => setOrder(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  body: { padding: 24, gap: 10, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...type.navTitle, color: colors.textStrong },
  section: { ...type.bodyMedium, color: colors.textStrong, marginTop: 8 },
  muted: { ...type.body, color: colors.textMuted },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  lineLabel: { ...type.body, color: colors.text, flex: 1 },
  lineAmt: { ...type.body, color: colors.textStrong, fontVariant: ['tabular-nums'] },
  total: { ...type.bodyMedium, color: colors.brandStrong, fontVariant: ['tabular-nums'] },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  iconBtn: { minHeight: 44, justifyContent: 'center' },
  iconLbl: { ...type.bodyMedium, color: colors.brandStrong },
  payBar: { padding: 16, paddingBottom: 24, backgroundColor: colors.canvas },
});
