'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { AdminRole } from '@prisma/client';

const NAV_ITEMS: { label: string; href: string; roles?: AdminRole[] }[] = [
  { label: 'Modelos', href: '/admin/products' },
  { label: 'Categorías', href: '/admin/categories', roles: ['SUPERADMIN'] },
  { label: 'Solicitudes', href: '/admin/requests' },
  { label: 'Atención a domicilio', href: '/admin/home-visits' },
  { label: 'Configuración', href: '/admin/settings', roles: ['SUPERADMIN'] },
  { label: 'Usuarios', href: '/admin/users', roles: ['SUPERADMIN'] },
];

export function AdminNav({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <nav aria-label="Navegación del panel" className="flex flex-wrap gap-1.5 border-b border-line pb-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-t-lg border-b-2 px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors ${
              active ? 'border-fucsia text-fucsia' : 'border-transparent text-grafito hover:text-navy'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
