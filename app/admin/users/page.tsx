import type { Metadata } from 'next';
import { listUsers, requireSession } from '@/modules/auth/service';
import { AdminShell } from '@/components/admin/AdminShell';
import { UserManager } from '@/components/admin/UserManager';

export const metadata: Metadata = { title: 'Usuarios · Panel de administración', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const session = await requireSession();

  if (session.adminUser.role !== 'SUPERADMIN') {
    return (
      <AdminShell session={session}>
        <div className="rounded-card border border-line bg-white p-7 text-center shadow-brand-sm">
          <div className="font-semibold text-navy">Acceso restringido</div>
          <p className="mt-2 text-sm text-grafito">Solo un usuario SUPERADMIN puede gestionar usuarios administradores.</p>
        </div>
      </AdminShell>
    );
  }

  const users = await listUsers();

  return (
    <AdminShell session={session}>
      <UserManager users={users} currentUserId={session.adminUser.id} />
    </AdminShell>
  );
}
