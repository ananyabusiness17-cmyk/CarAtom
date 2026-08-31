'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useToast } from '@/components/toast';
import { Banner, PageHeader, PrimaryButton, TextField } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

export default function CatalogSettingsPage() {
  const toast = useToast();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: adminKeys.catalog,
    queryFn: () => apiClient.getAdminCatalogOverview(),
  });
  const [parts, setParts] = useState<string>();
  const [discount, setDiscount] = useState<string>();
  const [radius, setRadius] = useState<string>();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.patchAdminCatalogSettings({
        parts_advance_percent: Number(parts ?? query.data?.parts_advance_percent),
        second_vehicle_discount_percent: Number(discount ?? query.data?.second_vehicle_discount_percent),
        service_radius_km: radius ? Number(radius) : query.data?.service_radius_km,
      }),
    onSuccess: () => {
      toast.push('Settings saved');
      void client.invalidateQueries({ queryKey: adminKeys.catalog });
    },
    onError: (err) => setError(problemMessage(err)),
  });

  return (
    <div className="max-w-lg">
      <PageHeader title="Service hours & radius" subtitle="Live catalog settings" />
      {error ? <Banner>{error}</Banner> : null}
      <div className="space-y-4">
        <TextField
          label="Parts advance %"
          value={parts ?? String(query.data?.parts_advance_percent ?? 50)}
          onChange={(event) => setParts(event.target.value)}
        />
        <TextField
          label="2nd car discount %"
          value={discount ?? String(query.data?.second_vehicle_discount_percent ?? 10)}
          onChange={(event) => setDiscount(event.target.value)}
        />
        <TextField
          label="Service radius km"
          value={radius ?? String(query.data?.service_radius_km ?? 12)}
          onChange={(event) => setRadius(event.target.value)}
        />
        <PrimaryButton disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </PrimaryButton>
      </div>
    </div>
  );
}
