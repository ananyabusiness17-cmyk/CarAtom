'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DispatchLaneVisit, DispatchUnassignedJob } from '@caratom/contracts';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';

import { Banner, PageHeader, PrimaryButton, SecondaryButton } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { newIdempotencyKey } from '@/lib/idempotency';
import { problemMessage } from '@/lib/problem';
import { adminKeys } from '@/lib/query-keys';
import { visitsOverlap } from '@/lib/visit-overlap';

type View = 'lanes' | 'grid' | 'map';
type DragJob = { job_card_id: string; start?: string; end?: string };

export default function DispatchPage() {
  const client = useQueryClient();
  const [view, setView] = useState<View>('lanes');
  const [banner, setBanner] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [massTech, setMassTech] = useState('');
  const query = useQuery({
    queryKey: adminKeys.dispatch,
    queryFn: () => apiClient.getDispatchBoard(),
  });

  const assign = useMutation({
    mutationFn: (input: { jobCardId: string; technicianId: string }) =>
      apiClient.assignJob(input.jobCardId, { technician_id: input.technicianId }, newIdempotencyKey()),
    onSuccess: (data) => {
      const warn = data.warnings?.[0];
      setBanner(warn ? `Assigned · ${warn}` : 'Assigned');
      void client.invalidateQueries({ queryKey: adminKeys.dispatch });
    },
    onError: (err) => setBanner(problemMessage(err)),
  });

  const mass = useMutation({
    mutationFn: () => apiClient.massAssignJobs(massTech, [...selected]),
    onSuccess: (result) => {
      setBanner(
        result.failed.length
          ? `Assigned ${result.assigned.length}. ${result.failed.length} blocked (overlap or duty).`
          : `Assigned ${result.assigned.length} visits.`,
      );
      setSelected(new Set());
      void client.invalidateQueries({ queryKey: adminKeys.dispatch });
    },
    onError: (err) => setBanner(problemMessage(err)),
  });

  const techs = useMemo(() => {
    const rows = query.data?.technicians ?? [];
    return [...rows].sort((a, b) => {
      if (a.duty_status !== b.duty_status) return a.duty_status === 'ON_DUTY' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [query.data]);

  const unassigned = query.data?.unassigned_jobs ?? [];

  function previewConflict(job: DragJob, technicianId: string): boolean {
    const tech = techs.find((row) => row.id === technicianId);
    if (!tech?.assigned_visits?.length) return false;
    return tech.assigned_visits.some((visit) =>
      visitsOverlap(job.start, job.end, visit.scheduled_start_at, visit.scheduled_end_at),
    );
  }

  function onDrop(technicianId: string, job: DragJob) {
    const tech = techs.find((row) => row.id === technicianId);
    if (tech?.duty_status !== 'ON_DUTY') {
      setBanner('Choose an on-duty technician.');
      return;
    }
    if (previewConflict(job, technicianId)) {
      setBanner('That drop overlaps another visit on this technician.');
      return;
    }
    assign.mutate({ jobCardId: job.job_card_id, technicianId });
  }

  return (
    <div>
      <PageHeader
        title="Dispatch"
        subtitle="Assign vans · slot holds stay the booking truth"
        actions={
          <div className="flex gap-1">
            {(['lanes', 'grid', 'map'] as View[]).map((item) => (
              <SecondaryButton
                key={item}
                className={view === item ? 'bg-brand-soft' : ''}
                onClick={() => setView(item)}
              >
                {item === 'lanes' ? 'Lanes' : item === 'grid' ? 'Day grid' : 'Map'}
              </SecondaryButton>
            ))}
          </div>
        }
      />
      {banner ? <Banner tone={banner.startsWith('Assigned') ? 'ok' : 'danger'}>{banner}</Banner> : null}
      {query.isError ? <Banner>{problemMessage(query.error)}</Banner> : null}
      {query.isLoading ? <p className="text-sm text-muted">Loading board…</p> : null}

      {view === 'lanes' ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          <Lane
            title="Unassigned"
            subtitle={`${unassigned.length} waiting`}
          >
            {unassigned.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted">No unassigned visits.</p>
            ) : (
              unassigned.map((job) => (
                <VisitCard
                  key={job.visit_id}
                  job={job}
                  selectable
                  selected={selected.has(job.job_card_id)}
                  onSelect={(checked) => {
                    setSelected((current) => {
                      const next = new Set(current);
                      if (checked) next.add(job.job_card_id);
                      else next.delete(job.job_card_id);
                      return next;
                    });
                  }}
                />
              ))
            )}
          </Lane>
          {techs.map((tech) => (
            <Lane
              key={tech.id}
              title={tech.name}
              subtitle={`${tech.duty_status === 'ON_DUTY' ? 'On duty' : 'Off duty'} · ${tech.van_label ?? 'No van'} · ${tech.last_ping_label ?? 'no ping'}`}
              onDropJob={(job) => onDrop(tech.id, job)}
            >
              {(tech.assigned_visits ?? []).length === 0 ? (
                <p className="px-3 py-6 text-sm text-muted">Empty lane</p>
              ) : (
                (tech.assigned_visits ?? []).map((visit) => (
                  <VisitCard key={visit.visit_id} job={visit} />
                ))
              )}
            </Lane>
          ))}
        </div>
      ) : null}

      {view === 'grid' ? <DayGrid techs={techs} unassigned={unassigned} /> : null}
      {view === 'map' ? <StaticMap techs={techs} unassigned={unassigned} /> : null}

      {selected.size > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface p-3">
          <p className="text-sm font-semibold">{selected.size} selected</p>
          <select
            className="h-11 rounded-md border border-border px-3 text-sm"
            value={massTech}
            onChange={(event) => setMassTech(event.target.value)}
            aria-label="Technician for mass assign"
          >
            <option value="">Choose technician</option>
            {techs
              .filter((row) => row.duty_status === 'ON_DUTY')
              .map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
          </select>
          <PrimaryButton
            disabled={!massTech || mass.isPending}
            onClick={() => mass.mutate()}
          >
            Assign selected
          </PrimaryButton>
        </div>
      ) : null}
    </div>
  );
}

function Lane({
  title,
  subtitle,
  children,
  onDropJob,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onDropJob?: (job: DragJob) => void;
}) {
  return (
    <section
      className="flex w-[260px] shrink-0 flex-col rounded-md border border-border bg-surface"
      onDragOver={(event) => {
        if (onDropJob) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        const raw = event.dataTransfer.getData('application/json');
        if (!raw || !onDropJob) return;
        onDropJob(JSON.parse(raw) as DragJob);
      }}
    >
      <header className="border-b border-border px-3 py-2">
        <p className="text-sm font-bold text-strong">{title}</p>
        <p className="text-xs text-muted">{subtitle}</p>
      </header>
      <div className="flex flex-1 flex-col gap-2 p-2">{children}</div>
    </section>
  );
}

function VisitCard({
  job,
  selectable,
  selected,
  onSelect,
}: {
  job: DispatchUnassignedJob | DispatchLaneVisit;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
}) {
  const start = 'scheduled_start_at' in job ? job.scheduled_start_at : undefined;
  const end = 'scheduled_end_at' in job ? job.scheduled_end_at : undefined;
  const payload: DragJob = { job_card_id: job.job_card_id, start, end };
  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('application/json', JSON.stringify(payload));
      }}
      className="rounded-md border border-border bg-canvas px-2 py-2 text-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/jobs/${job.job_card_id}`} className="font-semibold text-brand-strong">
          {job.job_card_ref}
        </Link>
        {selectable ? (
          <input
            type="checkbox"
            checked={Boolean(selected)}
            onChange={(event) => onSelect?.(event.target.checked)}
            aria-label={`Select ${job.job_card_ref}`}
          />
        ) : null}
      </div>
      <p className="text-text">{job.vehicle_label}</p>
      <p className="text-xs text-muted">{job.visit_window_label ?? 'Window unset'}</p>
    </article>
  );
}

