import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellRing,
  CalendarCheck,
  CheckCheck,
  Globe2,
  Moon,
  Monitor,
  ShoppingBag,
  Sun,
  UserRound,
  X,
} from 'lucide-react';
import { useSettingsStore } from '../../store/settings';
import { useNotificationStore } from '../../store/notifications';
import type { ThemeMode } from '../../data/types';
import { timeAgoLabel } from '../../utils/date';
import { cn } from '../../utils/text';

const THEME_ORDER: ThemeMode[] = ['light', 'dark', 'system'];
const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor };

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const Icon = THEME_ICONS[theme];
  const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`${t('aria.theme')}: ${t(`theme.${theme}`)}`}
      title={`${t('theme.label')}: ${t(`theme.${theme}`)}`}
      className={cn(
        'inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-muted transition hover:bg-surface2 hover:text-ink',
        className,
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}

export function LanguageToggle({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const next = language === 'ar' ? 'en' : 'ar';
  return (
    <button
      type="button"
      onClick={() => {
        setLanguage(next);
        void i18n.changeLanguage(next);
      }}
      aria-label={`${t('aria.language')} → ${t(`language.${next}`)}`}
      title={t(`language.${next}`)}
      className={cn(
        'inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-2.5 text-xs font-extrabold text-muted transition hover:bg-surface2 hover:text-ink',
        className,
      )}
    >
      <Globe2 className="h-4 w-4" aria-hidden />
      <span>{next === 'ar' ? 'ع' : 'EN'}</span>
    </button>
  );
}

const KIND_ICON = {
  order: ShoppingBag,
  appointment: CalendarCheck,
  handoff: UserRound,
};

export function NotificationsBell({ className }: { className?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const items = useNotificationStore((state) => state.items);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const clear = useNotificationStore((state) => state.clear);
  const language = useSettingsStore((state) => state.language);
  const numerals = useSettingsStore((state) => state.numerals);
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const unread = items.filter((item) => !item.read).length;

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapper} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t('aria.notifications')}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-muted transition hover:bg-surface2 hover:text-ink"
      >
        {unread > 0 ? <BellRing className="h-5 w-5" aria-hidden /> : <Bell className="h-5 w-5" aria-hidden />}
        {unread > 0 && (
          <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t('notifications.title')}
          className="absolute end-0 z-[75] mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-lift animate-fade-up"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-bold text-ink">{t('notifications.title')}</p>
              {unread > 0 && (
                <p className="text-xs text-muted">{t('notifications.unreadCount', { count: unread })}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('notifications.close')}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface2 hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">{t('notifications.empty')}</p>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((item) => {
                  const Icon = KIND_ICON[item.kind];
                  return (
                    <li key={item.id} className={cn('flex gap-3 px-4 py-3', !item.read && 'bg-primary-soft/40')}>
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-strong dark:text-primary">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink">{t(item.titleKey)}</p>
                        <p className="mt-0.5 break-words text-xs leading-relaxed text-muted">{item.body}</p>
                        <p className="mt-1 text-[11px] text-muted/80">
                          {timeAgoLabel(item.at, language, numerals)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
            <button
              type="button"
              onClick={markAllRead}
              disabled={unread === 0}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-secondary disabled:opacity-45"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              {t('notifications.markAll')}
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={items.length === 0}
              className="inline-flex min-h-[36px] items-center rounded-lg px-2 text-xs font-semibold text-muted hover:text-danger disabled:opacity-45"
            >
              {t('notifications.clear')}
            </button>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                markAllRead();
                navigate('/dashboard');
              }}
              className="flex min-h-[42px] w-full items-center justify-center gap-1 border-t border-line bg-surface2/60 text-xs font-bold text-ink hover:bg-surface2"
            >
              <CheckCheck className="h-4 w-4" aria-hidden />
              {t('notifications.viewAll')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function HeaderControls({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LanguageToggle />
      <ThemeToggle />
      <NotificationsBell />
    </div>
  );
}
