import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-strong">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Banner({
  tone = 'danger',
  children,
}: {
  tone?: 'danger' | 'ok' | 'muted';
  children: ReactNode;
}) {
  const cls =
    tone === 'ok'
      ? 'bg-success-soft text-success'
      : tone === 'muted'
        ? 'bg-subtle text-muted'
        : 'bg-danger-soft text-danger';
  return <p className={`mb-4 rounded-md px-3 py-2 text-sm ${cls}`}>{children}</p>;
}

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { children, className, type, ...rest } = props;
  return (
    <button
      type={type ?? 'button'}
      {...rest}
      className={`h-10 rounded-md bg-brand-strong px-3 text-sm font-semibold text-white disabled:opacity-50 ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { children, className, type, ...rest } = props;
  return (
    <button
      type={type ?? 'button'}
      {...rest}
      className={`h-10 rounded-md border border-brand-strong px-3 text-sm font-semibold text-brand-strong disabled:opacity-50 ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

export function GhostButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { children, className, type, ...rest } = props;
  return (
    <button
      type={type ?? 'button'}
      {...rest}
      className={`h-10 rounded-md px-3 text-sm font-semibold text-muted hover:bg-subtle disabled:opacity-50 ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

export function TextField(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, id, name, className, ...rest } = props;
  const fieldId = id ?? name;
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <input
        {...rest}
        id={fieldId}
        name={name}
        className={`h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text outline-none ring-brand focus:ring-2 ${className ?? ''}`}
      />
    </label>
  );
}

export function TextAreaField(
  props: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string },
) {
  const { label, className, ...rest } = props;
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      <textarea
        {...rest}
        className={`w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none ring-brand focus:ring-2 ${className ?? ''}`}
      />
    </label>
  );
}
