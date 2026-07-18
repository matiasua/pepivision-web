import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import { Container } from '@/components/Container';
import { LinkButton } from '@/components/Button';
import { IconBadge } from '@/components/Card';
import {
  InfoIcon,
  CheckIcon,
  GlassesHeroIcon,
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
import {
  LENS_TYPES,
  LENS_TYPE_LABELS_PLURAL,
  LENS_TYPE_DESCRIPTIONS,
  LENS_TYPE_DETAILS,
  LENS_COMPARISON_TABLE,
  LENS_COMPARISON_SUMMARY,
} from '@/modules/requests/lens-types';
import { TREATMENTS } from '@/modules/requests/treatments-content';
import { ADDITIONAL_OPTIONS } from '@/modules/requests/additional-options';

export const metadata: Metadata = {
  title: 'Tipos de cristales',
  description:
    'Entiende las diferencias entre cristales monofocales, bifocales y progresivos, además de los tratamientos y opciones adicionales disponibles.',
};

// Iconografía esquemática (Fase 7, iteración correctiva de interfaz) — la
// familia de iconos/ilustraciones final pertenece a
// improve-visual-identity-and-content; esto reutiliza únicamente glifos
// simples ya definidos en components/icons.tsx, sin nueva dependencia.
const LENS_ICONS: Record<(typeof LENS_TYPES)[number], (props: { className?: string }) => ReactElement> = {
  monofocal: LensMonofocalIcon,
  bifocal: LensBifocalIcon,
  progresivo: LensProgresivoIcon,
};

type ContentKind = 'treatment' | 'option';
interface ContentRef {
  kind: ContentKind;
  id: string;
}
interface ResolvedContent {
  kind: ContentKind;
  id: string;
  label: string;
  description: string;
}

const treatmentById = new Map<string, (typeof TREATMENTS)[number]>(TREATMENTS.map((t) => [t.id, t]));
const optionById = new Map<string, (typeof ADDITIONAL_OPTIONS)[number]>(ADDITIONAL_OPTIONS.map((o) => [o.id, o]));

// Sección "Tratamientos principales" (design.md → "Sección pública
// 'tratamientos y opciones'"): mezcla deliberada de 5 tratamientos + 1
// opción adicional (alto índice) por relevancia comercial — el dominio
// sigue modelándolos por separado (treatments-content.ts /
// additional-options.ts); esta mezcla es puramente de presentación, cada
// tarjeta declara su tipo real.
const FEATURED: ContentRef[] = [
  { kind: 'treatment', id: 'filtro-azul-violeta' },
  { kind: 'treatment', id: 'antirreflejo' },
  { kind: 'treatment', id: 'fotocromatico' },
  { kind: 'treatment', id: 'proteccion-uv' },
  { kind: 'option', id: 'alto-indice' },
  { kind: 'treatment', id: 'resistencia-rayaduras' },
];

// Segunda iteración correctiva de interfaz (rechazo estético del
// propietario sobre 7.9): propuestas de valor breves en el hero — texto
// derivado del contenido ya aprobado más abajo en la página, ninguna
// afirmación nueva.
const HERO_HIGHLIGHTS = [
  'Monofocales, bifocales y progresivos',
  'Tratamientos y opciones para lentes de sol',
  'Cotización guiada por WhatsApp',
] as const;

// "Opciones para lentes de sol": únicamente opciones adicionales
// orientadas a lentes de sol — alto índice y tratamientos ópticos
// generales quedan fuera de esta sección a propósito.
const SUN_OPTIONS: ContentRef[] = [
  { kind: 'option', id: 'polarizado' },
  { kind: 'option', id: 'degradado' },
  { kind: 'option', id: 'espejado' },
  { kind: 'option', id: 'solar-graduado' },
];

const CONTENT_ICONS: Record<string, (props: { className?: string }) => ReactElement> = {
  'filtro-azul-violeta': TreatmentBlueLightIcon,
  antirreflejo: TreatmentAntiGlareIcon,
  fotocromatico: TreatmentPhotochromicIcon,
  'proteccion-uv': TreatmentUVIcon,
  'resistencia-rayaduras': TreatmentScratchResistantIcon,
  'alto-indice': OptionHighIndexIcon,
  polarizado: SunPolarizedIcon,
  degradado: SunGradientIcon,
  espejado: SunMirroredIcon,
  'solar-graduado': SunGraduatedIcon,
};

function resolveContent(ref: ContentRef): ResolvedContent {
  const item = ref.kind === 'treatment' ? treatmentById.get(ref.id) : optionById.get(ref.id);
  if (!item) throw new Error(`Contenido de /cristales no encontrado: ${ref.kind} ${ref.id}`);
  return { kind: ref.kind, id: ref.id, label: item.label, description: item.description };
}

function KindBadge({ kind }: { kind: ContentKind }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-pill px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${
        // text-fucsia (#d1127a) sobre bg-[#fdeaf4] mide 4.47:1 — bajo el
        // mínimo AA de 4.5:1 para texto de este tamaño (hallado por axe).
        // #b30f68 (mismo tono, más oscuro) sobre el mismo fondo mide 5.73:1.
        kind === 'treatment' ? 'bg-[#eaf1fb] text-blue' : 'bg-[#fdeaf4] text-[#b30f68]'
      }`}
    >
      {kind === 'treatment' ? 'Tratamiento' : 'Opción adicional'}
    </span>
  );
}

// Fila de lista (icono + nombre + badge + descripción) para "Tratamientos
// principales" — reemplaza la grilla de 6 tarjetas idénticas de 7.9 por un
// único contenedor con divisores internos: menos repetición de caja, misma
// información por ítem, mismo contenido funcional.
function TreatmentRow({ item }: { item: ResolvedContent }) {
  const Icon = CONTENT_ICONS[item.id];
  return (
    <div className="flex items-start gap-3.5 p-5">
      <IconBadge>
        <Icon className="h-5 w-5 text-blue" />
      </IconBadge>
      <div className="min-w-0 pt-0.5">
        <span className="text-[15px] font-semibold text-navy">{item.label}</span>
        <div className="mt-1">
          <KindBadge kind={item.kind} />
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-grafito">{item.description}</p>
      </div>
    </div>
  );
}

function ContentCard({ item, accent = 'default' }: { item: ResolvedContent; accent?: 'default' | 'sun' }) {
  const Icon = CONTENT_ICONS[item.id];
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-brand-sm transition-transform duration-150 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <IconBadge>
          <Icon className={`h-6 w-6 ${accent === 'sun' ? 'text-fucsia' : 'text-blue'}`} />
        </IconBadge>
        <KindBadge kind={item.kind} />
      </div>
      <div>
        <div className="text-[15px] font-semibold text-navy">{item.label}</div>
        <p className="mt-1 text-[13px] leading-relaxed text-grafito">{item.description}</p>
      </div>
    </div>
  );
}

export default function CristalesPage() {
  const featured = FEATURED.map(resolveContent);
  const sunOptions = SUN_OPTIONS.map(resolveContent);

  return (
    <>
      {/* Hero — dos columnas en desktop: copy comercial + recurso visual sutil. */}
      <section className="bg-brand-gradient-soft">
        <Container size="default" className="grid grid-cols-1 items-center gap-8 py-11 sm:py-13 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
          <div>
            <h1 className="text-[32px] font-bold sm:text-[40px]">Tipos de cristales</h1>
            <p className="mt-3.5 max-w-lg text-[17px] leading-relaxed text-grafito">
              Elige con confianza. Te explicamos las diferencias entre cada tipo de cristal y los tratamientos que
              puedes sumar, según tu receta y estilo de vida.
            </p>
            <div className="mt-6">
              <LinkButton href="/cotizador" variant="gradient">
                Cotizar mis cristales
              </LinkButton>
            </div>
            <ul className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
              {HERO_HIGHLIGHTS.map((highlight) => (
                <li key={highlight} className="flex items-center gap-1.5 text-[13.5px] font-semibold text-navy">
                  <CheckIcon className="h-4 w-4 shrink-0 text-fucsia" />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden justify-center lg:flex" aria-hidden="true">
            <GlassesHeroIcon className="h-auto w-full max-w-[280px] text-blue" />
          </div>
        </Container>
      </section>

      {/* Tipos de cristales */}
      <section className="py-11">
        <Container size="default">
          <div className="grid grid-cols-1 gap-5.5 sm:grid-cols-3">
            {LENS_TYPES.map((type) => {
              const Icon = LENS_ICONS[type];
              return (
                <div
                  key={type}
                  className="flex h-full flex-col rounded-card border border-line bg-white p-7 shadow-brand-sm transition-transform duration-150 hover:-translate-y-1"
                >
                  <IconBadge size="lg">
                    <Icon className="h-7 w-7 text-blue" />
                  </IconBadge>
                  <h2 className="mt-4.5 text-xl font-bold">{LENS_TYPE_LABELS_PLURAL[type]}</h2>
                  <p className="mt-2.5 leading-relaxed text-grafito">{LENS_TYPE_DESCRIPTIONS[type]}</p>
                  <ul className="mt-3.5 space-y-1.5 text-[13.5px] leading-snug text-grafito">
                    {LENS_TYPE_DETAILS[type].map((detail) => (
                      <li key={detail} className="flex gap-1.5">
                        <span aria-hidden="true" className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-fucsia" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Tabla comparativa */}
      <section className="py-8">
        <Container size="default">
          <div className="rounded-card border border-line bg-white p-6 shadow-brand-sm sm:p-8">
            <h2 className="text-2xl font-bold">Compara y decide</h2>
            <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-grafito">{LENS_COMPARISON_SUMMARY}</p>

            <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[520px] border-collapse bg-white text-[13.5px] sm:text-sm">
                <caption className="sr-only">
                  Comparación entre cristales monofocales, bifocales y progresivos según cinco características.
                </caption>
                <thead>
                  <tr className="bg-navy text-white">
                    <th scope="col" className="p-3.5 text-left font-display font-semibold sm:p-4">
                      Característica
                    </th>
                    <th scope="col" className="p-3.5 font-display font-semibold sm:p-4">
                      Monofocal
                    </th>
                    <th scope="col" className="p-3.5 font-display font-semibold sm:p-4">
                      Bifocal
                    </th>
                    <th scope="col" className="p-3.5 font-display font-semibold sm:p-4">
                      Progresivo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {LENS_COMPARISON_TABLE.map((row, index) => (
                    <tr key={row.feature} className={index % 2 ? 'bg-[#fafbfe]' : 'bg-white'}>
                      <th
                        scope="row"
                        className="border-t border-[#eef1f8] p-3.5 text-left font-semibold text-navy sm:p-4"
                      >
                        {row.feature}
                      </th>
                      <td className="border-t border-[#eef1f8] p-3.5 text-center sm:p-4">
                        <ValuePill value={row.values.monofocal} />
                      </td>
                      <td className="border-t border-[#eef1f8] p-3.5 text-center sm:p-4">
                        <ValuePill value={row.values.bifocal} />
                      </td>
                      <td className="border-t border-[#eef1f8] p-3.5 text-center sm:p-4">
                        <ValuePill value={row.values.progresivo} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5.5 flex gap-3 rounded-2xl bg-brand-gradient-soft p-5">
              <InfoIcon className="h-5 w-5 shrink-0 text-blue" />
              <p className="text-[14.5px] leading-relaxed text-grafito">
                La elección definitiva debe realizarse según la receta y las recomendaciones de un profesional
                de la salud visual.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Tratamientos principales */}
      <section className="py-8">
        <Container size="default">
          <h2 className="text-2xl font-bold">Tratamientos y opciones para tus cristales</h2>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-grafito">
            Los tratamientos son recubrimientos de superficie; las opciones adicionales son decisiones estructurales
            del cristal (grosor, tinte, terminación). Puedes combinar varios según tu receta y estilo de vida.
          </p>

          <h3 className="mb-3.5 mt-6 text-[13px] font-semibold uppercase tracking-wide text-grafito">
            Tratamientos principales
          </h3>
          <div className="overflow-hidden rounded-card border border-line bg-white shadow-brand-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x sm:divide-line">
              {[featured.slice(0, 3), featured.slice(3)].map((column, columnIndex) => (
                <div key={columnIndex} className="divide-y divide-line">
                  {column.map((item) => (
                    <TreatmentRow key={item.id} item={item} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Opciones para lentes de sol — contenedor propio, acento solar */}
      <section className="py-8">
        <Container size="default">
          <div className="rounded-card bg-brand-gradient-soft p-6 sm:p-8">
            <h2 className="text-2xl font-bold">Opciones para lentes de sol</h2>
            <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-grafito">
              Estas alternativas corresponden principalmente a lentes solares y dependen de la compatibilidad de
              cada modelo y receta.
            </p>
            <div className="mt-5.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              {sunOptions.map((item) => (
                <ContentCard key={item.id} item={item} accent="sun" />
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* CTA final */}
      <section className="py-8 pb-12">
        <Container size="default">
          <div className="rounded-card bg-brand-gradient px-6 py-9 text-center text-white shadow-brand sm:px-10">
            <h2 className="text-2xl font-bold sm:text-[28px]">Encuentra los cristales adecuados para ti</h2>
            <p className="mx-auto mt-2.5 max-w-lg text-[15px] leading-relaxed text-white/90">
              Cuéntanos qué necesitas y te ayudaremos a elegir una alternativa acorde con tu receta y estilo de vida.
            </p>
            <div className="mt-6">
              <LinkButton href="/cotizador" variant="primary" className="!bg-white !text-navy">
                Cotizar mis cristales
              </LinkButton>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

function ValuePill({ value }: { value: boolean }) {
  return (
    <span
      className={`inline-flex min-w-[2.75rem] items-center justify-center rounded-pill px-2.5 py-1 text-[12.5px] font-semibold ${
        value ? 'bg-success-bg text-success' : 'bg-gray text-grafito'
      }`}
    >
      {value ? 'Sí' : 'No'}
    </span>
  );
}
