'use client';

import { useEffect, useId, useRef, useState } from 'react';

export type ConfirmReasonDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  minReasonLength?: number;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
};

export function ConfirmReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  minReasonLength = 10,
  onConfirm,
  onCancel,
}: ConfirmReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const descId = useId();
  const valid = reason.trim().length >= minReasonLength;

  useEffect(() => {
    if (!open) {
      setReason('');
      setBusy(false);
      setError(null);
      return;
    }
    const frame = window.requestAnimationFrame(() => textareaRef.current?.focus());
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
    };
  }, [busy, onCancel, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-strong/40 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-lg"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const root = event.currentTarget;
          const focusable = root.querySelectorAll<HTMLElement>(
            'button, textarea, [href], input, select, [tabindex]:not([tabindex="-1"])',
          );
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <h2 id={titleId} className="text-base font-bold text-strong">
          {title}
        </h2>
        {description ? (
          <p id={descId} className="mt-1 text-sm text-muted">
            {description}
          </p>
        ) : null}
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor={`${titleId}-reason`}>
          Reason
        </label>
        <textarea
          id={`${titleId}-reason`}
          ref={textareaRef}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && valid && !busy) {
              event.preventDefault();
              void submit();
            }
          }}
          rows={4}
          className="mt-1 w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-text outline-none ring-brand focus:ring-2"
        />
        <p className="mt-1 text-xs text-muted">{minReasonLength} characters minimum.</p>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="h-10 rounded-md px-3 text-sm font-semibold text-muted hover:bg-subtle"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="h-10 rounded-md bg-brand-strong px-3 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!valid || busy}
            onClick={() => void submit()}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : 'Could not confirm.');
    }
  }
}
