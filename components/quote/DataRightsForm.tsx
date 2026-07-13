'use client';

import { useState, useTransition } from 'react';
import { CheckIcon } from '@/components/icons';
import { RIGHT_TYPES } from '@/modules/data-rights/schemas';
import { submitDataRightsAction, type DataRightsActionState } from '@/app/derechos-arco/actions';

const RIGHT_OPTIONS = Object.entries(RIGHT_TYPES) as [keyof typeof RIGHT_TYPES, string][];

export function DataRightsForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rightType, setRightType] = useState('');
  const [description, setDescription] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');

  const [result, setResult] = useState<DataRightsActionState>({ status: 'idle' });
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const response = await submitDataRightsAction({
        name,
        email,
        phone,
        rightType,
        description,
        consent,
        website,
      });
      setResult(response);
    });
  }

  if (result.status === 'success') {
    return (
      <div className="py-4 text-center">
        <div className="mx-auto mb-4 flex h-[66px] w-[66px] items-center justify-center rounded-full bg-success-bg">
          <CheckIcon className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-xl font-bold">Solicitud recibida</h3>
        <p className="mx-auto mt-2.5 max-w-md leading-relaxed text-grafito">
          Gestionaremos tu solicitud y te responderemos al correo indicado dentro de los plazos legales.
          Gracias por escribirnos.
        </p>
        <button
          type="button"
          onClick={() => {
            setName('');
            setEmail('');
            setPhone('');
            setRightType('');
            setDescription('');
            setConsent(false);
            setResult({ status: 'idle' });
          }}
          className="mt-4.5 font-semibold text-fucsia"
        >
          Enviar otra solicitud
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-1.5 text-xl font-bold">Formulario de solicitud</h2>
      <p className="mb-4.5 text-sm text-grafito">
        Completa tus datos para gestionar el ejercicio de tu derecho.
      </p>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <label className="text-[13px] font-semibold text-navy">Nombre completo *</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Tu nombre"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-navy">Correo *</label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="tucorreo@mail.cl"
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-navy">Teléfono</label>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+56 9 ..."
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
        <div>
          <label className="text-[13px] font-semibold text-navy">Derecho a ejercer *</label>
          <select
            value={rightType}
            onChange={(event) => setRightType(event.target.value)}
            className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 text-ink"
          >
            <option value="">Selecciona…</option>
            {RIGHT_OPTIONS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-[13px] font-semibold text-navy">Detalle de tu solicitud *</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Describe qué necesitas"
            className="mt-1.5 w-full resize-y rounded-input border border-line bg-white px-3.5 py-3 outline-none"
          />
        </div>
      </div>

      {/* Honeypot: hidden from sighted users and screen readers, never filled by a human. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="arco-website">Sitio web</label>
        <input
          id="arco-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13px] text-grafito">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 accent-fucsia"
        />
        <span>Autorizo el tratamiento de estos datos con el único fin de gestionar esta solicitud.</span>
      </label>

      {result.status === 'error' ? (
        <div className="mt-3.5 rounded-input bg-error-bg px-3.5 py-3 text-[13.5px] font-semibold text-error">
          {result.formError ?? Object.values(result.fieldErrors)[0] ?? 'Revisa los datos ingresados.'}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!consent || isPending}
        className="mt-4.5 w-full rounded-input bg-brand-gradient py-3.5 font-semibold text-white shadow-brand-sm disabled:opacity-50"
      >
        {isPending ? 'Enviando…' : 'Enviar solicitud'}
      </button>
    </div>
  );
}
