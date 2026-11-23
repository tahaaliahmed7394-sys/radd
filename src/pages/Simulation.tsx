import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarCheck,
  Gauge,
  MessageCircle,
  Pause,
  Play,
  Presentation,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Timer,
  X,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ScenarioPicker } from '../components/simulation/ScenarioPicker';
import { PhoneSimulator } from '../components/simulation/PhoneSimulator';
import { RoleSwitch } from '../components/layout/RoleSwitch';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/ui/Button';
import { MiniTrend } from '../components/dashboard/DashboardCharts';
import { useAppStore } from '../store/app';
import { useSettingsStore } from '../store/settings';
import { useSimStore } from '../store/sim';
import { useUiStore } from '../store/ui';
import { runtime } from '../simulation/runtime';
import { pushToast } from '../store/notifications';
import { computeStats } from '../utils/stats';
import { formatInt, formatTimeLabel, isBusinessOpenAt } from '../utils/date';
import { cn } from '../utils/text';

export function Simulation() {
  const { t } = useTranslation();
  const presentation = useUiStore((state) => state.presentation);
  const setPresentation = useUiStore((state) => state.setPresentation);
  const setRole = useUiStore((state) => state.setRole);
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
  const speed = useSettingsStore((state) => state.simulationSpeed);
  const setSpeed = useSettingsStore((state) => state.setSimulationSpeed);
  const running = useSimStore((state) => state.running);
  const paused = useSimStore((state) => state.paused);
  const clockIso = useSimStore((state) => state.clockIso);
  const simConversationId = useSimStore((state) => state.activeConversationId);

  const business = businesses.find((item) => item.id === activeBusinessId) ?? null;
  const clock = new Date(clockIso);
  const isOpen = business ? isBusinessOpenAt(business.hours, clock) : false;
  const stats = computeStats(
    { businesses, products, customers, conversations, messages, appointments, orders },
    activeBusinessId,
    clock,
    language,
    numerals,
  );
  const businessConversations = conversations
    .filter((conversation) => conversation.businessId === activeBusinessId)
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const lastMessage = (conversationId: number) => {
    const list = messages.filter((message) => message.conversationId === conversationId);
    return list[list.length - 1];
  };

  const startNewChat = () => {
    const id = runtime.newChat();
    if (id) pushToast('success', t('simulation.newChatStarted'));
  };

  if (presentation) {
    return (
      <div className="min-h-screen bg-bg px-3 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary-strong dark:text-primary">
                {t('simulation.presentation')}
              </p>
              <h1 className="text-xl font-extrabold text-ink">
                {business ? (language === 'ar' ? business.name : business.nameEn || business.name) : t('brand.name')}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setPresentation(false)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink hover:bg-surface2"
            >
              <X className="h-4 w-4" aria-hidden />
              {t('simulation.exitPresentation')}
            </button>
          </div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <RoleSwitch size="md" />
            <span className="rounded-full bg-surface2 px-3 py-1 text-xs font-bold text-muted">
              {t('simulation.simClock')}: {formatTimeLabel(
                `${String(clock.getHours()).padStart(2, '0')}:${String(clock.getMinutes()).padStart(2, '0')}`,
                language,
                numerals,
              )}
            </span>
          </div>
          <div className="mb-5">
            <ScenarioPicker compact />
          </div>
          <PhoneSimulator />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <PageHeader
        title={t('simulation.title')}
        subtitle={t('simulation.subtitle')}
        actions={
          <>
            <Button variant="outline" size="sm" leadingIcon={<RotateCcw className="h-4 w-4" aria-hidden />} onClick={startNewChat}>
              {t('simulation.reset')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<Presentation className="h-4 w-4" aria-hidden />}
              onClick={() => setPresentation(true)}
            >
              {t('simulation.presentation')}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_330px]">
        <div className="order-2 space-y-4 xl:order-1">
          {business && (
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <Avatar name={language === 'ar' ? business.name : business.nameEn || business.name} size="lg" accent={business.accent} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">
                    {language === 'ar' ? business.name : business.nameEn || business.name}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {language === 'ar' ? business.address : business.addressEn || business.address}
                  </p>
                  <span
                    className={cn(
                      'mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
                      isOpen ? 'bg-success/12 text-success' : 'bg-warning/12 text-warning',
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', isOpen ? 'bg-success' : 'bg-warning')} />
                    {isOpen ? t('status.openNow') : t('status.closedNow')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
                <Gauge className="h-4 w-4 text-muted" aria-hidden />
                {t('simulation.speed')}
              </p>
              <span className="rounded-lg bg-surface2 px-2 py-0.5 text-xs font-bold text-ink">
                {t('simulation.speedValue', { value: speed })}
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.5}
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
              aria-label={t('aria.speedSlider')}
              className="range"
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                leadingIcon={
                  paused || (!running && paused) ? (
                    <Play className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Pause className="h-3.5 w-3.5" aria-hidden />
                  )
                }
                onClick={() => (paused ? runtime.resume() : runtime.pause())}
                disabled={!running && !paused}
              >
                {paused ? t('common.resume') : t('common.pause')}
              </Button>
              <Button variant="ghost" size="sm" onClick={startNewChat} leadingIcon={<Sparkles className="h-3.5 w-3.5" aria-hidden />}>
                {t('simulation.openNewChat')}
              </Button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">{t('simulation.speedValue', { value: speed })} · {t('simulation.simClock')}: {formatTimeLabel(
              `${String(clock.getHours()).padStart(2, '0')}:${String(clock.getMinutes()).padStart(2, '0')}`,
              language,
              numerals,
            )}</p>
          </div>

          <ScenarioPicker />
        </div>

        <div className="order-1 xl:order-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <RoleSwitch />
            <p className="text-xs text-muted">
              {running ? t('simulation.running') : t('simulation.idle')}
            </p>
          </div>
          <PhoneSimulator />
        </div>

        <div className="order-3 space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-ink">{t('dashboard.live')}</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-bold text-success">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-success" />
                {t('dashboard.live')}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniStat icon={MessageCircle} label={t('dashboard.conversationsToday')} value={formatInt(stats.conversationsToday, numerals)} />
              <MiniStat icon={CalendarCheck} label={t('dashboard.appointmentsBooked')} value={formatInt(stats.appointmentsUpcoming, numerals)} />
              <MiniStat icon={ShoppingBag} label={t('dashboard.orders')} value={formatInt(stats.ordersCount, numerals)} />
              <MiniStat
                icon={Timer}
                label={t('dashboard.avgResponse')}
                value={stats.avgResponseSeconds == null ? '—' : `${formatInt(stats.avgResponseSeconds, numerals)} ${t('dashboard.seconds')}`}
              />
            </div>
            <div className="mt-2">
              <MiniTrend data={stats.weeklyConversations} height={96} />
            </div>
            <p className="text-[11px] text-muted">{t('dashboard.liveHint')}</p>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-bold text-ink">{t('simulation.conversationList')}</p>
              <Link to="/conversations" className="inline-flex items-center gap-0.5 text-xs font-bold text-secondary hover:underline">
                {t('common.viewAll')}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            {businessConversations.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted">{t('simulation.emptyOwner')}</p>
            ) : (
              <ul className="max-h-[19rem] divide-y divide-line overflow-y-auto">
                {businessConversations.slice(0, 8).map((conversation) => {
                  const customer = customers.find((item) => item.id === conversation.customerId);
                  const last = lastMessage(conversation.id);
                  const active = conversation.id === simConversationId;
                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => {
                          runtime.selectConversation(conversation.id);
                          setRole('owner');
                        }}
                        className={cn(
                          'flex w-full items-center gap-2.5 px-3 py-2.5 text-start transition hover:bg-surface2',
                          active && 'bg-primary-soft/50',
                        )}
                      >
                        <Avatar name={customer?.name ?? '—'} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs font-bold text-ink">{customer?.name ?? '—'}</span>
                            <span
                              className={cn(
                                'h-2 w-2 shrink-0 rounded-full',
                                conversation.status === 'human'
                                  ? 'bg-warning'
                                  : conversation.status === 'closed'
                                    ? 'bg-slate-400'
                                    : 'bg-success',
                              )}
                              aria-label={t(`status.${conversation.status}`)}
                            />
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted">
                            {last?.text ?? t('conversations.noMessages')}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="card border-primary/20 bg-primary-soft/30 p-4">
            <p className="text-xs font-bold text-ink">{t('simulation.chatInfo')}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">{t('business.dataUsedByBot')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MessageCircle;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-surface2/70 p-2.5">
      <Icon className="h-3.5 w-3.5 text-muted" aria-hidden />
      <p className="mt-1 text-base font-extrabold tabular-nums text-ink">{value}</p>
      <p className="text-[10px] leading-tight text-muted">{label}</p>
    </div>
  );
}
