type Tone = 'success' | 'warning' | 'error' | 'neutral' | 'info';

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-success-bg text-success',
  warning: 'bg-[#fdf3e0] text-[#b45309]',
  error: 'bg-error-bg text-error',
  neutral: 'bg-gray text-grafito',
  info: 'bg-brand-gradient-soft text-navy',
};

export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={`inline-flex rounded-pill px-3 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}>
      {label}
    </span>
  );
}
