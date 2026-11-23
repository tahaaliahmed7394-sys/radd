import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-fg shadow-sm hover:brightness-[0.97] active:brightness-95',
  secondary:
    'bg-secondary/10 text-secondary border border-secondary/25 hover:bg-secondary/15',
  outline: 'border border-line bg-surface text-ink hover:bg-surface2',
  ghost: 'text-muted hover:bg-surface2 hover:text-ink',
  danger: 'border border-danger/25 bg-danger/10 text-danger hover:bg-danger/15',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-[38px] px-3 py-1.5 text-xs sm:min-h-[34px]',
  md: 'min-h-[44px] px-4 py-2.5 text-sm',
  icon: 'h-11 w-11 p-0 sm:h-10 sm:w-10',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leadingIcon,
  trailingIcon,
  className,
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition',
        'disabled:cursor-not-allowed disabled:opacity-55',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
}
