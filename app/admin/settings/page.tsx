import type { Metadata } from 'next';
import { requireSession } from '@/modules/auth/service';
import { getEffectiveBusinessSettings } from '@/modules/business-settings/service';
import { AdminShell } from '@/components/admin/AdminShell';
import { BusinessSettingsForm } from '@/components/admin/BusinessSettingsForm';

export const metadata: Metadata = { title: 'Configuración · Panel de administración', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const session = await requireSession();

  if (session.adminUser.role !== 'SUPERADMIN') {
    return (
      <AdminShell session={session}>
        <div className="rounded-card border border-line bg-white p-7 text-center shadow-brand-sm">
          <div className="font-semibold text-navy">Acceso restringido</div>
          <p className="mt-2 text-sm text-grafito">
            Solo un usuario SUPERADMIN puede ver y editar la configuración de negocio.
          </p>
        </div>
      </AdminShell>
    );
  }

  const settings = await getEffectiveBusinessSettings();

  return (
    <AdminShell session={session}>
      <BusinessSettingsForm initial={settings} />
    </AdminShell>
  );
}
