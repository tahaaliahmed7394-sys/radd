import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  MessagesSquare,
  ShoppingBag,
  Timer,
  UserRound,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/ui/Controls';
import { AppointmentsBar, ConversationsArea, StatusPie } from '../components/dashboard/DashboardCharts';
import { useAppStore } from '../store/app';
import { useSettingsStore } from '../store/settings';
import { computeStats, type ActivityItem } from '../utils/stats';
import {
  formatDateLabel,
  formatInt,
  formatMoney,
  formatTimeLabel,
  timeAgoLabel,
} from '../utils/date';
import { cn } from '../utils/text';

export function Dashboard() {
  const { t } = useTranslation();
  const businesses = useAppStore((state) => state.businesses);
  const activeBusinessId = useAppStore((state) => state.activeBusinessId);
  const conversations = useAppStore((state) => state.conversations);
  const customers = useAppStore((state) => state.customers);
  const messages = useAppStore((state) => state.messages);
  const appointments = useAppStore((state) => state.appointments);
  const orders = useAppStore((state) => state.orders);
  const products = useAppStore((state) => state.products);
  const language = useSettingsStore((state) => state.language);
  const numerals = useSettingsStore((state) => state.numerals);

  const business = businesses.find((item) => item.id === activeBusinessId) ?? null;
  if (!business) {
    return (
      <div className="card">
        <EmptyState
          icon={<MessagesSquare className="h-6 w-6" aria-hidden />}
          title={t('business.noBusiness')}
          hint={t('business.noBusinessHint')}
          action={
            <Link to="/settings" className="inline-flex min-h-[44px] items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg">
              {t('nav.settings')}
            </Link>
          }
        />
      </div>
    );
  }

  const stats = computeStats(
    { businesses, products, customers, conversations, messages, appointments, orders },
    business.id,
    new Date(),
    language,
    numerals,
  );
  const businessName = language === 'ar' ? business.name : business.nameEn || business.name;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle', { business: businessName })}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-3 py-1 text-xs font-bold text-success">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-success" />
            {t('dashboard.live')}
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={MessagesSquare}
          label={t('dashboard.conversationsToday')}
          value={formatInt(stats.conversationsToday, numerals)}
          hint={t('dashboard.statConversationsHint')}
          action={
            <Link to="/conversations" className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline">
              {t('dashboard.viewConversations')}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        />
        <StatCard
          icon={CalendarCheck}
          label={t('dashboard.appointmentsBooked')}
          value={formatInt(stats.appointmentsUpcoming, numerals)}
          hint={t('dashboard.statAppointmentsHint')}
          tone="secondary"
          action={
            <Link to="/appointments" className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline">
              {t('dashboard.viewAppointments')}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        />
        <StatCard
          icon={ShoppingBag}
          label={t('dashboard.orders')}
          value={formatInt(stats.ordersCount, numerals)}
          hint={`${t('dashboard.statOrdersHint')} · ${formatMoney(stats.ordersRevenue, numerals, language)}`}
          tone="warning"
          action={
            <Link to="/orders" className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline">
              {t('dashboard.viewOrders')}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        />
        <StatCard
          icon={Timer}
          label={t('dashboard.avgResponse')}
          value={
            stats.avgResponseSeconds == null
              ? '—'
              : `${formatInt(stats.avgResponseSeconds, numerals)} ${t('dashboard.seconds')}`
          }
          hint={`${t('dashboard.statResponseHint')} · ${t('dashboard.responseHint')}`}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">{t('dashboard.conversationsWeek')}</h2>
            <span className="text-[11px] text-muted">{t('dashboard.liveHint')}</span>
          </div>
          <ConversationsArea data={stats.weeklyConversations} language={language} numerals={numerals} height={250} />
        </div>
        <div className="card p-4">
          <h2 className="text-sm font-bold text-ink">{t('dashboard.statusDistribution')}</h2>
          <div className="mt-2">
            {stats.statusCounts.bot + stats.statusCounts.human + stats.statusCounts.closed === 0 ? (
              <p className="py-10 text-center text-sm text-muted">{t('dashboard.noData')}</p>
            ) : (
              <StatusPie counts={stats.statusCounts} numerals={numerals} height={190} />
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">{t('dashboard.appointmentsWeek')}</h2>
            <CalendarDays className="h-4 w-4 text-muted" aria-hidden />
          </div>
          <AppointmentsBar data={stats.weeklyAppointments} language={language} numerals={numerals} height={215} />
        </div>

        <div className="card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-sm font-bold text-ink">{t('dashboard.recentActivity')}</h2>
            <Link to="/conversations" className="text-xs font-bold text-secondary hover:underline">
              {t('common.viewAll')}
            </Link>
          </div>
          {stats.recent.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">{t('dashboard.noActivity')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {stats.recent.slice(0, 6).map((item) => (
                <ActivityRow key={item.id} item={item} language={language} numerals={numerals} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const ACTIVITY_ICON = {
  order: ShoppingBag,
  appointment: CalendarCheck,
  handoff: UserRound,
};

const ACTIVITY_TONE = {
  order: 'bg-secondary/10 text-secondary',
  appointment: 'bg-primary-soft text-primary-strong dark:text-primary',
  handoff: 'bg-warning/12 text-warning',
};

const ACTIVITY_ROUTE = {
  order: '/orders',
  appointment: '/appointments',
  handoff: '/conversations',
};

function ActivityRow({
  item,
  language,
  numerals,
}: {
  item: ActivityItem;
  language: 'ar' | 'en';
  numerals: 'western' | 'eastern';
}) {
  const { t } = useTranslation();
  const Icon = ACTIVITY_ICON[item.kind];
  const text =
    item.kind === 'order'
      ? t('dashboard.newOrderFrom', { name: item.customerName })
      : item.kind === 'appointment'
        ? t('dashboard.newAppointmentFor', { name: item.customerName })
        : t('dashboard.handoffFrom', { name: item.customerName });
  const detail =
    item.kind === 'order'
      ? formatMoney(item.amount ?? 0, numerals, language)
      : item.kind === 'appointment' && item.date
        ? `${formatDateLabel(new Date(`${item.date}T12:00:00`), language, numerals, { day: 'numeric', month: 'short' })} · ${formatTimeLabel(item.time ?? '00:00', language, numerals)}`
        : '';
  return (
    <li>
      <Link to={ACTIVITY_ROUTE[item.kind]} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface2">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', ACTIVITY_TONE[item.kind])}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-ink">{text}</span>
          <span className="mt-0.5 block text-[11px] text-muted">
            {detail ? `${detail} · ` : ''}
            {timeAgoLabel(item.at, language, numerals)}
          </span>
        </span>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      </Link>
    </li>
  );
}
