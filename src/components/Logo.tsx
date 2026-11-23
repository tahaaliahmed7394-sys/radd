import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/text';

export function Logo({
  size = 36,
  showName = false,
  showTagline = false,
  className,
}: {
  size?: number;
  showName?: boolean;
  showTagline?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const id = useId().replace(/:/g, '');
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role="img"
        aria-label={t('aria.logo')}
        className="shrink-0 drop-shadow-sm"
      >
        <defs>
          <linearGradient id={`radd-g-${id}`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#10B981" />
            <stop offset="0.65" stopColor="#047857" />
            <stop offset="1" stopColor="#1E3A8A" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill={`url(#radd-g-${id})`} />
        <path
          d="M15 24a9 9 0 0 1 9-9h16a9 9 0 0 1 9 9v9a9 9 0 0 1-9 9h-9.6L21 49v-7.6A9 9 0 0 1 15 33z"
          fill="#fff"
          fillOpacity="0.96"
        />
        <path
          d="M25 28.5h14M25 34h9"
          stroke="#047857"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      </svg>
      {showName && (
        <span className="min-w-0">
          <span className="block text-lg font-extrabold leading-tight text-ink">{t('brand.name')}</span>
          {showTagline && (
            <span className="block truncate text-[11px] font-medium leading-tight text-muted">
              {t('brand.tagline')}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
