import type { ReactNode } from 'react';

export function SectionHeading({
  title,
  subtitle,
  center = false,
  as: Tag = 'h2',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  center?: boolean;
  as?: 'h1' | 'h2';
}) {
  return (
    <div className={center ? 'mx-auto max-w-xl text-center' : ''}>
      <Tag className="text-[28px] font-bold sm:text-[34px]">{title}</Tag>
      {subtitle ? <p className="mt-3 text-base text-grafito sm:text-[17px]">{subtitle}</p> : null}
    </div>
  );
}
