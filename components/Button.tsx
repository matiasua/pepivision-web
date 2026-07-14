import type { ReactNode, ButtonHTMLAttributes } from 'react';
import Link from 'next/link';

type Variant = 'primary' | 'gradient' | 'whatsapp' | 'outline' | 'ghost';

const base =
  'inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-transform duration-150 hover:-translate-y-0.5';

const variants: Record<Variant, string> = {
  primary: 'bg-navy text-white shadow-brand',
  gradient: 'bg-brand-gradient text-white shadow-brand',
  // text-navy, not text-white: white text on --color-whatsapp's light green
  // is only a 1.98:1 contrast ratio (WCAG AA needs 4.5:1 for normal text) —
  // found by the Fase 9 axe-core scan.
  whatsapp: 'bg-whatsapp text-navy shadow-brand',
  outline: 'bg-white border-[1.5px] border-blue text-blue',
  ghost: 'text-fucsia font-semibold hover:-translate-y-0 gap-1.5',
};

const sizes = {
  md: 'px-6 py-3.5 text-[15px]',
  sm: 'px-4 py-2.5 text-[13px]',
};

type Size = keyof typeof sizes;

function classesFor(variant: Variant, size: Size, className: string) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

/** Navigable button (internal route or external link, e.g. wa.me). */
export function LinkButton({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  external = false,
  ariaLabel,
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  external?: boolean;
  ariaLabel?: string;
}) {
  const classes = classesFor(variant, size, className);

  if (external || href.startsWith('http')) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

/** Actionable button (client-side interaction, e.g. toggling a drawer or accordion). */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={classesFor(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}
