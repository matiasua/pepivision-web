'use client';

import { useState, useTransition } from 'react';
import { CheckIcon } from '@/components/icons';
import { updateBusinessSettingsAction } from '@/app/admin/settings/actions';
import type { EffectiveBusinessSettings } from '@/modules/business-settings/service';

export function BusinessSettingsForm({ initial }: { initial: EffectiveBusinessSettings }) {
  const [values, setValues] = useState({
    whatsappNumber: initial.whatsappNumber,
    phoneDisplay: initial.phoneDisplay,
    email: initial.email,
    instagramHandle: initial.instagramHandle,
    hoursText: initial.hoursText,
    locationText: initial.locationText,
    requestRetentionMonths: String(initial.requestRetentionMonths),
    dataRightsRetentionMonths: String(initial.dataRightsRetentionMonths),
  });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function handleSubmit() {
    setError('');
    startTransition(async () => {
      const result = await updateBusinessSettingsAction(values);
      if (result.status === 'error') {
        setError(result.message);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="max-w-[720px] rounded-card border border-line bg-white p-7 shadow-brand">
      <h2 className="text-xl font-bold">Datos del negocio</h2>
      <p className="mt-1.5 text-sm text-grafito">
        Estos datos alimentan los botones de WhatsApp, el pie de página y la sección de Contacto del sitio.
      </p>

      {!initial.isPersisted ? (
        <div className="mt-4 rounded-input bg-brand-gradient-soft px-3.5 py-2.5 text-[13px] text-navy">
          Todavía no se ha guardado una configuración real — se muestran los valores de desarrollo por defecto.
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-[13px] font-semibold text-navy">WhatsApp (número internacional, sin +)</label>
          <input
            value={values.whatsappNumber}
            onChange={(e) => set('whatsappNumber', e.target.value)}
            placeholder="56936992313"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-navy">Teléfono visible</label>
          <input
            value={values.phoneDisplay}
            onChange={(e) => set('phoneDisplay', e.target.value)}
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-navy">Correo</label>
          <input
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="correo@mail.cl"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
          <div className="mt-1 text-xs text-[#93a0bd]">También recibe las notificaciones internas de nuevas solicitudes.</div>
        </div>
        <div>
          <label className="text-[13px] font-semibold text-navy">Instagram (usuario, sin @)</label>
          <input
            value={values.instagramHandle}
            onChange={(e) => set('instagramHandle', e.target.value)}
            placeholder="pepivision360"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[13px] font-semibold text-navy">Horario de atención</label>
          <input
            value={values.hoursText}
            onChange={(e) => set('hoursText', e.target.value)}
            placeholder="Lunes a sábado de 10:00 a 18:00 hrs"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[13px] font-semibold text-navy">Ubicación</label>
          <input
            value={values.locationText}
            onChange={(e) => set('locationText', e.target.value)}
            placeholder="Quilicura, Región Metropolitana"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-navy">Retención de solicitudes (meses)</label>
          <input
            value={values.requestRetentionMonths}
            onChange={(e) => set('requestRetentionMonths', e.target.value)}
            inputMode="numeric"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-navy">Retención de derechos ARCO (meses)</label>
          <input
            value={values.dataRightsRetentionMonths}
            onChange={(e) => set('dataRightsRetentionMonths', e.target.value)}
            inputMode="numeric"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
      </div>

      {error ? <div className="mt-4 rounded-input bg-error-bg px-3.5 py-3 text-[13px] font-semibold text-error">{error}</div> : null}

      <div className="mt-6 flex items-center gap-3.5">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-input bg-brand-gradient px-7 py-3 font-semibold text-white shadow-brand-sm disabled:opacity-60"
        >
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {saved ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
            <CheckIcon className="h-4.5 w-4.5" />
            Cambios guardados
          </span>
        ) : null}
      </div>
    </div>
  );
}
