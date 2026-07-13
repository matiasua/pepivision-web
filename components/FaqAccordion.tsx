'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@/components/icons';

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => {
        const open = openIndex === index;
        const panelId = `faq-panel-${index}`;
        const buttonId = `faq-button-${index}`;
        return (
          <div key={item.q} className="overflow-hidden rounded-2xl border border-line bg-white shadow-brand-sm">
            <button
              id={buttonId}
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenIndex(open ? null : index)}
              className="flex w-full items-center justify-between gap-3.5 px-5.5 py-4.5 text-left"
            >
              <span className="text-base font-semibold text-navy">{item.q}</span>
              <ChevronDownIcon
                className={`h-[18px] w-[18px] shrink-0 text-blue transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              />
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className="grid transition-[grid-template-rows] duration-300 ease-in-out"
              style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <p className="px-5.5 pb-5 text-[15px] leading-relaxed text-grafito">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
