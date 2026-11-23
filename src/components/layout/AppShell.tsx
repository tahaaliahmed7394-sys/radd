import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  MoreHorizontal,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import { Logo } from '../Logo';
import { HeaderControls, LanguageToggle, ThemeToggle, NotificationsBell } from './HeaderControls';
import { useAppStore } from '../../store/app';
import { useSettingsStore } from '../../store/settings';
import { useUiStore } from '../../store/ui';
import { PageSkeleton } from '../Skeleton';
import { cn } from '../../utils/text';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
}

export function AppShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const presentation = useUiStore((state) => state.presentation);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const ready = useAppStore((state) => state.ready);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [sidebarOpen, setSidebarOpen]);

  if (presentation) {
    return (
      <div className="min-h-screen bg-bg">
        <main id="main-content">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-fg focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        {t('aria.skipToContent')}
      </a>

      <aside className="fixed inset-y-0 start-0 z-40 hidden w-72 flex-col border-e border-line bg-surface/95 backdrop-blur lg:flex">
        <div className="flex h-20 items-center border-b border-line px-5">
          <NavLink to="/simulation" className="rounded-xl" aria-label={t('brand.name')}>
            <Logo size={40} showName showTagline />
          </NavLink>
        </div>
        <BusinessPanel />
        <NavSections className="flex-1 overflow-y-auto px-3 py-4" />
        <SidebarFooter />
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between gap-2 border-b border-line bg-surface/95 px-3 backdrop-blur lg:hidden">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label={t('nav.openMenu')}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-surface2 hover:text-ink"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <NavLink to="/simulation" aria-label={t('brand.name')} className="truncate">
            <Logo size={32} showName />
          </NavLink>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle className="border-transparent" />
          <NotificationsBell />
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={t('nav.main')}>
          <div
            aria-hidden
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex h-full w-[min(20rem,88vw)] flex-col bg-surface shadow-lift">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Logo size={34} showName />
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label={t('nav.closeMenu')}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:bg-surface2 hover:text-ink"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <BusinessPanel />
            <NavSections className="flex-1 overflow-y-auto px-3 py-4" />
            <div className="border-t border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <LanguageToggle />
                <ThemeToggle />
                <NotificationsBell />
              </div>
              <p className="mt-3 text-center text-[11px] text-muted">{t('settings.madeIn')} · v1.0.0</p>
            </div>
          </div>
        </div>
      )}

      <div className="lg:ps-72">
        <div className="sticky top-0 z-30 hidden h-16 items-center justify-between gap-4 border-b border-line/70 bg-bg/85 px-6 backdrop-blur lg:flex">
          <p className="truncate text-xs font-semibold text-muted">{t('brand.tagline')}</p>
          <HeaderControls />
        </div>
        <main
          id="main-content"
          className="px-3 pb-24 pt-[4.5rem] sm:px-5 lg:px-8 lg:pb-10 lg:pt-6"
        >
          {ready ? <Outlet /> : <PageSkeleton />}
        </main>
      </div>

      <MobileNav onMore={() => setSidebarOpen(true)} />
    </div>
  );
}

function BusinessPanel() {
  const { t } = useTranslation();
  const businesses = useAppStore((state) => state.businesses);
  const activeBusinessId = useAppStore((state) => state.activeBusinessId);
  const setActiveBusiness = useAppStore((state) => state.setActiveBusiness);
  const language = useSettingsStore((state) => state.language);
  const serverOnline = useAppStore((state) => state.serverOnline);

  return (
    <div className="border-b border-line px-4 py-4">
      <label htmlFor="active-business" className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-muted">
        <span>{t('simulation.businessLabel')}</span>
        <span
          title={serverOnline ? 'API' : t('errors.serverOffline')}
          className={cn('h-2 w-2 rounded-full', serverOnline ? 'bg-success' : 'bg-warning')}
          aria-label={serverOnline ? 'API online' : t('errors.serverOffline')}
        />
      </label>
      {businesses.length === 0 ? (
        <p className="rounded-xl bg-surface2 px-3 py-2 text-xs text-muted">{t('business.noBusinessHint')}</p>
      ) : (
        <select
          id="active-business"
          value={activeBusinessId}
          onChange={(event) => setActiveBusiness(Number(event.target.value))}
          aria-label={t('aria.businessSelect')}
          className="field min-h-[44px] font-semibold"
        >
          {businesses.map((business) => (
            <option key={business.id} value={business.id}>
              {language === 'ar' ? business.name : business.nameEn || business.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function useNavItems(): { main: NavItem[]; manage: NavItem[] } {
  const { t } = useTranslation();
  const conversations = useAppStore((state) => state.conversations);
  const activeBusinessId = useAppStore((state) => state.activeBusinessId);
  const orders = useAppStore((state) => state.orders);
  const handoffs = conversations.filter(
    (c) => c.businessId === activeBusinessId && c.status === 'human',
  ).length;
  const newOrders = orders.filter((o) => o.businessId === activeBusinessId && o.status === 'new').length;

  return {
    main: [
      { to: '/simulation', label: t('nav.simulation'), icon: Sparkles },
      { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
      { to: '/conversations', label: t('nav.conversations'), icon: MessagesSquare, badge: handoffs },
      { to: '/appointments', label: t('nav.appointments'), icon: CalendarDays },
      { to: '/orders', label: t('nav.orders'), icon: ShoppingBag, badge: newOrders },
    ],
    manage: [
      { to: '/business', label: t('nav.business'), icon: Store },
      { to: '/admin', label: t('nav.admin'), icon: ShieldCheck },
      { to: '/settings', label: t('nav.settings'), icon: Settings },
    ],
  };
}

function NavSections({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { main, manage } = useNavItems();
  return (
    <nav aria-label={t('aria.primaryNav')} className={cn('space-y-5', className)}>
      <div>
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted">{t('nav.simulation')}</p>
        <div className="space-y-1">
          {main.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              <span className="flex-1 truncate">{item.label}</span>
              {Boolean(item.badge) && (
                <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>
      <div>
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted">{t('nav.settings')}</p>
        <div className="space-y-1">
          {manage.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              <span className="flex-1 truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

function navClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition',
    isActive
      ? 'bg-primary-soft text-primary-strong shadow-sm dark:text-primary'
      : 'text-muted hover:bg-surface2 hover:text-ink',
  );
}

function SidebarFooter() {
  const { t } = useTranslation();
  return (
    <div className="border-t border-line p-4">
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1 rounded-full bg-surface2 px-2 py-1 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {t('settings.madeIn')}
        </span>
        <span className="ms-auto tabular-nums">v1.0.0</span>
      </div>
    </div>
  );
}

function MobileNav({ onMore }: { onMore: () => void }) {
  const { t } = useTranslation();
  const { main } = useNavItems();
  const items = main.slice(0, 5);
  return (
    <nav
      aria-label={t('aria.mobileNav')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="grid grid-cols-6">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold transition',
                isActive ? 'text-primary-strong dark:text-primary' : 'text-muted',
              )
            }
          >
            <item.icon className="h-5 w-5" aria-hidden />
            <span className="truncate">{item.label}</span>
            {Boolean(item.badge) && (
              <span className="absolute end-1/4 top-2 h-1.5 w-1.5 rounded-full bg-danger" />
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onMore}
          className="flex min-h-[58px] flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold text-muted"
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden />
          <span>{t('common.more')}</span>
        </button>
      </div>
    </nav>
  );
}
