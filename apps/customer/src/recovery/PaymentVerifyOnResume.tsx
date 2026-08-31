import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { apiClient } from '../lib/api';
import { PaymentStatusBanner } from '../features/payments/PaymentStatusBanner';

export function PaymentVerifyOnResume({
  invoiceId,
  pending,
}: {
  invoiceId: string;
  pending: boolean;
}) {
  const query = useQuery({
    queryKey: ['invoice', invoiceId, 'resume'],
    queryFn: () => apiClient.getInvoice(invoiceId),
    enabled: Boolean(invoiceId) && pending,
    refetchInterval: pending ? 3000 : false,
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && pending) void query.refetch();
    });
    return () => sub.remove();
  }, [pending, query]);

  if (!pending) return null;
  const stillPending = query.data?.status !== 'PAID';
  return (
    <PaymentStatusBanner
      tone="warn"
      pending={stillPending}
      message={
        stillPending
          ? 'Confirming payment… This usually takes a few seconds.'
          : 'Payment received'
      }
    />
  );
}
