import type { ReactNode } from 'react';
import { Container } from '@/components/Container';

export function LegalDocument({
  sections,
  lastUpdated,
  children,
}: {
  sections: { title: string; body: ReactNode }[];
  lastUpdated: string;
  children?: ReactNode;
}) {
  return (
    <Container size="narrow" className="py-10">
      <div className="rounded-card border border-line bg-white p-9 text-[15.5px] leading-relaxed text-grafito shadow-brand-sm sm:p-9">
        {sections.map((section, index) => (
          <div key={section.title} className={index > 0 ? 'mt-6.5' : ''}>
            <h2 className="font-display text-[19px] font-bold text-navy">{section.title}</h2>
            <p className="mt-2">{section.body}</p>
          </div>
        ))}
        <p className="mt-5.5 text-[13px] text-[#93a0bd]">{lastUpdated}</p>
        {children}
      </div>
    </Container>
  );
}
