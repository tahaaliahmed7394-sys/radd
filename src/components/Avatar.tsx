import { cn } from '../utils/text';

const PALETTE = [
  ['#047857', '#10B981'],
  ['#1E3A8A', '#3B82F6'],
  ['#9A3412', '#F59E0B'],
  ['#6B21A8', '#A855F7'],
  ['#0F766E', '#14B8A6'],
  ['#9D174D', '#EC4899'],
  ['#374151', '#64748B'],
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '؟';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`;
}

function hash(name: string): number {
  let value = 0;
  for (let i = 0; i < name.length; i++) value = (value * 31 + name.charCodeAt(i)) >>> 0;
  return value;
}

const SIZES = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-16 w-16 text-lg',
};

export function Avatar({
  name,
  size = 'md',
  className,
  accent,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
  accent?: string;
}) {
  const [from, to] = PALETTE[hash(name) % PALETTE.length];
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white shadow-sm ring-1 ring-black/5',
        SIZES[size],
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, ${accent ?? from}, ${accent ? `${accent}bb` : to})`,
      }}
    >
      {initials(name)}
    </span>
  );
}
