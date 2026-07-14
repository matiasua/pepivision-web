import type { Metadata } from 'next';
import Link from 'next/link';
import { requireSession } from '@/modules/auth/service';
import { getKpis, listProducts } from '@/modules/catalog/admin-service';
import { GENDER_LABELS, formatClp } from '@/modules/catalog/labels';
import { AdminShell } from '@/components/admin/AdminShell';
import { ProductRowActions } from '@/components/admin/ProductRowActions';
import { Card } from '@/components/Card';

export const metadata: Metadata = { title: 'Modelos · Panel de administración', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const { q } = await searchParams;
  const [kpis, products] = await Promise.all([getKpis(), listProducts(q)]);

  return (
    <AdminShell session={session}>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <Card padding="sm">
          <div className="text-xs text-[#5b6b85]">Modelos totales</div>
          <div className="mt-1 font-display text-2xl font-bold text-navy">{kpis.total}</div>
        </Card>
        <Card padding="sm">
          <div className="text-xs text-[#5b6b85]">Disponibles</div>
          <div className="mt-1 font-display text-2xl font-bold text-success">{kpis.available}</div>
        </Card>
        <Card padding="sm">
          <div className="text-xs text-[#5b6b85]">Bajo pedido</div>
          <div className="mt-1 font-display text-2xl font-bold text-[#b45309]">{kpis.unavailable}</div>
        </Card>
      </div>

      <form className="my-5 flex gap-2.5" action="/admin/products">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Buscar por nombre o código…"
          className="w-full max-w-sm rounded-input border border-line bg-white px-3.5 py-2.5 outline-none"
        />
        <button type="submit" className="rounded-input bg-gray px-4.5 py-2.5 text-sm font-semibold text-navy">
          Buscar
        </button>
        <Link href="/admin/products/new" className="ml-auto rounded-input bg-navy px-4.5 py-2.5 text-sm font-semibold text-white">
          + Agregar modelo
        </Link>
      </form>

      <div className="overflow-hidden overflow-x-auto rounded-card border border-line bg-white shadow-brand-sm">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="bg-gray text-left text-[11.5px] font-bold uppercase tracking-wide text-[#5b6b85]">
              <th className="px-4.5 py-3.5">Modelo</th>
              <th className="px-4.5 py-3.5">Precio</th>
              <th className="px-4.5 py-3.5">Estado</th>
              <th className="px-4.5 py-3.5">Publicado</th>
              <th className="px-4.5 py-3.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-line align-middle">
                <td className="px-4.5 py-3.5">
                  <div className="font-display font-semibold text-navy">{product.name}</div>
                  <div className="text-xs text-[#5b6b85]">
                    {product.code} · {product.brand?.name ?? 'Sin marca'} · {GENDER_LABELS[product.gender]}
                  </div>
                </td>
                <td className="px-4.5 py-3.5 font-display font-bold text-fucsia">{formatClp(product.priceFromClp)}</td>
                <td className="px-4.5 py-3.5">
                  <span className={`text-xs font-semibold ${product.available ? 'text-success' : 'text-[#b45309]'}`}>
                    {product.available ? 'Disponible' : 'Bajo pedido'}
                  </span>
                </td>
                <td className="px-4.5 py-3.5">
                  <span className={`text-xs font-semibold ${product.visible ? 'text-navy' : 'text-[#5b6b85]'}`}>
                    {product.visible ? 'Publicado' : 'Despublicado'}
                  </span>
                </td>
                <td className="px-4.5 py-3.5">
                  <ProductRowActions productId={product.id} />
                </td>
              </tr>
            ))}
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4.5 py-10 text-center text-sm text-grafito">
                  No hay modelos que coincidan con la búsqueda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
