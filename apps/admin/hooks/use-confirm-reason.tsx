'use client';

import { useState } from 'react';

import { ConfirmReasonDialog } from '../components/confirm-reason-dialog';

export function useConfirmReason() {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    description?: string;
    confirmLabel: string;
    onConfirm: (reason: string) => Promise<void>;
  } | null>(null);

  function ask(next: NonNullable<typeof config>) {
    setConfig(next);
    setOpen(true);
  }

  const dialog = config ? (
    <ConfirmReasonDialog
      open={open}
      title={config.title}
      description={config.description}
      confirmLabel={config.confirmLabel}
      onCancel={() => setOpen(false)}
      onConfirm={async (reason) => {
        await config.onConfirm(reason);
        setOpen(false);
      }}
    />
  ) : null;

  return { ask, dialog };
}
