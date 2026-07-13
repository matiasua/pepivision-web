import type { ReactNode } from 'react';
import { Container } from '@/components/Container';
import { Eyebrow } from '@/components/Eyebrow';

/**
 * Full-width soft-gradient hero band used at the top of secondary pages
 * (cristales, domicilio, privacidad, derechos-arco, términos) — matches
 * design-reference/'s `background:var(--gradSoft)` page headers.
 */
export function PageHeroBand({
  eyebrow,
  title,
  description,
  align = 'left',
  containerSize = 'default',
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  containerSize?: 'default' | 'narrow';
}) {
  const alignClasses = align === 'center' ? 'text-center mx-auto' : '';
  return (
    <section className="bg-brand-gradient-soft">
      <Container size={containerSize} className={`py-11 sm:py-12 ${alignClasses}`}>
        {eyebrow ? (
          <Eyebrow>{eyebrow}</Eyebrow>
        ) : null}
        <h1 className={`text-[32px] font-bold sm:text-[38px] ${eyebrow ? 'mt-4' : ''}`}>{title}</h1>
        {description ? (
          <p className={`mt-3 max-w-xl text-[17px] text-grafito ${align === 'center' ? 'mx-auto' : ''}`}>
            {description}
          </p>
        ) : null}
      </Container>
    </section>
  );
}
