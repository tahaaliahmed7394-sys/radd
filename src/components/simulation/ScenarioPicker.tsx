import { useTranslation } from 'react-i18next';
import {
  CalendarCheck,
  Clock,
  Flame,
  HelpCircle,
  Moon,
  Package,
  Play,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import { SCENARIOS } from '../../simulation/scenarios';
import { runtime } from '../../simulation/runtime';
import { useSimStore } from '../../store/sim';
import { cn } from '../../utils/text';

const ICONS: Record<string, LucideIcon> = {
  tag: Tag,
  calendar: CalendarCheck,
  package: Package,
  clock: Clock,
  flame: Flame,
  moon: Moon,
  help: HelpCircle,
};

export function ScenarioPicker({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const scenarioId = useSimStore((state) => state.scenarioId);
  const running = useSimStore((state) => state.running);
  const step = useSimStore((state) => state.step);
  const totalSteps = useSimStore((state) => state.totalSteps);

  return (
    <section aria-label={t('simulation.scenarios')}>
      {!compact && (
        <div className="mb-3">
          <h2 className="text-sm font-bold text-ink">{t('simulation.scenarios')}</h2>
          <p className="mt-0.5 text-xs text-muted">{t('simulation.scenariosHint')}</p>
        </div>
      )}
      <div className={cn(compact ? 'flex gap-2 overflow-x-auto pb-1' : 'grid gap-2')}>
        {SCENARIOS.map((scenario) => {
          const Icon = ICONS[scenario.icon] ?? SparkIcon;
          const active = scenario.id === scenarioId;
          return (
            <button
              key={scenario.id}
              type="button"
              onClick={() => void runtime.startScenario(scenario.id)}
              aria-pressed={active}
              className={cn(
                'group text-start transition',
                compact
                  ? 'flex min-w-[9.5rem] items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2'
                  : 'flex items-start gap-3 rounded-xl border p-3',
                active
                  ? 'border-primary bg-primary-soft/60 shadow-sm'
                  : 'border-line bg-surface hover:border-primary/40 hover:bg-surface2',
                compact && (active ? 'border-primary bg-primary-soft/60' : ''),
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                  active ? 'bg-primary text-primary-fg' : 'bg-surface2 text-primary-strong dark:text-primary',
                )}
              >
                {active && running ? (
                  <Play className="h-4 w-4" aria-hidden />
                ) : (
                  <Icon className="h-4 w-4" aria-hidden />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-ink">{t(scenario.titleKey)}</span>
                {!compact && (
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted">{t(scenario.descKey)}</span>
                )}
                {active && running && totalSteps > 0 && (
                  <span className="mt-1 block text-[10px] font-semibold text-primary-strong dark:text-primary">
                    {t('simulation.stepOf', { current: step, total: totalSteps })}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SparkIcon(props: { className?: string }) {
  return <Play {...props} />;
}
