import type { InputHTMLAttributes, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/text';
import { Modal as ModalShell } from './Modal';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'secondary';

const tones: Record<BadgeTone, string> = {
  primary: 'bg-primary-soft text-primary-strong dark:text-primary',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/12 text-warning',
  danger: 'bg-danger/12 text-danger',
  neutral: 'bg-surface2 text-muted',
  secondary: 'bg-secondary/10 text-secondary',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn('chip', tones[tone], className)}>{children}</span>;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

export interface SwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
  id?: string;
}

export function Switch({ checked, onChange, label, hint, id }: SwitchProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-7 w-12 shrink-0 rounded-full border transition',
          checked
            ? 'border-primary bg-primary'
            : 'border-line bg-surface2',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition-all',
            checked ? 'start-[26px]' : 'start-1',
          )}
        />
      </button>
    </div>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface2 p-1',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition',
              size === 'sm' ? 'min-h-[34px] px-2.5 text-xs' : 'min-h-[40px] px-3 text-sm',
              active
                ? 'bg-surface text-ink shadow-sm ring-1 ring-line'
                : 'text-muted hover:text-ink',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('field', className)} {...props} />;
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
  compact = false,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 text-center',
        compact ? 'py-8' : 'py-14',
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong dark:text-primary">
        {icon}
      </div>
      <p className="text-base font-bold text-ink">{title}</p>
      {hint && <p className="mt-1.5 max-w-sm text-sm text-muted">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'danger',
  onConfirm,
  onClose,
  children,
  confirmDisabled,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
  confirmDisabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div>
      {open && (
        <div className="fixed inset-0 z-[80]" aria-hidden={!open} />
      )}
      <ModalShell
        open={open}
        title={title}
        onClose={onClose}
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-surface2"
            >
              {cancelLabel ?? t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={confirmDisabled}
              onClick={onConfirm}
              className={cn(
                'min-h-[44px] rounded-xl px-4 text-sm font-semibold transition disabled:opacity-50',
                tone === 'danger'
                  ? 'bg-danger text-white hover:brightness-95'
                  : 'bg-primary text-primary-fg hover:brightness-95',
              )}
            >
              {confirmLabel ?? t('common.confirm')}
            </button>
          </>
        }
      >
        {description && <p className="text-sm leading-relaxed text-muted">{description}</p>}
        {children}
      </ModalShell>
    </div>
  );
}
