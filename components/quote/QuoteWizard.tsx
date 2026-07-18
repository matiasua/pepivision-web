'use client';

import { useEffect, useMemo, useRef, useState, useTransition, type ReactElement, type ReactNode } from 'react';
import { LinkButton } from '@/components/Button';
import { CheckIcon, WhatsAppIcon } from '@/components/icons';
import {
  LensMonofocalIcon,
  LensBifocalIcon,
  LensProgresivoIcon,
  TreatmentAntiGlareIcon,
  TreatmentBlueLightIcon,
  TreatmentPhotochromicIcon,
  TreatmentUVIcon,
  TreatmentScratchResistantIcon,
  OptionHighIndexIcon,
  SunPolarizedIcon,
  SunGradientIcon,
  SunMirroredIcon,
  SunGraduatedIcon,
} from '@/components/icons';
import { defaultWhatsAppHref } from '@/lib/whatsapp';
import { PRESCRIPTION_ANSWERS } from '@/modules/requests/schemas';
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_BYTES } from '@/modules/storage/schemas';
import {
  LENS_MODALITY_LABELS,
  SUN_LENS_MODALITY_IDS,
  requiresPrescription as modalityRequiresPrescription,
  isLensModalitySelectable,
  isTreatmentSelectable,
  isAdditionalOptionSelectable,
  type LensModalityId,
  type QuoteOptions,
} from '@/modules/catalog/quote-options';
import { LENS_TYPES } from '@/modules/requests/lens-types';
import { TREATMENTS } from '@/modules/requests/treatments-content';
import { ADDITIONAL_OPTIONS } from '@/modules/requests/additional-options';
import {
  submitQuoteAction,
  getQuoteOfferingsForCategoryAction,
  getQuoteOfferingContextAction,
  type QuoteActionState,
} from '@/app/cotizador/actions';
import type { QuoteCategoryOption, QuoteOfferingContext, QuoteOfferingOption } from '@/modules/requests/quote-wizard-service';

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

// Contenido esquemático de las modalidades de lentes de sol (Fase 9 —
// motor de compatibilidades, sin equivalente en /cristales, que es
// exclusivamente óptico). Descripciones breves, consistentes con el tono
// ya aprobado de modules/requests/lens-types.ts.
const SUN_MODALITY_DESCRIPTIONS: Record<(typeof SUN_LENS_MODALITY_IDS)[number], string> = {
  'sin-graduacion': 'Cristal solar sin corrección visual — protección y estilo, sin receta.',
  'solar-monofocal': 'Protección solar con corrección de una sola distancia visual.',
  'solar-progresivo': 'Protección solar con transición gradual entre distancias, sin líneas visibles.',
};

const LENS_MODALITY_ICONS: Partial<Record<LensModalityId, (props: { className?: string }) => ReactElement>> = {
  monofocal: LensMonofocalIcon,
  bifocal: LensBifocalIcon,
  progresivo: LensProgresivoIcon,
};

const CONTENT_ICONS: Record<string, (props: { className?: string }) => ReactElement> = {
  'filtro-azul-violeta': TreatmentBlueLightIcon,
  antirreflejo: TreatmentAntiGlareIcon,
  fotocromatico: TreatmentPhotochromicIcon,
  'proteccion-uv': TreatmentUVIcon,
  'resistencia-rayaduras': TreatmentScratchResistantIcon,
  uv400: TreatmentUVIcon,
  'alto-indice': OptionHighIndexIcon,
  polarizado: SunPolarizedIcon,
  degradado: SunGradientIcon,
  espejado: SunMirroredIcon,
  'solar-graduado': SunGraduatedIcon,
};

const treatmentContentById = new Map<string, (typeof TREATMENTS)[number]>(TREATMENTS.map((t) => [t.id, t]));
const additionalOptionContentById = new Map<string, (typeof ADDITIONAL_OPTIONS)[number]>(ADDITIONAL_OPTIONS.map((o) => [o.id, o]));

