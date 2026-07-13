import type { ReactNode } from 'react';

/** Small pill badge used above page/section titles, e.g. "Nosotros", "Protección de datos". */
export function Eyebrow({
  children,
  icon,
  tone = 'light',
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: 'light' | 'soft';
}) {
  const toneClasses =
    tone === 'light'
      ? 'bg-white border border-line shadow-brand-sm'
      : 'bg-brand-gradient-soft';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-pill px-4 py-1.5 text-[13px] font-semibold text-fucsia ${toneClasses}`}
    >
      {icon}
      {children}
    </span>
  );
}
