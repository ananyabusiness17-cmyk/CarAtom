'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useToast } from '@/components/toast';
import { Banner, GhostButton, PageHeader, PrimaryButton, TextField } from '@/components/ui';
import { KitEditor } from '@/components/kit-editor';
import { apiClient } from '@/lib/admin-api';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

export default function OfferingEditPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const toast = useToast();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: adminKeys.catalog,
    queryFn: () => apiClient.getAdminCatalogOverview(),
  });
  const offering = query.data?.offerings.find((row) => row.slug === params.slug);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!offering) return;
    setName(offering.name);
    setPrice(offering.display_price_minor != null ? String(offering.display_price_minor / 100) : '');
    setDuration(String(offering.duration_minutes ?? ''));
  }, [offering]);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.patchAdminOffering(params.slug, {
        name,
        display_price_minor: price ? Math.round(Number(price) * 100) : null,
        duration_minutes: duration ? Number(duration) : null,
        expected_version: offering?.version,
      }),
    onSuccess: (data) => {
      toast.push(`Saved · audit ${data.audit_id}`);
      void client.invalidateQueries({ queryKey: adminKeys.catalog });
      router.push('/catalog');
    },
    onError: (err) => setError(problemMessage(err)),
  });

  return (
    <div className="max-w-2xl">
      <PageHeader title={offering?.name ?? 'Offering'} subtitle={params.slug} />
      {error ? <Banner>{error}</Banner> : null}
      <div className="space-y-4">
        <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <TextField label="Display price (₹)" value={price} onChange={(event) => setPrice(event.target.value)} />
        <TextField label="Duration (min)" value={duration} onChange={(event) => setDuration(event.target.value)} />
        <p className="text-sm text-muted">Active · {offering?.is_active ? 'On' : 'Off'}</p>
        <div className="flex gap-2">
          <PrimaryButton disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </PrimaryButton>
          <GhostButton onClick={() => router.push('/catalog')}>Cancel</GhostButton>
        </div>
      </div>
      {offering?.id && offering.kind === 'offering' ? (
        <KitEditor ownerType="SERVICE_OFFERING" ownerId={offering.id} />
      ) : null}
    </div>
  );
}
