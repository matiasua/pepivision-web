import type { ReactNode } from 'react';
import Link from 'next/link';
import type { CurrentSession } from '@/modules/auth/service';
import { Container } from '@/components/Container';
import { AdminNav } from './AdminNav';
import { logoutAction } from './actions';

const ROLE_LABELS = { SUPERADMIN: 'Superadministrador', ADMIN: 'Administrador' } as const;

export function AdminShell({ session, children }: { session: CurrentSession; children: ReactNode }) {
  return (
    <Container size="wide" className="py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Panel de administración</h1>
          <p className="mt-1 text-sm text-grafito">
            {session.adminUser.name} · {ROLE_LABELS[session.adminUser.role]}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/catalogo" className="rounded-input bg-gray px-4.5 py-2.5 text-sm font-semibold text-navy">
            Ver catálogo
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-input border-[1.5px] border-line bg-white px-4.5 py-2.5 text-sm font-semibold text-grafito"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      <div className="mb-6">
        <AdminNav role={session.adminUser.role} />
      </div>

      {children}
    </Container>
  );
}
