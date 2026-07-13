'use client';

import { useState, useTransition } from 'react';
import { LinkButton } from '@/components/Button';
import { CheckIcon, WhatsAppIcon } from '@/components/icons';
import { defaultWhatsAppHref } from '@/lib/whatsapp';
import { submitHomeVisitAction, type HomeVisitActionState } from '@/app/domicilio/actions';

const ATTENTION_TYPES = ['Asesoría para elegir lentes', 'Entrega de lentes', 'Ambas'] as const;

export function HomeVisitForm() {
  const [name, setName] = useState('');
  const [comuna, setComuna] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [attentionType, setAttentionType] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');

  const [result, setResult] = useState<HomeVisitActionState>({ status: 'idle' });
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const response = await submitHomeVisitAction({
        name,
        comuna,
        phone,
        email,
        attentionType: attentionType || undefined,
        consent,
        website,
      });
      setResult(response);
    });
  }

  if (result.status === 'success') {
    return (
      <div className="py-5 text-center">
        <div className="mx-auto mb-4 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-success-bg">
          <CheckIcon className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-xl font-bold">¡Consulta recibida!</h3>
        <p className="mt-2.5 leading-relaxed text-grafito">
          Revisaremos la cobertura para tu comuna y te contactaremos. Gracias por escribirnos.
        </p>
        {!result.comunaCovered ? (
          <p className="mx-auto mt-3.5 max-w-sm rounded-input bg-brand-gradient-soft px-4 py-3 text-[13.5px] text-navy">
            La cobertura de atención a domicilio en tu comuna todavía no está confirmada como habilitada —
            la revisaremos caso a caso y te contactaremos con la respuesta.
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <LinkButton href={result.whatsappHref} variant="whatsapp" size="sm">
            <WhatsAppIcon className="h-4 w-4" />
            Escribir por WhatsApp
          </LinkButton>
          <button
            type="button"
            onClick={() => {
              setName('');
              setComuna('');
              setPhone('');
              setEmail('');
              setAttentionType('');
              setConsent(false);
              setResult({ status: 'idle' });
            }}
            className="font-semibold text-fucsia"
          >
            Enviar otra consulta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <label className="text-[13px] font-semibold text-navy">Nombre *</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Tu nombre"
          className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
        />
      </div>
      <div>
        <label className="text-[13px] font-semibold text-navy">Comuna *</label>
        <input
          value={comuna}
          onChange={(event) => setComuna(event.target.value)}
          placeholder="Ej: Ñuñoa"
          className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
        />
      </div>
      <div>
        <label className="text-[13px] font-semibold text-navy">Teléfono *</label>
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+56 9 ..."
          className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
        />
      </div>
      <div>
        <label className="text-[13px] font-semibold text-navy">Correo</label>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tucorreo@mail.cl"
          className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
        />
      </div>
      <div>
        <label className="text-[13px] font-semibold text-navy">Tipo de atención requerida</label>
        <select
          value={attentionType}
          onChange={(event) => setAttentionType(event.target.value)}
          className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 text-ink"
        >
          <option value="">Selecciona…</option>
          {ATTENTION_TYPES.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* Honeypot: hidden from sighted users and screen readers, never filled by a human. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="domicilio-website">Sitio web</label>
        <input
          id="domicilio-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] text-grafito">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 accent-fucsia"
        />
        <span>
          Autorizo el tratamiento de mis datos para consultar la cobertura y contactarme, según la Política
          de Privacidad.
        </span>
      </label>

      {result.status === 'error' ? (
        <div className="rounded-input bg-error-bg px-3.5 py-3 text-[13.5px] font-semibold text-error">
          {result.formError ?? Object.values(result.fieldErrors)[0] ?? 'Revisa los datos ingresados.'}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!consent || isPending}
        className="mt-1 w-full rounded-input bg-brand-gradient py-3.5 font-semibold text-white shadow-brand-sm disabled:opacity-50"
      >
        {isPending ? 'Enviando…' : 'Consultar atención a domicilio'}
      </button>
      <a href={defaultWhatsAppHref} target="_blank" rel="noopener noreferrer" className="text-center text-sm font-semibold text-[#1a9d4e]">
        o escríbenos por WhatsApp →
      </a>
    </div>
  );
}
