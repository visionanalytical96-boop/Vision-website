import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm',
  secondary:
    'bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200',
  outline: 'border border-border bg-transparent text-foreground hover:bg-surface-muted',
  ghost: 'bg-transparent text-foreground hover:bg-surface-muted',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export function buttonVariants(
  options: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {},
): string {
  // va-press adds the scale-down on :active. It is a class rather than a
  // Tailwind active: utility so the animations toggle and reduced-motion can
  // switch it off from one place in globals.css.
  const { variant = 'primary', size = 'md', className } = options;
  return cn(
    'inline-flex items-center justify-center rounded-[var(--btn-radius)] font-medium transition-colors',
    'va-press',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return <button className={buttonVariants({ variant, size, className })} {...props} />;
}
