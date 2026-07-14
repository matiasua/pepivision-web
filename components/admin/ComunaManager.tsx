'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createComunaAction, toggleComunaAction } from '@/app/admin/home-visits/actions';

export interface ComunaView {
  id: string;
  name: string;
  region: string | null;
  active: boolean;
}

export function ComunaManager({ comunas }: { comunas: ComunaView[] }) {
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleAdd() {
    setError('');
    startTransition(async () => {
      const result = await createComunaAction({ name, region });
      if (result.status === 'error') {
        setError(result.message);
        return;
      }
      setName('');
      setRegion('');
      router.refresh();
    });
  }

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleComunaAction(id, active);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="rounded-card border border-line bg-white p-5.5 shadow-brand-sm">
        <h2 className="text-base font-semibold text-navy">Agregar comuna</h2>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <label htmlFor="comuna-name" className="sr-only">Nombre de la comuna</label>
          <input
            id="comuna-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la comuna"
            className="min-w-[200px] flex-1 rounded-input border border-line bg-white px-3.5 py-2.5 outline-none"
          />
          <label htmlFor="comuna-region" className="sr-only">Región</label>
          <input
            id="comuna-region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Región (opcional)"
            className="min-w-[200px] flex-1 rounded-input border border-line bg-white px-3.5 py-2.5 outline-none"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending || !name.trim()}
            className="rounded-input bg-navy px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            Agregar
          </button>
        </div>
        <div aria-live="polite">
          {error ? <div className="mt-3 rounded-input bg-error-bg px-3.5 py-2.5 text-[13px] font-semibold text-error">{error}</div> : null}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-card border border-line bg-white shadow-brand-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray text-left text-[11.5px] font-bold uppercase tracking-wide text-[#5b6b85]">
              <th className="px-4.5 py-3.5">Comuna</th>
              <th className="px-4.5 py-3.5">Región</th>
              <th className="px-4.5 py-3.5">Estado</th>
              <th className="px-4.5 py-3.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {comunas.map((comuna) => (
              <tr key={comuna.id} className="border-t border-line">
                <td className="px-4.5 py-3.5 font-semibold text-navy">{comuna.name}</td>
                <td className="px-4.5 py-3.5 text-sm text-grafito">{comuna.region ?? '—'}</td>
                <td className="px-4.5 py-3.5">
                  <span className={`text-xs font-semibold ${comuna.active ? 'text-success' : 'text-[#5b6b85]'}`}>
                    {comuna.active ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-4.5 py-3.5 text-right">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggle(comuna.id, !comuna.active)}
                    className="rounded-lg bg-gray px-3 py-1.5 text-xs font-semibold text-navy disabled:opacity-60"
                  >
                    {comuna.active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
