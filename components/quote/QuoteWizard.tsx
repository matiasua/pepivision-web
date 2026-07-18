'use client';

import { useRef, useState, useTransition } from 'react';
import { LinkButton } from '@/components/Button';
import { CheckIcon, WhatsAppIcon } from '@/components/icons';
import { defaultWhatsAppHref } from '@/lib/whatsapp';
import { GLASS_TYPES, PRESCRIPTION_ANSWERS, TREATMENT_IDS } from '@/modules/requests/schemas';
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_BYTES } from '@/modules/storage/schemas';
import { submitQuoteAction, type QuoteActionState } from '@/app/cotizador/actions';

const ATTACHMENT_ACCEPT = ALLOWED_ATTACHMENT_MIME_TYPES.join(',');
const ATTACHMENT_MAX_MB = MAX_ATTACHMENT_BYTES / (1024 * 1024);

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validatePrescriptionFile(file: File): string | null {
  if (!(ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'Formato no permitido. Usa PDF, JPG, PNG o WEBP.';
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `El archivo no puede superar ${ATTACHMENT_MAX_MB} MB.`;
  }
  return null;
}

const STEP_LABELS = ['Armazón', 'Cristal', 'Tratamientos', 'Receta', 'Datos'];

const GLASS_DESCRIPTIONS: Record<(typeof GLASS_TYPES)[number], string> = {
  Monofocal: 'Una sola distancia',
  Bifocal: 'Dos zonas: lejos y cerca',
  Progresivo: 'Lejos, media y cerca, sin líneas',
  'No estoy seguro': 'Prefiero orientación',
};

const TREATMENTS: { id: (typeof TREATMENT_IDS)[number]; name: string; desc: string }[] = [
  { id: 'azul', name: 'Filtro de luz azul', desc: 'Reduce la fatiga frente a pantallas.' },
  { id: 'ar', name: 'Antirreflejo', desc: 'Menos reflejos, visión más nítida.' },
  { id: 'foto', name: 'Fotocromático', desc: 'Se oscurece con la luz del sol.' },
  { id: 'uv', name: 'Protección UV', desc: 'Protege tus ojos de los rayos UV.' },
  { id: 'delgado', name: 'Cristales más delgados', desc: 'Alto índice, más livianos y estéticos.' },
  { id: 'raya', name: 'Resistente a rayaduras', desc: 'Capa dura para mayor durabilidad.' },
];

const PRESCRIPTION_DESCRIPTIONS: Record<(typeof PRESCRIPTION_ANSWERS)[number], string> = {
  Sí: 'Tengo una receta óptica vigente.',
  No: 'No tengo receta, solo quiero el armazón (o me orientan).',
  'No estoy seguro': 'Prefiero que me orienten al respecto.',
};

interface FrameOption {
  id: string;
  label: string;
  colors: { id: string; name: string; hex: string }[];
}

function choiceClass(active: boolean) {
  return `block rounded-2xl border-2 p-4.5 text-left transition-colors ${
    active ? 'border-fucsia bg-brand-gradient-soft' : 'border-line bg-white'
  }`;
}

export function QuoteWizard({
  frameOptions,
  initialProductId,
}: {
  frameOptions: FrameOption[];
  initialProductId?: string;
}) {
  const [step, setStep] = useState(1);
  const [frameChoice, setFrameChoice] = useState<'catalog' | 'advice' | ''>(initialProductId ? 'catalog' : '');
  const [frameProductId, setFrameProductId] = useState(initialProductId ?? '');
  const [frameProductColorId, setFrameProductColorId] = useState('');
  const [glassType, setGlassType] = useState<(typeof GLASS_TYPES)[number] | ''>('');
  const [treatments, setTreatments] = useState<string[]>([]);
  const [hasPrescription, setHasPrescription] = useState<(typeof PRESCRIPTION_ANSWERS)[number] | ''>('');
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionPreviewUrl, setPrescriptionPreviewUrl] = useState<string | null>(null);
  const [prescriptionError, setPrescriptionError] = useState('');
  const [prescriptionMessage, setPrescriptionMessage] = useState('');
  const [isDraggingPrescription, setIsDraggingPrescription] = useState(false);
  const prescriptionInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [comuna, setComuna] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');

  const [stepError, setStepError] = useState('');
  const [result, setResult] = useState<QuoteActionState>({ status: 'idle' });
  const [isPending, startTransition] = useTransition();

  const selectedFrame = frameOptions.find((option) => option.id === frameProductId);

  function toggleTreatment(id: string) {
    setTreatments((current) => (current.includes(id) ? current.filter((t) => t !== id) : [...current, id]));
  }

  // Changing (or clearing) the selected product always clears the color —
  // a color id only ever makes sense for the product it belongs to.
  function selectFrameProduct(productId: string) {
    setFrameProductId(productId);
    setFrameProductColorId('');
  }

  function clearPrescriptionFile() {
    if (prescriptionPreviewUrl) URL.revokeObjectURL(prescriptionPreviewUrl);
    setPrescriptionFile(null);
    setPrescriptionPreviewUrl(null);
    setPrescriptionError('');
    setPrescriptionMessage('');
    if (prescriptionInputRef.current) prescriptionInputRef.current.value = '';
  }

  // Switching away from "Sí" must drop any selected file entirely — never
  // upload it, never keep a hidden reference to it.
  function selectPrescriptionAnswer(answer: (typeof PRESCRIPTION_ANSWERS)[number]) {
    setHasPrescription(answer);
    if (answer !== 'Sí') clearPrescriptionFile();
  }

  function handlePrescriptionFile(file: File | null) {
    if (!file) return;
    const error = validatePrescriptionFile(file);
    if (error) {
      setPrescriptionError(error);
      setPrescriptionMessage('');
      return;
    }
    if (prescriptionPreviewUrl) URL.revokeObjectURL(prescriptionPreviewUrl);
    setPrescriptionFile(file);
    setPrescriptionPreviewUrl(file.type === 'application/pdf' ? null : URL.createObjectURL(file));
    setPrescriptionError('');
    setPrescriptionMessage('Receta adjuntada correctamente.');
  }

  function goNext() {
    if (step === 1 && (!frameChoice || (frameChoice === 'catalog' && !frameProductId))) {
      setStepError('Selecciona un modelo del catálogo o indica que necesitas asesoría.');
      return;
    }
    if (step === 1 && frameChoice === 'catalog' && !frameProductColorId) {
      setStepError('Selecciona un color para este modelo.');
      return;
    }
    if (step === 2 && !glassType) {
      setStepError('Selecciona un tipo de cristal.');
      return;
    }
    if (step === 4 && !hasPrescription) {
      setStepError('Indica si cuentas con una receta óptica vigente.');
      return;
    }
    setStepError('');
    setStep((current) => Math.min(current + 1, 5));
  }

  function goPrev() {
    setStepError('');
    setStep((current) => Math.max(current - 1, 1));
  }

  function handleSubmit() {
    startTransition(async () => {
      const formData = new FormData();
      if (hasPrescription === 'Sí' && prescriptionFile) {
        formData.set('prescriptionFile', prescriptionFile);
      }
      const response = await submitQuoteAction(
        {
          frameChoice,
          frameProductId: frameChoice === 'catalog' ? frameProductId : undefined,
          frameProductColorId: frameChoice === 'catalog' ? frameProductColorId : undefined,
          glassType,
          treatments,
          hasPrescription,
          name,
          phone,
          email,
          comuna,
          message,
          consent,
          website,
        },
        formData
      );
      // A failed submit (e.g. the attachment failed to upload) must keep
      // the form's data and the selected file intact so the visitor can
      // just retry, not start over.
      if (response.status !== 'error') clearPrescriptionFile();
      setResult(response);
    });
  }

  if (result.status === 'success') {
    return (
      <div className="mt-6.5 rounded-[22px] border border-line bg-white p-9 text-center shadow-brand sm:p-11">
        <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-success-bg">
          <CheckIcon className="h-9 w-9 text-success" />
        </div>
        <h2 className="text-2xl font-bold">¡Solicitud enviada!</h2>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-grafito">
          Gracias, {result.customerName}. Recibimos tu solicitud y te contactaremos con una cotización
          referencial. El valor final dependerá de tu receta, el armazón y los tratamientos seleccionados.
        </p>
        <div className="mt-6.5 flex flex-wrap justify-center gap-3">
          <LinkButton href={result.whatsappHref} variant="whatsapp">
            <WhatsAppIcon className="h-[18px] w-[18px]" />
            Continuar por WhatsApp
          </LinkButton>
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setFrameChoice('');
              setFrameProductId('');
              setFrameProductColorId('');
              setGlassType('');
              setTreatments([]);
              setHasPrescription('');
              clearPrescriptionFile();
              setName('');
              setPhone('');
              setEmail('');
              setComuna('');
              setMessage('');
              setConsent(false);
              setResult({ status: 'idle' });
            }}
            className="rounded-pill bg-gray px-6 py-3.5 font-semibold text-navy"
          >
            Nueva cotización
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="my-6.5 flex items-center gap-1.5">
        {STEP_LABELS.map((label, index) => {
          const n = index + 1;
          const done = n < step;
          const current = n === step;
          return (
            <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`flex h-[34px] w-[34px] items-center justify-center rounded-full text-sm font-semibold ${
                  current ? 'bg-fucsia text-white' : done ? 'bg-blue text-white' : 'bg-gray text-[#5b6b85]'
                }`}
              >
                {done ? '✓' : n}
              </div>
              <div
                className={`text-center text-[11px] font-semibold ${
                  current ? 'text-fucsia' : done ? 'text-blue' : 'text-[#5b6b85]'
                }`}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[22px] border border-line bg-white p-7.5 shadow-brand">
        {step === 1 ? (
          <div>
            <h3 className="text-xl font-semibold">1 · ¿Ya tienes un armazón elegido?</h3>
            <p className="mt-2 text-[14.5px] text-grafito">
              Selecciona un modelo del catálogo o pide asesoría para elegirlo juntos.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={frameChoice === 'catalog'}
                className={choiceClass(frameChoice === 'catalog')}
                onClick={() => setFrameChoice('catalog')}
              >
                <div className="font-semibold text-navy">Elegir del catálogo</div>
                <div className="mt-1 text-[13px] text-grafito">Escoge un modelo disponible</div>
              </button>
              <button
                type="button"
                aria-pressed={frameChoice === 'advice'}
                className={choiceClass(frameChoice === 'advice')}
                onClick={() => { setFrameChoice('advice'); selectFrameProduct(''); }}
              >
                <div className="font-semibold text-navy">Necesito asesoría</div>
                <div className="mt-1 text-[13px] text-grafito">Ayúdenme a elegir</div>
              </button>
            </div>
            {frameChoice === 'catalog' ? (
              <div className="mt-4.5">
                <div className="mb-2.5 text-[13px] font-semibold text-navy">Modelo seleccionado</div>
                <select
                  value={frameProductId}
                  onChange={(event) => selectFrameProduct(event.target.value)}
                  className="w-full rounded-input border border-line bg-white px-3.5 py-3 text-ink"
                >
                  <option value="">Selecciona un modelo…</option>
                  {frameOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {frameProductId ? (
                  <div className="mt-4">
                    <div className="mb-2.5 text-[13px] font-semibold text-navy">Color *</div>
                    {selectedFrame && selectedFrame.colors.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedFrame.colors.map((color) => {
                          const active = frameProductColorId === color.id;
                          return (
                            <button
                              key={color.id}
                              type="button"
                              onClick={() => setFrameProductColorId(color.id)}
                              aria-pressed={active}
                              className={`flex items-center gap-1.5 rounded-pill border-[1.5px] py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold ${
                                active ? 'border-fucsia bg-brand-gradient-soft text-fucsia' : 'border-line text-grafito'
                              }`}
                            >
                              <span
                                className="h-5 w-5 rounded-full border border-white shadow-[0_0_0_1px_#d7dceb]"
                                style={{ backgroundColor: color.hex }}
                              />
                              {color.name}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-input bg-gray px-3.5 py-3 text-[13px] text-grafito">
                        Este modelo todavía no tiene colores cargados — contáctanos por WhatsApp para revisar
                        las opciones disponibles.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <h3 className="text-xl font-semibold">2 · Tipo de cristal</h3>
            <p className="mt-2 text-[14.5px] text-grafito">
              Si no estás seguro, elige la última opción y te orientamos.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {GLASS_TYPES.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={glassType === option}
                  className={choiceClass(glassType === option)}
                  onClick={() => setGlassType(option)}
                >
                  <div className="font-semibold text-navy">{option}</div>
                  <div className="mt-1 text-[13px] text-grafito">{GLASS_DESCRIPTIONS[option]}</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <h3 className="text-xl font-semibold">3 · Tratamientos adicionales</h3>
            <p className="mt-2 text-[14.5px] text-grafito">Opcional · puedes elegir varios.</p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TREATMENTS.map((treatment) => {
                const active = treatments.includes(treatment.id);
                return (
                  <button
                    key={treatment.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleTreatment(treatment.id)}
                    className={`flex items-center justify-between rounded-2xl border-2 p-4 text-left transition-colors ${
                      active ? 'border-fucsia bg-brand-gradient-soft' : 'border-line bg-white'
                    }`}
                  >
                    <span className="font-semibold text-navy">{treatment.name}</span>
                    <span aria-hidden="true" className={`text-base font-bold text-fucsia ${active ? 'opacity-100' : 'opacity-0'}`}>
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div>
            <h3 className="text-xl font-semibold">4 · ¿Cuentas con una receta óptica vigente?</h3>
            <p className="mt-2 text-[14.5px] text-grafito">
              No necesitas adjuntar ningún archivo — si tienes receta, la revisamos contigo por WhatsApp.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PRESCRIPTION_ANSWERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={hasPrescription === option}
                  className={choiceClass(hasPrescription === option)}
                  onClick={() => selectPrescriptionAnswer(option)}
                >
                  <div className="font-semibold text-navy">{option}</div>
                  <div className="mt-1 text-[13px] text-grafito">{PRESCRIPTION_DESCRIPTIONS[option]}</div>
                </button>
              ))}
            </div>

            {hasPrescription === 'Sí' ? (
              <div className="mt-4.5 rounded-2xl border-2 border-line bg-white p-4.5">
                <h4 className="font-semibold text-navy">Adjunta tu receta óptica</h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-grafito">
                  Puedes subir una fotografía o un archivo PDF. También puedes continuar sin adjuntarla y
                  enviarla posteriormente.
                </p>

                {!prescriptionFile ? (
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDraggingPrescription(true);
                    }}
                    onDragLeave={() => setIsDraggingPrescription(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsDraggingPrescription(false);
                      handlePrescriptionFile(event.dataTransfer.files?.[0] ?? null);
                    }}
                    className={`mt-3.5 rounded-2xl border-2 border-dashed p-4 text-center transition-colors ${
                      isDraggingPrescription ? 'border-fucsia bg-brand-gradient-soft' : 'border-[#c7d2e8] bg-gray'
                    }`}
                  >
                    <p className="text-[13px] text-grafito">Arrastra tu receta aquí o selecciónala desde tu equipo.</p>
                    <button
                      type="button"
                      onClick={() => prescriptionInputRef.current?.click()}
                      className="mt-3 rounded-input bg-navy px-4.5 py-2.5 text-sm font-semibold text-white"
                    >
                      Seleccionar receta
                    </button>
                    <input
                      ref={prescriptionInputRef}
                      type="file"
                      accept={ATTACHMENT_ACCEPT}
                      className="hidden"
                      onChange={(event) => handlePrescriptionFile(event.target.files?.[0] ?? null)}
                    />
                    <p className="mt-2 text-[11px] text-[#5b6b85]">PDF, JPG, PNG o WEBP · máximo {ATTACHMENT_MAX_MB} MB</p>
                  </div>
                ) : (
                  <div className="mt-3.5 flex items-center gap-3 rounded-2xl border border-line bg-gray p-3">
                    {prescriptionPreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, next/image can't optimize it and doesn't need to
                      <img src={prescriptionPreviewUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-navy/10 text-[11px] font-bold text-navy">
                        PDF
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold text-navy">{prescriptionFile.name}</div>
                      <div className="text-xs text-[#5b6b85]">{formatFileSize(prescriptionFile.size)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => prescriptionInputRef.current?.click()}
                      className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy"
                    >
                      Reemplazar
                    </button>
                    <input
                      ref={prescriptionInputRef}
                      type="file"
                      accept={ATTACHMENT_ACCEPT}
                      className="hidden"
                      onChange={(event) => handlePrescriptionFile(event.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      onClick={clearPrescriptionFile}
                      aria-label="Quitar receta adjunta"
                      className="shrink-0 rounded-lg bg-error-bg px-3 py-2 text-xs font-semibold text-error"
                    >
                      Quitar
                    </button>
                  </div>
                )}

                <div aria-live="polite">
                  {prescriptionError ? (
                    <div className="mt-2.5 rounded-input bg-error-bg px-3 py-2 text-[12.5px] font-semibold text-error">
                      {prescriptionError}
                    </div>
                  ) : null}
                  {prescriptionMessage ? (
                    <div className="mt-2.5 rounded-input bg-success-bg px-3 py-2 text-[12.5px] font-semibold text-success">
                      {prescriptionMessage}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {step === 5 ? (
          <div>
            <h3 className="text-xl font-semibold">5 · Tus datos de contacto</h3>
            <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label htmlFor="quote-name" className="text-[13px] font-semibold text-navy">Nombre *</label>
                <input
                  id="quote-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Tu nombre"
                  className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
                />
              </div>
              <div>
                <label htmlFor="quote-phone" className="text-[13px] font-semibold text-navy">Teléfono *</label>
                <input
                  id="quote-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+56 9 ..."
                  className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
                />
              </div>
              <div>
                <label htmlFor="quote-email" className="text-[13px] font-semibold text-navy">Correo</label>
                <input
                  id="quote-email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="tucorreo@mail.cl"
                  className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
                />
              </div>
              <div>
                <label htmlFor="quote-comuna" className="text-[13px] font-semibold text-navy">Comuna</label>
                <input
                  id="quote-comuna"
                  value={comuna}
                  onChange={(event) => setComuna(event.target.value)}
                  placeholder="Ej: Providencia"
                  className="mt-1.5 w-full rounded-input border border-line bg-white px-3.5 py-3 outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="quote-message" className="text-[13px] font-semibold text-navy">Mensaje o requerimiento</label>
                <textarea
                  id="quote-message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Cuéntanos qué necesitas"
                  rows={3}
                  className="mt-1.5 w-full resize-y rounded-input border border-line bg-white px-3.5 py-3 outline-none"
                />
              </div>
              {/* Honeypot: hidden from sighted users and screen readers, never filled by a human. */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="quote-website">Sitio web</label>
                <input
                  id="quote-website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </div>
            </div>

            {hasPrescription === 'Sí' ? (
              <div className="mt-4.5 rounded-2xl bg-gray p-3.5 text-[13px] text-grafito">
                <div>
                  <span className="font-semibold text-navy">Tiene receta:</span> Sí
                </div>
                <div className="mt-1">
                  <span className="font-semibold text-navy">Archivo adjunto:</span>{' '}
                  {prescriptionFile ? prescriptionFile.name : 'No se adjuntó'}
                </div>
              </div>
            ) : null}

            <label className="mt-4.5 flex cursor-pointer items-start gap-2.5 text-[13px] text-grafito">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 accent-fucsia"
              />
              <span>
                Autorizo el tratamiento de mis datos personales para gestionar mi cotización y contacto,
                conforme a la Política de Privacidad (Ley N.° 19.628 y N.° 21.719). Puedo revocar esta
                autorización cuando quiera.
              </span>
            </label>

            <div aria-live="polite">
              {result.status === 'error' ? (
                <div className="mt-3.5 rounded-input bg-error-bg px-3.5 py-3 text-[13.5px] font-semibold text-error">
                  {result.formError ?? Object.values(result.fieldErrors)[0] ?? 'Revisa los datos ingresados.'}
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl bg-gray p-3.5 text-[13px] leading-relaxed text-grafito">
              Los precios son referenciales. La cotización final dependerá de la receta, el armazón y los
              tratamientos seleccionados.
            </div>
          </div>
        ) : null}

        <div aria-live="polite">
          {stepError ? (
            <div className="mt-3.5 rounded-input bg-error-bg px-3.5 py-3 text-[13.5px] font-semibold text-error">
              {stepError}
            </div>
          ) : null}
        </div>

        <div className="mt-6.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={step === 1}
            className="rounded-input bg-gray px-6 py-3 font-semibold text-navy disabled:opacity-40"
          >
            Atrás
          </button>
          <div className="flex items-center gap-2.5">
            <a
              href={defaultWhatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-input border-[1.5px] border-whatsapp px-4.5 py-3 font-semibold text-[#15803d] sm:inline-flex"
            >
              Continuar por WhatsApp
            </a>
            {step < 5 ? (
              <button type="button" onClick={goNext} className="rounded-input bg-navy px-7 py-3 font-semibold text-white">
                Continuar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!consent || isPending}
                className="rounded-input bg-brand-gradient px-7 py-3 font-semibold text-white shadow-brand-sm disabled:opacity-50"
              >
                {isPending ? 'Enviando…' : 'Solicitar cotización'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
