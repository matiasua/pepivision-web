import type { Metadata } from 'next';
import { getCurrentSession } from '@/modules/auth/service';
import { getKpis } from '@/modules/catalog/admin-service';
import { listRequests } from '@/modules/requests/admin-service';
import { listDataRightsRequests } from '@/modules/data-rights/admin-service';
import { getComunas } from '@/modules/home-visit-coverage/service';
import { AdminShell } from '@/components/admin/AdminShell';
import { LoginCard } from '@/components/admin/LoginCard';
import { Card } from '@/components/Card';

export const metadata: Metadata = {
  title: 'Panel de administración',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

async function Dashboard() {
  const [productKpis, pendingRequests, pendingDataRights, comunas] = await Promise.all([
    getKpis(),
    listRequests({ status: 'NEW' }),
    listDataRightsRequests(),
    getComunas(),
  ]);

  const pendingArco = pendingDataRights.filter((r) => r.status === 'RECEIVED' || r.status === 'IN_REVIEW').length;
  const activeComunas = comunas.filter((c) => c.active).length;

  const stats = [
    { label: 'Modelos totales', value: productKpis.total },
    { label: 'Solicitudes nuevas', value: pendingRequests.length },
    { label: 'Derechos ARCO pendientes', value: pendingArco },
    { label: 'Comunas habilitadas', value: activeComunas },
  ];

  return (
    <div>
      <p className="mb-5 text-sm text-grafito">Gestiona los modelos, solicitudes y configuración del sitio.</p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} padding="sm">
            <div className="text-xs text-[#5b6b85]">{stat.label}</div>
            <div className="mt-1 font-display text-2xl font-bold text-navy">{stat.value}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const session = await getCurrentSession();

  if (!session) {
    return <LoginCard />;
  }

  return (
    <AdminShell session={session}>
      <Dashboard />
    </AdminShell>
  );
}