function DayGrid({
  techs,
  unassigned,
}: {
  techs: Awaited<ReturnType<typeof apiClient.getDispatchBoard>>['technicians'];
  unassigned: DispatchUnassignedJob[];
}) {
  const hours = [8, 10, 12, 14, 16, 18];
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-subtle text-muted">
          <tr>
            <th className="h-11 px-3 font-medium">Tech</th>
            {hours.map((hour) => (
              <th key={hour} className="h-11 px-3 font-medium">
                {String(hour).padStart(2, '0')}:00
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-border">
            <td className="px-3 py-2 font-semibold">Unassigned</td>
            {hours.map((hour) => (
              <td key={hour} className="px-3 py-2 align-top">
                {unassigned
                  .filter((job) => hourFor(job.scheduled_start_at) === hour)
                  .map((job) => (
                    <Link key={job.visit_id} href={`/jobs/${job.job_card_id}`} className="block text-brand-strong">
                      {job.job_card_ref}
                    </Link>
                  ))}
              </td>
            ))}
          </tr>
          {techs.map((tech) => (
            <tr key={tech.id} className="border-t border-border">
              <td className="px-3 py-2 font-semibold">{tech.name}</td>
              {hours.map((hour) => (
                <td key={hour} className="px-3 py-2 align-top">
                  {(tech.assigned_visits ?? [])
                    .filter((visit) => hourFor(visit.scheduled_start_at) === hour)
                    .map((visit) => (
                      <Link key={visit.visit_id} href={`/jobs/${visit.job_card_id}`} className="block text-brand-strong">
                        {visit.job_card_ref}
                      </Link>
                    ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function hourFor(value?: string): number | null {
  if (!value) return null;
  const match = value.match(/T(\d{2}):/);
  const hour = match ? Number(match[1]) : new Date(value).getHours();
  if (hour < 9) return 8;
  if (hour < 11) return 10;
  if (hour < 13) return 12;
  if (hour < 15) return 14;
  if (hour < 17) return 16;
  return 18;
}

function StaticMap({
  techs,
  unassigned,
}: {
  techs: Awaited<ReturnType<typeof apiClient.getDispatchBoard>>['technicians'];
  unassigned: DispatchUnassignedJob[];
}) {
  const pins = [
    ...unassigned.map((job) => ({
      id: job.visit_id,
      ref: job.job_card_ref,
      jobId: job.job_card_id,
      lat: job.latitude,
      lng: job.longitude,
      label: 'Unassigned',
    })),
    ...techs.flatMap((tech) =>
      (tech.assigned_visits ?? []).map((visit) => ({
        id: visit.visit_id,
        ref: visit.job_card_ref,
        jobId: visit.job_card_id,
        lat: visit.latitude,
        lng: visit.longitude,
        label: tech.name,
      })),
    ),
  ].filter((pin) => pin.lat != null && pin.lng != null);
  if (!pins.length) {
    return <p className="text-sm text-muted">No job coordinates on today’s visits. Pins appear when the booking address has lat/lng.</p>;
  }
  const lats = pins.map((pin) => pin.lat as number);
  const lngs = pins.map((pin) => pin.lng as number);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = Math.max(maxLat - minLat, 0.01);
  const spanLng = Math.max(maxLng - minLng, 0.01);
  return (
    <div>
      <div className="relative h-80 overflow-hidden rounded-md border border-border bg-subtle" role="img" aria-label="Job locations">
        {pins.map((pin) => {
          const x = ((pin.lng as number) - minLng) / spanLng;
          const y = 1 - ((pin.lat as number) - minLat) / spanLat;
          return (
            <Link
              key={pin.id}
              href={`/jobs/${pin.jobId}`}
              aria-label={`${pin.ref} · ${pin.label}`}
              className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ left: `${8 + x * 84}%`, top: `${8 + y * 84}%` }}
              title={`${pin.ref} · ${pin.label}`}
            >
              <span className="h-3 w-3 rounded-full bg-brand-strong" />
            </Link>
          );
        })}
      </div>
      <ul className="mt-3 grid gap-1 text-sm">
        {pins.map((pin) => (
          <li key={pin.id}>
            <Link href={`/jobs/${pin.jobId}`} className="text-brand-strong">
              {pin.ref}
            </Link>
            <span className="text-muted"> · {pin.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
