'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { StatusPill } from './StatusPill';
import { changeArcoStatusAction } from '@/app/admin/requests/actions';

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Recibida',
  IN_REVIEW: 'En revisión',
  RESOLVED: 'Resuelta',
  REJECTED: 'Rechazada',
};

const STATUS_TONES: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
  RECEIVED: 'warning',
  IN_REVIEW: 'info',
  RESOLVED: 'success',
  REJECTED: 'error',
};

const RIGHT_TYPE_LABELS: Record<string, string> = {
  ACCESS: 'Acceso',
  RECTIFICATION: 'Rectificación',
  CANCELLATION: 'Cancelación / Supresión',
  OPPOSITION: 'Oposición',
  PORTABILITY: 'Portabilidad',
  BLOCKING: 'Bloqueo',
};

export interface DataRightsRequestView {
  id: string;
  rightType: string;
  name: string;
  email: string;
  phone: string | null;
  description: string;
  status: string;
  resolutionNotes: string | null;
  createdAt: Date;
}

export function DataRightsCard({ request }: { request: DataRightsRequestView }) {
  const [status, setStatus] = useState(request.status);
  const [notes, setNotes] = useState(request.resolutionNotes ?? '');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const requiresNotes = status === 'RESOLVED' || status === 'REJECTED';

  function handleSave() {
    setError('');
    startTransition(async () => {
      const result = await changeArcoStatusAction({
        dataRightsRequestId: request.id,
        status,
        resolutionNotes: notes,
      });
      if (result.status === 'error') {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-card border border-line bg-white p-5.5 shadow-brand-sm">
      <div className="flex flex-wrap items-center gap-2.5">
        <StatusPill label={RIGHT_TYPE_LABELS[request.rightType] ?? request.rightType} tone="info" />
        <StatusPill label={STATUS_LABELS[request.status] ?? request.status} tone={STATUS_TONES[request.status] ?? 'neutral'} />
        <span className="text-xs text-[#93a0bd]">{new Date(request.createdAt).toLocaleString('es-CL')}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="font-display font-semibold text-navy">{request.name}</div>
        <div className="text-sm text-grafito">{request.email}</div>
        {request.phone ? <div className="text-sm text-grafito">{request.phone}</div> : null}
      </div>

      <p className="mt-3 text-[13.5px] leading-relaxed text-grafito">{request.description}</p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[200px_1fr]">
        <div>
          <label className="text-xs font-semibold text-navy">Estado</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-input border border-line bg-white px-3 py-2 text-sm text-ink"
          >
            {Object.keys(STATUS_LABELS).map((key) => (
              <option key={key} value={key}>
                {STATUS_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-navy">
            Nota de resolución {requiresNotes ? '*' : '(opcional)'}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Detalle de la resolución…"
            className="mt-1 w-full resize-y rounded-input border border-line bg-white px-3 py-2 text-sm outline-none"
          />
        </div>
      </div>

      {error ? <div className="mt-3 rounded-input bg-error-bg px-3 py-2 text-xs font-semibold text-error">{error}</div> : null}

      <div className="mt-3.5 flex justify-end">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="rounded-lg bg-navy px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {isPending ? 'Guardando…' : 'Guardar estado'}
        </button>
      </div>
    </div>
  );
}
