import type { Metadata } from 'next';
import Link from 'next/link';
import { requireSession } from '@/modules/auth/service';
import { listRequests } from '@/modules/requests/admin-service';
import { parseRequestFilters } from '@/modules/requests/admin-schemas';
import { listDataRightsRequests } from '@/modules/data-rights/admin-service';
import { AdminShell } from '@/components/admin/AdminShell';
import { RequestCard } from '@/components/admin/RequestCard';
import { DataRightsCard } from '@/components/admin/DataRightsCard';

export const metadata: Metadata = { title: 'Solicitudes · Panel de administración', robots: { index: false } };
export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function tabLink(tab: string) {
  return `/admin/requests?tab=${tab}`;
}

function typeLink(type: string | null) {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  return `/admin/requests?${params.toString()}`;
}

export default async function AdminRequestsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireSession();
  const resolved = await searchParams;
  const tab = (Array.isArray(resolved.tab) ? resolved.tab[0] : resolved.tab) ?? 'comercial';

  if (tab === 'arco') {
    const dataRightsRequests = await listDataRightsRequests();
    return (
      <AdminShell session={session}>
        <RequestTabs activeTab="arco" />
        {dataRightsRequests.length === 0 ? (
          <EmptyState message="No hay solicitudes de derechos ARCO por ahora." />
        ) : (
          <div className="flex flex-col gap-3.5">
            {dataRightsRequests.map((request) => (
              <DataRightsCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </AdminShell>
    );
  }

  const filters = parseRequestFilters(resolved);
  const requests = await listRequests(filters);

  return (
    <AdminShell session={session}>
      <RequestTabs activeTab="comercial" />

      <div className="mb-4.5 flex flex-wrap gap-2">
        {[
          { label: 'Todas', type: null },
          { label: 'Cotizaciones', type: 'QUOTE' },
          { label: 'Atención a domicilio', type: 'HOME_VISIT' },
        ].map((option) => {
          const active = option.type ? filters.type === option.type : !filters.type;
          return (
            <Link
              key={option.label}
              href={typeLink(option.type)}
              className={`rounded-pill border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold ${
                active ? 'border-fucsia bg-brand-gradient-soft text-fucsia' : 'border-line bg-white text-grafito'
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      {requests.length === 0 ? (
        <EmptyState message="No hay solicitudes por ahora." />
      ) : (
        <div className="flex flex-col gap-3.5">
          {requests.map((request) => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </AdminShell>
  );
}

function RequestTabs({ activeTab }: { activeTab: string }) {
  return (
    <div className="mb-5 flex gap-1.5 border-b border-line pb-1">
      <Link
        href={tabLink('comercial')}
        className={`rounded-t-lg border-b-2 px-3.5 py-2 text-[13.5px] font-semibold ${
          activeTab === 'comercial' ? 'border-fucsia text-fucsia' : 'border-transparent text-grafito'
        }`}
      >
        Cotizaciones y domicilio
      </Link>
      <Link
        href={tabLink('arco')}
        className={`rounded-t-lg border-b-2 px-3.5 py-2 text-[13.5px] font-semibold ${
          activeTab === 'arco' ? 'border-fucsia text-fucsia' : 'border-transparent text-grafito'
        }`}
      >
        Derechos ARCO
      </Link>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-card border border-line bg-white py-14 text-center shadow-brand-sm">
      <div className="font-semibold text-navy">Sin solicitudes</div>
      <p className="mt-2 text-sm text-grafito">{message}</p>
    </div>
  );
}