type WizardStepId =
  | 'category'
  | 'offering'
  | 'color'
  | 'lens'
  | 'treatments'
  | 'additionalOptions'
  | 'prescription'
  | 'prescriptionAttachment'
  | 'contact'
  | 'summary';

const STEP_LABELS: Record<WizardStepId, string> = {
  category: 'Categoría',
  offering: 'Modelo',
  color: 'Color',
  lens: 'Cristal',
  treatments: 'Tratamientos',
  additionalOptions: 'Opciones',
  prescription: 'Receta',
  prescriptionAttachment: 'Adjunto',
  contact: 'Datos',
  summary: 'Resumen',
};

interface ComputeStepsInput {
  category: QuoteCategoryOption | null;
  frameChoice: 'catalog' | 'advice' | '';
  lensModality: string;
  effectiveOptions: QuoteOptions | null;
  hasPrescription: string;
}

/**
 * Fase 10 (design.md → "Precios y cotizador configurable", `STEP_DEFINITIONS`):
 * un único cálculo de pasos activos filtrado por `capabilities` — nunca
 * pasos hardcodeados por categoría. El paso "opciones adicionales" (10.3)
 * y la sustitución de "tinte" por ese mismo paso (las opciones de tinte de
 * Lentes de sol — degradado/espejado — ya viven ahí, ver design.md) son la
 * única desviación respecto al sketch original de tres categorías.
 */
function computeActiveSteps({ category, frameChoice, lensModality, effectiveOptions, hasPrescription }: ComputeStepsInput): WizardStepId[] {
  const steps: WizardStepId[] = ['category'];
  if (!category) return steps;
  const { capabilities } = category;
  steps.push('offering');
  if (frameChoice === 'catalog' && capabilities.requiresColor) steps.push('color');
  if (capabilities.allowsLensType) steps.push('lens');
  if (capabilities.allowsTreatments) {
    steps.push('treatments');
    if ((effectiveOptions?.additionalOptions.length ?? 0) > 0) steps.push('additionalOptions');
  }
  const needsPrescription = lensModality ? modalityRequiresPrescription(lensModality as LensModalityId) : true;
  const prescriptionActive = capabilities.allowsPrescription && (!capabilities.allowsLensType || needsPrescription);
  if (prescriptionActive) {
    steps.push('prescription');
    // El paso de adjunto solo tiene sentido cuando el visitante respondió
    // "Sí" — mismo criterio que el servidor exige en submitQuote (nunca se
    // pide ni se persiste un adjunto para una respuesta "No"/"No estoy
    // seguro").
    if (capabilities.allowsPrescriptionAttachment && hasPrescription === 'Sí') steps.push('prescriptionAttachment');
  }
  steps.push('contact', 'summary');
  return steps;
}

function Fieldset({ legend, hint, children }: { legend: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="text-xl font-semibold text-navy">{legend}</legend>
      {hint ? <p className="mt-2 text-[14.5px] text-grafito">{hint}</p> : null}
      <div className="mt-5">{children}</div>
    </fieldset>
  );
}

