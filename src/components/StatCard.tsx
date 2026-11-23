import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../utils/text';

const TONES = {
  primary: 'bg-primary-soft text-primary-strong dark:text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  warning: 'bg-warning/12 text-warning',
  danger: 'bg-danger/12 text-danger',
  success: 'bg-success/12 text-success',
};

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'primary',
  className,
  action,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: keyof typeof TONES;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn('card p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-ink">{value}</p>
          {hint && <p className="mt-1 text-xs leading-snug text-muted">{hint}</p>}
        </div>
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
