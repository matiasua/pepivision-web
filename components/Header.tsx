'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from '@/lib/nav-items';
import { defaultWhatsAppHref } from '@/lib/whatsapp';
import { WhatsAppIcon, MenuIcon, CloseIcon } from '@/components/icons';

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" aria-label="Ir al inicio Pepi Visión 360" className="flex items-center gap-2.5">
          <Image src="/brand/pepi-logo.png" alt="Pepi Visión 360" width={140} height={56} className="h-12 w-auto sm:h-14" priority />
        </Link>

        <nav aria-label="Navegación principal" className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-xl px-3 py-2 text-[13.5px] font-semibold transition-colors ${
                isActive(pathname, item.href)
                  ? 'bg-brand-gradient-soft text-fucsia'
                  : 'text-grafito hover:text-fucsia'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <a
            href={defaultWhatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded-pill bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-brand-sm lg:inline-flex"
          >
            <WhatsAppIcon className="h-[17px] w-[17px]" />
            Cotiza tus lentes
          </a>
          <button
            type="button"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray text-navy lg:hidden"
          >
            {mobileOpen ? <CloseIcon className="h-[22px] w-[22px]" /> : <MenuIcon className="h-[22px] w-[22px]" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-line bg-white px-4 pb-4.5 pt-2.5 lg:hidden">
          <nav aria-label="Navegación móvil" className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-xl px-3 py-3.5 text-left text-[15px] font-semibold ${
                  isActive(pathname, item.href) ? 'bg-brand-gradient-soft text-fucsia' : 'text-ink'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <a
            href={defaultWhatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-brand-gradient p-3.5 font-semibold text-white"
          >
            <WhatsAppIcon className="h-[18px] w-[18px]" />
            Cotiza tus lentes
          </a>
        </div>
      ) : null}
    </header>
  );
}
