'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useToast } from '@/components/toast';
import { Banner, PageHeader, PrimaryButton, TextField } from '@/components/ui';
import { apiClient } from '@/lib/admin-api';
import { problemMessage } from '@/lib/problem';

export default function NewTechnicianPage() {
  const router = useRouter();
  const toast = useToast();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('+91');
  const [van, setVan] = useState('VAN_A');
  const [skills, setSkills] = useState('AC, electrics');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      apiClient.createAdminTechnician({
        display_name: displayName,
        phone_e164: phone,
        van_code: van,
        skills: skills.split(',').map((item) => item.trim()).filter(Boolean),
      }),
    onSuccess: (data) => {
      toast.push(`Created ${data.display_name}`);
      router.push(`/technicians/${data.id}`);
    },
    onError: (err) => setError(problemMessage(err)),
  });

  return (
    <div className="max-w-lg">
      <PageHeader title="Create technician" />
      {error ? <Banner>{error}</Banner> : null}
      <div className="space-y-4">
        <TextField label="Name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        <TextField label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <TextField label="Van code" value={van} onChange={(event) => setVan(event.target.value)} />
        <TextField label="Skills" value={skills} onChange={(event) => setSkills(event.target.value)} />
        <PrimaryButton disabled={mutation.isPending || displayName.length < 2} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Creating…' : 'Create technician'}
        </PrimaryButton>
      </div>
    </div>
  );
}
