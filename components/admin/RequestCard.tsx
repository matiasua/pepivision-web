'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { WhatsAppIcon } from '@/components/icons';
import { StatusPill } from './StatusPill';
import { ConfirmDeleteButton } from './ConfirmDeleteButton';
import { toggleRequestStatusAction, deleteRequestAction } from '@/app/admin/requests/actions';
import type { AdminRequestView } from '@/modules/requests/admin-service';

const TYPE_LABELS: Record<string, string> = { QUOTE: 'Cotización', HOME_VISIT: 'Atención a domicilio' };

function detailLines(request: AdminRequestView): { label: string; value: string }[] {
  const details = (request.details ?? {}) as Record<string, unknown>;

  if (request.type === 'QUOTE') {
    return [
      { label: 'Armazón', value: (details.frameProductName as string) ?? (details.frameChoice === 'advice' ? 'Necesita asesoría' : '—') },
      { label: 'Cristal', value: (details.glassType as string) ?? '—' },
      { label: 'Tratamientos', value: (details.treatmentLabels as string[])?.join(', ') || 'Ninguno' },
      { label: 'Receta óptica', value: (details.prescriptionAnswer as string) ?? '—' },
      ...(request.comuna ? [{ label: 'Comuna', value: request.comuna }] : []),
      ...(request.message ? [{ label: 'Mensaje', value: request.message }] : []),
    ];
  }

  return [
    { label: 'Comuna', value: request.comuna ?? '—' },
    { label: 'Tipo de atención', value: (details.attentionType as string) ?? '—' },
    { label: 'Cobertura', value: details.comunaCovered ? 'Comuna habilitada' : 'Por confirmar caso a caso' },
  ];
}

export function RequestCard({ request }: { request: AdminRequestView }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-card border border-line bg-white p-5.5 shadow-brand-sm">
      <div className="flex flex-wrap items-center gap-2.5">
        <StatusPill label={TYPE_LABELS[request.type] ?? request.type} tone="info" />
        <StatusPill label={request.status === 'NEW' ? 'Nueva' : 'Atendida'} tone={request.status === 'NEW' ? 'warning' : 'success'} />
        <span className="text-xs text-[#93a0bd]">{new Date(request.createdAt).toLocaleString('es-CL')}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="font-display font-semibold text-navy">{request.name}</div>
        <div className="text-sm text-grafito">{request.phone}</div>
        {request.email ? <div className="text-sm text-grafito">{request.email}</div> : null}
      </div>

      <div className="mt-3 flex flex-col gap-1">
        {detailLines(request).map((line) => (
          <div key={line.label} className="text-[13.5px] text-grafito">
            <span className="text-[#93a0bd]">{line.label}:</span> {line.value}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await toggleRequestStatusAction(request.id);
              router.refresh();
            })
          }
          className="rounded-lg bg-gray px-3.5 py-2 text-xs font-semibold text-navy disabled:opacity-60"
        >
          {request.status === 'NEW' ? 'Marcar como atendida' : 'Marcar como nueva'}
        </button>
        <a
          href={request.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-whatsapp px-3.5 py-2 text-xs font-semibold text-white"
        >
          <WhatsAppIcon className="h-3.5 w-3.5" />
          Contactar
        </a>
        <div className="ml-auto">
          <ConfirmDeleteButton
            action={async () => {
              await deleteRequestAction(request.id);
              router.refresh();
            }}
          />
        </div>
      </div>
    </div>
  );
}
