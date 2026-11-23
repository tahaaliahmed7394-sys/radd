import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CalendarCheck, CheckCircle2, ShoppingBag, UserRound, X, XCircle } from 'lucide-react';
import { useToastStore, type ToastItem } from '../../store/toasts';
import { cn } from '../../utils/text';

const ICONS = {
  order: ShoppingBag,
  appointment: CalendarCheck,
  handoff: UserRound,
  success: CheckCircle2,
  error: XCircle,
};

const ROUTES: Partial<Record<ToastItem['kind'], string>> = {
  order: '/orders',
  appointment: '/appointments',
  handoff: '/conversations',
};

const TONE = {
  order: 'text-secondary bg-secondary/10',
  appointment: 'text-primary-strong bg-primary-soft dark:text-primary',
  handoff: 'text-warning bg-warning/12',
  success: 'text-success bg-success/12',
  error: 'text-danger bg-danger/12',
};

function ToastCard({ toast }: { toast: ToastItem }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dismiss = useToastStore((state) => state.dismiss);
  const Icon = ICONS[toast.kind];
  const route = ROUTES[toast.kind];

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), 6000);
    return () => clearTimeout(timer);
  }, [dismiss, toast.id]);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      role="alert"
      className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-line bg-surface p-3 shadow-lift"
    >
      <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', TONE[toast.kind])}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">{toast.title}</p>
        {toast.body && <p className="mt-0.5 break-words text-xs leading-relaxed text-muted">{toast.body}</p>}
        {route && (
          <button
            type="button"
            onClick={() => {
              dismiss(toast.id);
              navigate(route);
            }}
            className="mt-1 inline-flex min-h-[32px] items-center gap-1 text-xs font-bold text-secondary hover:underline"
          >
            {t('toasts.view')}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label={t('toasts.dismiss')}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface2 hover:text-ink"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </motion.li>
  );
}

export function Toaster() {
  const { t } = useTranslation();
  const toasts = useToastStore((state) => state.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 end-4 z-[95] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    >
      <span className="sr-only">
        <Bell aria-hidden /> {t('notifications.title')}
      </span>
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