function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  icon,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description?: string;
  icon?: ReactElement;
}) {
  return (
    <label
      className={`peer-focus-visible:ring-2 flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4.5 transition-colors ${
        checked ? 'border-fucsia bg-brand-gradient-soft' : 'border-line bg-white'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        // El texto visible de esta opción combina título + descripción; el
        // nombre accesible del control debe ser solo el título (no
        // redundante — acota lo que ya es visible, en vez de repetirlo).
        aria-label={title}
        className="peer mt-1 h-4 w-4 shrink-0 accent-fucsia focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fucsia"
      />
      <span>
        {icon ? <span className="mb-1.5 block h-6 w-6 text-blue">{icon}</span> : null}
        <span className="block font-semibold text-navy">{title}</span>
        {description ? <span className="mt-1 block text-[13px] text-grafito">{description}</span> : null}
      </span>
    </label>
  );
}

function CheckboxCard({
  checked,
  onChange,
  title,
  description,
  badge,
  icon,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  description?: string;
  badge?: string;
  icon?: ReactElement;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4.5 transition-colors ${
        checked ? 'border-fucsia bg-brand-gradient-soft' : 'border-line bg-white'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={title}
        className="mt-1 h-4 w-4 shrink-0 rounded accent-fucsia focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fucsia"
      />
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          {icon ? <span className="h-5 w-5 shrink-0 text-blue">{icon}</span> : null}
          <span className="font-semibold text-navy">{title}</span>
          {badge ? (
            <span className="rounded-pill bg-[#eaf1fb] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-blue">
              {badge}
            </span>
          ) : null}
        </span>
        {description ? <span className="mt-1 block text-[13px] text-grafito">{description}</span> : null}
      </span>
    </label>
  );
}

export function QuoteWizard({
  categories,
  initialOffering,
}: {
  categories: QuoteCategoryOption[];
  initialOffering: QuoteOfferingContext | null;
}) {
  const [category, setCategory] = useState<QuoteCategoryOption | null>(initialOffering?.category ?? null);
  const [frameChoice, setFrameChoice] = useState<'catalog' | 'advice' | ''>(initialOffering ? 'catalog' : '');
  const [offeringOptions, setOfferingOptions] = useState<QuoteOfferingOption[]>([]);
  const [offeringId, setOfferingId] = useState(initialOffering?.offeringId ?? '');
  const [offeringContext, setOfferingContext] = useState<QuoteOfferingContext | null>(initialOffering);
  const [frameProductColorId, setFrameProductColorId] = useState('');
  const [lensModality, setLensModality] = useState('');
  const [treatments, setTreatments] = useState<string[]>([]);
  const [additionalOptions, setAdditionalOptions] = useState<string[]>([]);
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

  // Con una oferta ya resuelta server-side (llegó desde una ficha pública,
  // ver app/cotizador/page.tsx), la categoría ya es conocida — el wizard
  // arranca directamente en el paso "modelo" en vez de pedir elegirla de
  // nuevo (10.4).
  const [stepIndex, setStepIndex] = useState(initialOffering ? 1 : 0);
  const [stepError, setStepError] = useState('');
  const [clearedNotice, setClearedNotice] = useState('');
  const [result, setResult] = useState<QuoteActionState>({ status: 'idle' });
  const [isPending, startTransition] = useTransition();
  const [isLoadingOfferings, startLoadingOfferings] = useTransition();
  const [isLoadingContext, startLoadingContext] = useTransition();
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const effectiveOptions = offeringContext?.effectiveOptions ?? category?.quoteOptions ?? null;

  // Con una oferta preseleccionada, el <select> del paso "modelo" necesita
  // su lista de opciones para poder mostrarla ya elegida — se carga una
  // sola vez al montar, sin resetear offeringId/offeringContext (que ya
  // llegaron resueltos desde el servidor).
  useEffect(() => {
    if (initialOffering && category) {
      startLoadingOfferings(async () => {
        const response = await getQuoteOfferingsForCategoryAction(category.id);
        if (response.status === 'ok') setOfferingOptions(response.offerings);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe correr una vez, al montar.
  }, []);

  const steps = useMemo(
    () => computeActiveSteps({ category, frameChoice, lensModality, effectiveOptions, hasPrescription }),
    [category, frameChoice, lensModality, effectiveOptions, hasPrescription]
  );
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  // Cuando cambia la categoría: todas las selecciones dependientes del
  // producto/cristal quedan obsoletas — se limpian por completo y se
  // informa de forma accesible (10.9: "cambiar de Lentes ópticos a Lentes
  // de sol elimina bifocal, filtro azul-violeta y alto índice"). La
  // selección en sí solo actualiza el estado — nunca cambia de paso: eso
  // es responsabilidad exclusiva de "Continuar", igual que el resto de
  // los pasos de selección única del wizard (corrección de consistencia,
  // iteración correctiva de UX de la Fase 10).
  function selectCategory(next: QuoteCategoryOption) {
    if (category?.id === next.id) return;
    const isActualChange = category !== null;
    setCategory(next);
    setFrameChoice('');
    setOfferingId('');
    setOfferingContext(null);
    setOfferingOptions([]);
    setFrameProductColorId('');
    setLensModality('');
    setTreatments([]);
    setAdditionalOptions([]);
    setHasPrescription('');
    setStepError('');
    setClearedNotice(
      isActualChange ? `Cambiaste a "${next.name}" — se reiniciaron el modelo, el cristal y las opciones seleccionadas.` : ''
    );
  }

  function chooseFrameChoice(choice: 'catalog' | 'advice') {
    setFrameChoice(choice);
    setOfferingId('');
    setOfferingContext(null);
    setFrameProductColorId('');
    if (choice === 'catalog' && category && offeringOptions.length === 0) {
      startLoadingOfferings(async () => {
        const response = await getQuoteOfferingsForCategoryAction(category.id);
        if (response.status === 'ok') setOfferingOptions(response.offerings);
      });
    }
  }

  // Al cambiar de oferta: recalcula opciones efectivas y descarta
  // selecciones de cristal que ya no sean compatibles (10.9), con aviso.
  function selectOffering(nextOfferingId: string) {
    if (!category) return;
    setOfferingId(nextOfferingId);
    setFrameProductColorId('');
    startLoadingContext(async () => {
      const response = await getQuoteOfferingContextAction(category.id, nextOfferingId);
      if (response.status !== 'ok') {
        setOfferingContext(null);
        setStepError('No pudimos cargar las opciones disponibles para este modelo. Intenta nuevamente o contáctanos.');
        return;
      }
      const nextOptions = response.context.effectiveOptions;
      const removed: string[] = [];
      if (lensModality && !isLensModalitySelectable(nextOptions, lensModality)) {
        removed.push(LENS_MODALITY_LABELS[lensModality as LensModalityId] ?? lensModality);
        setLensModality('');
      }
      const keptTreatments = treatments.filter((id) => isTreatmentSelectable(nextOptions, id));
      if (keptTreatments.length !== treatments.length) {
        for (const id of treatments) if (!keptTreatments.includes(id)) removed.push(treatmentContentById.get(id)?.label ?? id);
        setTreatments(keptTreatments);
      }
      const keptOptions = additionalOptions.filter((id) => isAdditionalOptionSelectable(nextOptions, id));
      if (keptOptions.length !== additionalOptions.length) {
        for (const id of additionalOptions) if (!keptOptions.includes(id)) removed.push(additionalOptionContentById.get(id)?.label ?? id);
        setAdditionalOptions(keptOptions);
      }
      setOfferingContext(response.context);
      setClearedNotice(removed.length > 0 ? `Este modelo no admite: ${removed.join(', ')} — se quitaron de tu selección.` : '');
    });
  }

  function selectLensModality(next: string) {
    const nextRequiresPrescription = modalityRequiresPrescription(next as LensModalityId);
    if (lensModality && !nextRequiresPrescription && hasPrescription) {
      setClearedNotice('Esta modalidad es sin graduación — se quitó la información de receta ingresada.');
      setHasPrescription('');
      clearPrescriptionFile();
    } else {
      setClearedNotice('');
    }
    setLensModality(next);
  }

  function toggleTreatment(id: string) {
    setTreatments((current) => (current.includes(id) ? current.filter((t) => t !== id) : [...current, id]));
  }

  function toggleAdditionalOption(id: string) {
    setAdditionalOptions((current) => (current.includes(id) ? current.filter((t) => t !== id) : [...current, id]));
  }

  function clearPrescriptionFile() {
    if (prescriptionPreviewUrl) URL.revokeObjectURL(prescriptionPreviewUrl);
    setPrescriptionFile(null);
    setPrescriptionPreviewUrl(null);
    setPrescriptionError('');
    setPrescriptionMessage('');
    if (prescriptionInputRef.current) prescriptionInputRef.current.value = '';
  }

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

  // El foco se traslada al título del paso activo cada vez que cambia —
  // beneficia tanto a lectores de pantalla (aria-live ya anuncia el
  // cambio) como a navegación por teclado tras "Continuar"/"Atrás".
  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [currentStep]);

  function goNext() {
    if (currentStep === 'category' && !category) {
      setStepError('Selecciona una categoría para continuar.');
      return;
    }
    if (currentStep === 'offering') {
      if (!frameChoice) {
        setStepError('Selecciona un modelo del catálogo o indica que necesitas asesoría.');
        return;
      }
      if (frameChoice === 'catalog' && !offeringId) {
        setStepError('Selecciona un modelo del catálogo.');
        return;
      }
      if (frameChoice === 'catalog' && !offeringContext) {
        setStepError('Espera a que carguen las opciones de este modelo.');
        return;
      }
    }
    if (currentStep === 'color' && !frameProductColorId) {
      setStepError('Selecciona un color para este modelo.');
      return;
    }
    if (currentStep === 'lens' && !lensModality) {
      setStepError('Selecciona un tipo de cristal.');
      return;
    }
    if (currentStep === 'prescription' && !hasPrescription) {
      setStepError('Indica si cuentas con una receta óptica vigente.');
      return;
    }
    setStepError('');
    setClearedNotice('');
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function goPrev() {
    setStepError('');
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  function resolveLabel(kind: 'treatment' | 'option', id: string) {
    return kind === 'treatment' ? (treatmentContentById.get(id)?.label ?? id) : (additionalOptionContentById.get(id)?.label ?? id);
  }

  function handleSubmit() {
    startTransition(async () => {
      const formData = new FormData();
      if (hasPrescription === 'Sí' && prescriptionFile) {
        formData.set('prescriptionFile', prescriptionFile);
      }
      const response = await submitQuoteAction(
        {
          categoryId: category?.id,
          frameChoice,
          offeringId: frameChoice === 'catalog' ? offeringId : undefined,
          frameProductColorId: frameChoice === 'catalog' ? frameProductColorId : undefined,
          lensModality: lensModality || undefined,
          treatments,
          additionalOptions,
          hasPrescription: hasPrescription || undefined,
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
              setStepIndex(0);
              setCategory(null);
              setFrameChoice('');
              setOfferingId('');
              setOfferingContext(null);
              setFrameProductColorId('');
              setLensModality('');
              setTreatments([]);
              setAdditionalOptions([]);
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

  const selectedOfferingLabel = offeringOptions.find((o) => o.id === offeringId)?.label;

  return (
    <div>
      <nav aria-label="Progreso del cotizador" className="my-6.5">
        {/*
          Desktop/tablet (≥ sm, ≈640px): stepper horizontal completo, con
          nombre de cada paso sin abreviar. Oculto en mobile, donde no cabe
          sin recortar el último rótulo (defecto real encontrado en la
          revisión GUI — ver design.md → "Fase 10, iteración correctiva de
          UX").
        */}
        <div className="hidden items-center gap-1.5 overflow-x-auto sm:flex">
          {steps.map((id, index) => {
            const done = index < stepIndex;
            const current = index === stepIndex;
            return (
              <div key={id} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  aria-hidden="true"
                  className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
                    current ? 'bg-fucsia text-white' : done ? 'bg-blue text-white' : 'bg-gray text-[#5b6b85]'
                  }`}
                >
                  {done ? '✓' : index + 1}
                </div>
                <div className={`text-center text-[10.5px] font-semibold ${current ? 'text-fucsia' : done ? 'text-blue' : 'text-[#5b6b85]'}`}>
                  {STEP_LABELS[id]}
                </div>
              </div>
            );
          })}
        </div>

        {/*
          Mobile (< sm): indicador compacto — "Paso X de Y" + nombre
          completo del paso actual + barra de progreso semántica. Nunca
          recorta ni abrevia el nombre del paso; el total y la posición
          reflejan exactamente `steps` (la misma lista que alimenta el
          stepper de escritorio — una sola fuente, `computeActiveSteps()`).
        */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="font-semibold text-grafito">
              Paso {stepIndex + 1} de {steps.length}
            </span>
            <span className="font-bold text-navy">{STEP_LABELS[currentStep]}</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={stepIndex + 1}
            aria-valuetext={`Paso ${stepIndex + 1} de ${steps.length}: ${STEP_LABELS[currentStep]}`}
            className="mt-2 h-2 w-full overflow-hidden rounded-pill bg-gray"
          >
            <div
              className="h-full rounded-pill bg-brand-gradient transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </nav>

      <div aria-live="polite" className="sr-only">
        {clearedNotice}
      </div>

      <div className="rounded-[22px] border border-line bg-white p-7.5 shadow-brand">
        {currentStep === 'category' ? (
          <Fieldset legend={`${stepIndex + 1} · ¿Qué necesitas cotizar?`}>
            <h2 ref={stepHeadingRef} tabIndex={-1} className="sr-only">
              ¿Qué necesitas cotizar?
            </h2>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {categories.map((option) => (
                <RadioCard
                  key={option.id}
                  name="category"
                  value={option.id}
                  checked={category?.id === option.id}
                  onChange={() => selectCategory(option)}
                  title={option.name}
                />
              ))}
            </div>
          </Fieldset>
        ) : null}

        {currentStep === 'offering' && category ? (
          <div>
            <h3 ref={stepHeadingRef} tabIndex={-1} className="text-xl font-semibold">
              {stepIndex + 1} · ¿Ya tienes un modelo elegido?
            </h3>
            <p className="mt-2 text-[14.5px] text-grafito">
              Selecciona un modelo del catálogo de {category.name} o pide asesoría para elegirlo juntos.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <RadioCard
                name="frameChoice"
                value="catalog"
                checked={frameChoice === 'catalog'}
                onChange={() => chooseFrameChoice('catalog')}
                title="Elegir del catálogo"
                description="Escoge un modelo disponible"
              />
              <RadioCard
                name="frameChoice"
                value="advice"
                checked={frameChoice === 'advice'}
                onChange={() => chooseFrameChoice('advice')}
                title="Necesito asesoría"
                description="Ayúdenme a elegir"
              />
            </div>

            {frameChoice === 'catalog' ? (
              <div className="mt-4.5">
                <label htmlFor="quote-offering" className="mb-2.5 block text-[13px] font-semibold text-navy">
                  Modelo seleccionado
                </label>
                <select
                  id="quote-offering"
                  value={offeringId}
                  onChange={(event) => selectOffering(event.target.value)}
                  disabled={isLoadingOfferings}
                  className="w-full rounded-input border border-line bg-white px-3.5 py-3 text-ink"
                >
                  <option value="">{isLoadingOfferings ? 'Cargando modelos…' : 'Selecciona un modelo…'}</option>
                  {offeringOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {isLoadingContext ? <p className="mt-2 text-[13px] text-grafito">Cargando opciones disponibles…</p> : null}
                {offeringId && !isLoadingContext && !offeringContext ? (
                  <div role="alert" className="mt-2.5 rounded-input bg-error-bg px-3.5 py-3 text-[13.5px] font-semibold text-error">
                    No pudimos cargar las opciones disponibles para este modelo. Intenta nuevamente o contáctanos.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {currentStep === 'color' && offeringContext ? (
          <Fieldset legend={`${stepIndex + 1} · Color`} hint="Selecciona el color de tu modelo.">
            <h2 ref={stepHeadingRef} tabIndex={-1} className="sr-only">
              Color
            </h2>
            {offeringContext.product.colors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {offeringContext.product.colors.map((color) => {
                  const active = frameProductColorId === color.id;
                  return (
                    <label
                      key={color.id}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-pill border-[1.5px] py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold ${
                        active ? 'border-fucsia bg-brand-gradient-soft text-fucsia' : 'border-line text-grafito'
                      }`}
                    >
                      <input
                        type="radio"
                        name="color"
                        className="sr-only"
                        checked={active}
                        onChange={() => setFrameProductColorId(color.id)}
                      />
                      <span
                        aria-hidden="true"
                        className="h-5 w-5 rounded-full border border-white shadow-[0_0_0_1px_#d7dceb]"
                        style={{ backgroundColor: color.hex }}
                      />
                      {color.name}
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-input bg-gray px-3.5 py-3 text-[13px] text-grafito">
                Este modelo todavía no tiene colores cargados — contáctanos por WhatsApp para revisar las opciones
                disponibles.
              </div>
            )}
          </Fieldset>
        ) : null}

        {currentStep === 'lens' && effectiveOptions ? (
          <Fieldset legend={`${stepIndex + 1} · Tipo de cristal`} hint="Elige la modalidad que corresponda a tu receta.">
            <h2 ref={stepHeadingRef} tabIndex={-1} className="sr-only">
              Tipo de cristal
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {effectiveOptions.lensTypes.map((id) => {
                const isOptical = (LENS_TYPES as readonly string[]).includes(id);
                const description = isOptical
                  ? undefined
                  : SUN_MODALITY_DESCRIPTIONS[id as (typeof SUN_LENS_MODALITY_IDS)[number]];
                const Icon = LENS_MODALITY_ICONS[id as LensModalityId];
                return (
                  <RadioCard
                    key={id}
                    name="lensModality"
                    value={id}
                    checked={lensModality === id}
                    onChange={() => selectLensModality(id)}
                    title={LENS_MODALITY_LABELS[id as LensModalityId] ?? id}
                    description={description}
                    icon={Icon ? <Icon className="h-6 w-6" /> : undefined}
                  />
                );
              })}
            </div>
          </Fieldset>
        ) : null}

        {currentStep === 'treatments' && effectiveOptions ? (
          <Fieldset legend={`${stepIndex + 1} · Tratamientos`} hint="Opcional · puedes elegir varios.">
            <h2 ref={stepHeadingRef} tabIndex={-1} className="sr-only">
              Tratamientos
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {effectiveOptions.treatments.map((id) => {
                const content = treatmentContentById.get(id);
                const Icon = CONTENT_ICONS[id];
                return (
                  <CheckboxCard
                    key={id}
                    checked={treatments.includes(id)}
                    onChange={() => toggleTreatment(id)}
                    title={content?.label ?? id}
                    description={content?.description}
                    icon={Icon ? <Icon className="h-5 w-5" /> : undefined}
                  />
                );
              })}
            </div>
          </Fieldset>
        ) : null}

        {currentStep === 'additionalOptions' && effectiveOptions ? (
          <Fieldset legend={`${stepIndex + 1} · Opciones adicionales`} hint="Decisiones estructurales del cristal — opcional.">
            <h2 ref={stepHeadingRef} tabIndex={-1} className="sr-only">
              Opciones adicionales
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {effectiveOptions.additionalOptions.map((id) => {
                const content = additionalOptionContentById.get(id);
                const Icon = CONTENT_ICONS[id];
                return (
                  <CheckboxCard
                    key={id}
                    checked={additionalOptions.includes(id)}
                    onChange={() => toggleAdditionalOption(id)}
                    title={content?.label ?? id}
                    description={content?.description}
                    badge="Opción adicional"
                    icon={Icon ? <Icon className="h-5 w-5" /> : undefined}
                  />
                );
              })}
            </div>
          </Fieldset>
        ) : null}

        {currentStep === 'prescription' ? (
          <div>
            <h3 ref={stepHeadingRef} tabIndex={-1} className="text-xl font-semibold">
              {stepIndex + 1} · ¿Cuentas con una receta óptica vigente?
            </h3>
            <p className="mt-2 text-[14.5px] text-grafito">
              No necesitas adjuntar ningún archivo todavía — si tienes receta, la revisamos contigo por WhatsApp.
            </p>
            <fieldset className="mt-5">
              <legend className="sr-only">Receta óptica</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {PRESCRIPTION_ANSWERS.map((option) => (
                  <RadioCard
                    key={option}
                    name="hasPrescription"
                    value={option}
                    checked={hasPrescription === option}
                    onChange={() => selectPrescriptionAnswer(option)}
                    title={option}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {currentStep === 'prescriptionAttachment' ? (
          <div>
            <h3 ref={stepHeadingRef} tabIndex={-1} className="text-xl font-semibold">
              {stepIndex + 1} · Adjunta tu receta óptica
            </h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-grafito">
              Puedes subir una fotografía o un archivo PDF. También puedes continuar sin adjuntarla y enviarla
              posteriormente.
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
                className={`mt-4 rounded-2xl border-2 border-dashed p-4 text-center transition-colors ${
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
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-gray p-3">
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

        {currentStep === 'contact' ? (
          <div>
            <h3 ref={stepHeadingRef} tabIndex={-1} className="text-xl font-semibold">
              {stepIndex + 1} · Tus datos de contacto
            </h3>
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
          </div>
        ) : null}

        {currentStep === 'summary' ? (
          <div>
            <h3 ref={stepHeadingRef} tabIndex={-1} className="text-xl font-semibold">
              {stepIndex + 1} · Resumen de tu solicitud
            </h3>
            <div className="mt-4.5 flex flex-col gap-1.5 rounded-2xl bg-gray p-4 text-[13.5px] text-grafito">
              <div><span className="font-semibold text-navy">Categoría:</span> <span>{category?.name}</span></div>
              <div>
                <span className="font-semibold text-navy">Modelo:</span>{' '}
                <span>{frameChoice === 'advice' ? 'Necesita asesoría' : (selectedOfferingLabel ?? '—')}</span>
              </div>
              {offeringContext?.product.colors.find((c) => c.id === frameProductColorId) ? (
                <div>
                  <span className="font-semibold text-navy">Color:</span>{' '}
                  <span>{offeringContext.product.colors.find((c) => c.id === frameProductColorId)?.name}</span>
                </div>
              ) : null}
              {lensModality ? (
                <div><span className="font-semibold text-navy">Tipo de cristal:</span> <span>{LENS_MODALITY_LABELS[lensModality as LensModalityId]}</span></div>
              ) : null}
              {treatments.length > 0 ? (
                <div><span className="font-semibold text-navy">Tratamientos:</span> <span>{treatments.map((id) => resolveLabel('treatment', id)).join(', ')}</span></div>
              ) : null}
              {additionalOptions.length > 0 ? (
                <div><span className="font-semibold text-navy">Opciones adicionales:</span> <span>{additionalOptions.map((id) => resolveLabel('option', id)).join(', ')}</span></div>
              ) : null}
              {hasPrescription ? (
                <div><span className="font-semibold text-navy">Receta óptica:</span> <span>{hasPrescription}</span></div>
              ) : null}
            </div>

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

        <div aria-live="assertive">
          {stepError ? (
            <div role="alert" className="mt-3.5 rounded-input bg-error-bg px-3.5 py-3 text-[13.5px] font-semibold text-error">
              {stepError}
            </div>
          ) : null}
        </div>

        <div className="mt-6.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={stepIndex === 0}
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
            {currentStep !== 'summary' ? (
              <button
                type="button"
                onClick={goNext}
                disabled={currentStep === 'category' && !category}
                className="rounded-input bg-navy px-7 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
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
