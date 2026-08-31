'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { useToast } from '@/components/toast';
import { Banner, PageHeader, PrimaryButton, SecondaryButton } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { newIdempotencyKey } from '@/lib/idempotency';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';

const STEPS = ['Customer', 'Service', 'Vehicle', 'Slot', 'Confirm'] as const;

export default function BookOnBehalfPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [q, setQ] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [slug, setSlug] = useState('one-man-ac-gas-topup');
  const [vehicleId, setVehicleId] = useState('');
  const [slotId, setSlotId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const people = useQuery({
    queryKey: adminKeys.people(q),
    queryFn: () => apiClient.searchAdminPeople(q || undefined),
  });
  const catalog = useQuery({
    queryKey: adminKeys.catalog,
    queryFn: () => apiClient.getAdminCatalogOverview(),
  });
  const customer = useQuery({
    queryKey: adminKeys.customer(customerId),
    queryFn: () => apiClient.getAdminCustomer(customerId),
    enabled: Boolean(customerId),
  });

  const customers = (people.data?.items ?? []).filter((row) => row.kind === 'customer');
  const selectedCustomer = customers.find((row) => row.id === customerId);
  const vehicles = customer.data?.vehicles ?? [];
  const slots = useMemo(() => {
    const now = new Date();
    const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
    const ist = new Date(istMs);
    ist.setUTCDate(ist.getUTCDate() + 1);
    const y = ist.getUTCFullYear();
    const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
    const d = String(ist.getUTCDate()).padStart(2, '0');
    return [9, 11, 16].map((hour) => {
      const hh = String(hour).padStart(2, '0');
      return { id: `${y}-${m}-${d}T${hh}:00:00+05:30`, label: `${hh}:00` };
    });
  }, []);

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.bookOnBehalf(
        {
          customer_profile_id: customerId,
          service_offering_slug: slug,
          vehicle_id: vehicleId || undefined,
          slot_id: slotId,
          concerns: slug.includes('one-man') ? [] : [{ text: 'Walk-in WhatsApp request' }],
          admin_note: 'Booked at desk',
        },
        newIdempotencyKey(),
      ),
    onSuccess: (data) => {
      toast.push(`Created ${data.public_ref} · audit ${data.audit_id}`);
      router.push(`/jobs/${data.job_card_id}`);
    },
    onError: (err) => setError(problemMessage(err)),
  });

  return (
    <div className="max-w-xl">
      <PageHeader title="Book for customer" subtitle="Walk-in or WhatsApp. Creates the same job card." />
      <ol className="mb-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {STEPS.map((label, index) => (
          <li key={label} className={index === step ? 'text-brand-strong' : undefined}>
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      {error ? <Banner>{error}</Banner> : null}

      {step === 0 ? (
        <div className="space-y-3">
          <input
            data-ops-search
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search name or phone"
            className="h-10 w-full rounded-md border border-border px-3 text-sm"
          />
          <ul className="grid gap-2">
            {customers.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setCustomerId(row.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                    customerId === row.id ? 'border-brand bg-brand-soft' : 'border-border bg-surface'
                  }`}
                >
                  {row.display_name} · {row.masked_phone ?? ''}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {step === 1 ? (
        <select value={slug} onChange={(event) => setSlug(event.target.value)} className="h-10 w-full rounded-md border border-border px-3">
          {(catalog.data?.offerings ?? []).map((row) => (
            <option key={row.slug} value={row.slug}>
              {row.name}
            </option>
          ))}
        </select>
      ) : null}

      {step === 2 ? (
        <select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} className="h-10 w-full rounded-md border border-border px-3">
          <option value="">First saved vehicle</option>
          {vehicles.map((vehicle, index) => {
            const rec = vehicle as Record<string, unknown>;
            return (
              <option key={String(rec.id ?? rec.vehicle_id ?? index)} value={String(rec.id ?? rec.vehicle_id ?? '')}>
                {String(rec.label ?? rec.model ?? 'Vehicle')}
              </option>
            );
          })}
        </select>
      ) : null}

      {step === 3 ? (
        <div className="grid grid-cols-3 gap-2">
          {slots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => setSlotId(slot.id)}
              className={`h-10 rounded-md border text-sm ${
                slotId === slot.id ? 'border-brand bg-brand-soft font-semibold' : 'border-border'
              }`}
            >
              {slot.label}
            </button>
          ))}
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-2 rounded-md border border-border bg-surface p-4 text-sm">
          <p>Customer field · {selectedCustomer?.display_name ?? '—'} · {selectedCustomer?.masked_phone ?? '+91…'}</p>
          <p>Package field · {catalog.data?.offerings.find((row) => row.slug === slug)?.name ?? slug}</p>
          <p>Car field · {vehicles.length ? String((vehicles[0] as Record<string, unknown>).label ?? 'Saved car') : 'Saved vehicle'}</p>
        </div>
      ) : null}

      <div className="mt-6 flex gap-2">
        {step > 0 ? <SecondaryButton onClick={() => setStep((value) => value - 1)}>Back</SecondaryButton> : null}
        {step < 4 ? (
          <PrimaryButton
            disabled={(step === 0 && !customerId) || (step === 3 && !slotId)}
            onClick={() => setStep((value) => value + 1)}
          >
            Continue
          </PrimaryButton>
        ) : (
          <PrimaryButton disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Creating…' : 'Create JC-1045'}
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
