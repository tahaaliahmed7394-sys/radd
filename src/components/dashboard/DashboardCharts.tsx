import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ConversationStatus, Language, Numerals } from '../../data/types';
import { formatNumber } from '../../utils/date';

const COLORS = {
  primary: '#10B981',
  primaryDark: '#047857',
  secondary: '#1E3A8A',
  warning: '#F59E0B',
  neutral: '#94A3B8',
  danger: '#EF4444',
};

const STATUS_COLORS: Record<ConversationStatus, string> = {
  bot: COLORS.primary,
  human: COLORS.warning,
  closed: COLORS.neutral,
};

interface Point {
  label: string;
  count: number;
  date: string;
}

function TooltipBox({
  active,
  payload,
  label,
  numerals,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string; name?: string }>;
  label?: string | number;
  numerals: Numerals;
}) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-soft">
      <p className="font-bold text-ink">{label}</p>
      <p className="mt-0.5 text-muted">{formatNumber(value, numerals)}</p>
    </div>
  );
}

export function ConversationsArea({
  data,
  language,
  numerals,
  height = 240,
}: {
  data: Point[];
  language: Language;
  numerals: Numerals;
  height?: number;
}) {
  const gradient = useId().replace(/:/g, '');
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`area-${gradient}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          axisLine={false}
          tickLine={false}
          reversed={language === 'ar'}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip content={<TooltipBox numerals={numerals} />} cursor={{ stroke: COLORS.primary, strokeOpacity: 0.25 }} />
        <Area
          type="monotone"
          dataKey="count"
          stroke={COLORS.primaryDark}
          strokeWidth={2.5}
          fill={`url(#area-${gradient})`}
          dot={{ r: 3, fill: COLORS.primaryDark, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AppointmentsBar({
  data,
  language,
  numerals,
  height = 230,
}: {
  data: Point[];
  language: Language;
  numerals: Numerals;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.22)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          axisLine={false}
          tickLine={false}
          reversed={language === 'ar'}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip content={<TooltipBox numerals={numerals} />} cursor={{ fill: 'rgba(30,58,138,0.06)' }} />
        <Bar dataKey="count" fill={COLORS.secondary} radius={[7, 7, 0, 0]} maxBarSize={38} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusPie({
  counts,
  numerals,
  height = 210,
}: {
  counts: Record<ConversationStatus, number>;
  numerals: Numerals;
  height?: number;
}) {
  const { t } = useTranslation();
  const data = (Object.keys(counts) as ConversationStatus[])
    .map((key) => ({ key, name: t(`status.${key}`), value: counts[key], color: STATUS_COLORS[key] }))
    .filter((item) => item.value > 0);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return null;
  return (
    <div>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="86%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((item) => (
                <Cell key={item.key} fill={item.color} />
              ))}
            </Pie>
            <Tooltip content={<TooltipBox numerals={numerals} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-ink">{formatNumber(total, numerals)}</span>
          <span className="text-[11px] text-muted">{t('dashboard.conversation')}</span>
        </div>
      </div>
      <ul className="mt-2 space-y-1.5">
        {data.map((item) => (
          <li key={item.key} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
            <span className="flex-1 text-muted">{item.name}</span>
            <span className="font-bold tabular-nums text-ink">{formatNumber(item.value, numerals)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MiniTrend({ data, height = 110 }: { data: Point[]; height?: number }) {
  const gradient = useId().replace(/:/g, '');
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`mini-${gradient}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.38} />
            <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="count" stroke={COLORS.primaryDark} strokeWidth={2} fill={`url(#mini-${gradient})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
