'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { WhatsAppIcon } from '@/components/icons';
import { StatusPill } from './StatusPill';
import { ConfirmDeleteButton } from './ConfirmDeleteButton';
import {
  toggleRequestStatusAction,
  deleteRequestAction,
  getAttachmentDownloadUrlAction,
} from '@/app/admin/requests/actions';
import type { AdminRequestView } from '@/modules/requests/admin-service';

const TYPE_LABELS: Record<string, string> = { QUOTE: 'Cotización', HOME_VISIT: 'Atención a domicilio' };

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentPanel({ attachment }: { attachment: NonNullable<AdminRequestView['attachment']> }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleOpen = () => {
    // Open the tab synchronously, on the click itself, so browsers don't
    // treat the later `location` assignment — once the signed URL comes
    // back from the server action — as an unrequested popup. Passing
    // 'noopener' directly to window.open() here would make it return null
    // (per spec), leaving nothing to redirect later — instead we get a
    // real handle and sever `opener` on it manually, which has the same
    // anti-tabnabbing effect without losing the reference.
    const win = window.open('', '_blank');
    if (win) {
      win.opener = null;
    }
    setError(null);
    startTransition(async () => {
      const result = await getAttachmentDownloadUrlAction(attachment.id);
      if (result.status === 'error') {
        win?.close();
        setError(result.message);
        return;
      }
      if (win) {
        win.location.href = result.url;
      } else {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      }
    });
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2.5 rounded-lg border border-line bg-gray/40 px-3 py-2.5">
      <span className="text-[13.5px] text-grafito">
        <span className="text-[#5b6b85]">Receta adjunta:</span> {attachment.originalFileName} (
        {formatFileSize(attachment.sizeBytes)})
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={handleOpen}
        className="ml-auto rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        {isPending ? 'Abriendo…' : 'Ver / Descargar'}
      </button>
      {error ? <div className="w-full text-xs text-fucsia">{error}</div> : null}
    </div>
  );
}

function detailLines(request: AdminRequestView): { label: string; value: string }[] {
  const details = (request.details ?? {}) as Record<string, unknown>;

  if (request.type === 'QUOTE') {
    return [
      ...(details.frameBrandName ? [{ label: 'Marca', value: details.frameBrandName as string }] : []),
      { label: 'Armazón', value: (details.frameProductName as string) ?? (details.frameChoice === 'advice' ? 'Necesita asesoría' : '—') },
      ...(details.frameProductColorName ? [{ label: 'Color', value: details.frameProductColorName as string }] : []),
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
        <span className="text-xs text-[#5b6b85]">{new Date(request.createdAt).toLocaleString('es-CL')}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="font-display font-semibold text-navy">{request.name}</div>
        <div className="text-sm text-grafito">{request.phone}</div>
        {request.email ? <div className="text-sm text-grafito">{request.email}</div> : null}
      </div>

      <div className="mt-3 flex flex-col gap-1">
        {detailLines(request).map((line) => (
          <div key={line.label} className="text-[13.5px] text-grafito">
            <span className="text-[#5b6b85]">{line.label}:</span> {line.value}
          </div>
        ))}
      </div>

      {request.attachment ? <AttachmentPanel attachment={request.attachment} /> : null}

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
          // text-navy, not text-white: white text on --color-whatsapp's
          // light green is only a 1.98:1 contrast ratio (WCAG AA needs
          // 4.5:1) — found by the Fase 9 axe-core scan.
          className="inline-flex items-center gap-1.5 rounded-lg bg-whatsapp px-3.5 py-2 text-xs font-semibold text-navy"
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
