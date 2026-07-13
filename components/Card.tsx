import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  padding = 'default',
}: {
  children: ReactNode;
  className?: string;
  padding?: 'default' | 'lg' | 'sm';
}) {
  const paddingClasses = { default: 'p-6', lg: 'p-8 sm:p-9', sm: 'p-4' }[padding];
  return (
    <div
      className={`rounded-card border border-line bg-white shadow-brand-sm ${paddingClasses} ${className}`}
    >
      {children}
    </div>
  );
}

/** Small colored container for an icon, e.g. the soft-gradient square/circle behind benefit icons. */
export function IconBadge({
  children,
  shape = 'square',
  size = 'md',
}: {
  children: ReactNode;
  shape?: 'square' | 'circle';
  size?: 'md' | 'lg';
}) {
  const sizeClasses = size === 'lg' ? 'h-14 w-14' : 'h-[52px] w-[52px]';
  const shapeClasses = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';
  return (
    <div
      className={`flex items-center justify-center bg-brand-gradient-soft ${sizeClasses} ${shapeClasses}`}
    >
      {children}
    </div>
  );
}
