import type { Metadata } from 'next';
import { requireSession } from '@/modules/auth/service';
import { getComunas } from '@/modules/home-visit-coverage/service';
import { AdminShell } from '@/components/admin/AdminShell';
import { ComunaManager } from '@/components/admin/ComunaManager';

export const metadata: Metadata = { title: 'Atención a domicilio · Panel de administración', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminHomeVisitsPage() {
  const session = await requireSession();
  const comunas = await getComunas();

  return (
    <AdminShell session={session}>
      <p className="mb-5 text-sm text-grafito">
        Administra las comunas habilitadas para atención a domicilio. Los cambios se reflejan de inmediato en el
        formulario público, sin necesidad de desplegar la aplicación.
      </p>
      <ComunaManager comunas={comunas} />
    </AdminShell>
  );
}
