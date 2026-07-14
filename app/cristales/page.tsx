import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { PageHeroBand } from '@/components/PageHeroBand';
import { Card, IconBadge } from '@/components/Card';
import { LinkButton } from '@/components/Button';
import { InfoIcon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Tipos de cristales',
  description:
    'Entiende las diferencias entre cristales monofocales, bifocales y multifocales para elegir con confianza.',
};

const glassTypes = [
  {
    name: 'Monofocales',
    description: 'Corrigen una sola distancia, como visión de lejos o de cerca.',
  },
  {
    name: 'Bifocales',
    description: 'Permiten ver de lejos y de cerca mediante dos zonas de visión.',
  },
  {
    name: 'Multifocales',
    description: 'Ofrecen una transición progresiva para visión de lejos, intermedia y cercana.',
  },
];

const treatments = [
  { short: 'LB', name: 'Filtro de luz azul', description: 'Reduce la fatiga frente a pantallas.' },
  { short: 'AR', name: 'Antirreflejo', description: 'Menos reflejos, visión más nítida.' },
  { short: 'FC', name: 'Fotocromático', description: 'Se oscurece con la luz del sol.' },
  { short: 'UV', name: 'Protección UV', description: 'Protege tus ojos de los rayos UV.' },
  { short: 'HD', name: 'Cristales más delgados', description: 'Alto índice, más livianos y estéticos.' },
  { short: 'AR+', name: 'Resistente a rayaduras', description: 'Capa dura para mayor durabilidad.' },
];

const comparisonRows: { feature: string; mono: boolean; bi: boolean; multi: boolean }[] = [
  { feature: 'Ver de lejos', mono: true, bi: true, multi: true },
  { feature: 'Ver de cerca (lectura)', mono: false, bi: true, multi: true },
  { feature: 'Visión intermedia', mono: false, bi: false, multi: true },
  { feature: 'Un solo par para todo', mono: false, bi: true, multi: true },
  { feature: 'Transición sin líneas', mono: true, bi: false, multi: true },
];

function Mark({ value }: { value: boolean }) {
  return (
    <span className={value ? 'text-[#15803d]' : 'text-[#cfd6e6]'} aria-label={value ? 'Sí' : 'No'}>
      {value ? '✓' : '—'}
    </span>
  );
}

export default function CristalesPage() {
  return (
    <>
      <PageHeroBand
        align="center"
        containerSize="default"
        title="Tipos de cristales"
        description="Entiende las diferencias para elegir con confianza. Te orientamos según lo que necesitas."
      />

      <section className="py-11">
        <Container size="default">
          <div className="grid grid-cols-1 gap-5.5 sm:grid-cols-3">
            {glassTypes.map((type) => (
              <Card key={type.name} padding="lg">
                <IconBadge size="lg">
                  <span className="font-display text-lg font-bold text-blue">{type.name[0]}</span>
                </IconBadge>
                <h3 className="mt-4.5 text-xl font-bold">{type.name}</h3>
                <p className="mt-2.5 leading-relaxed text-grafito">{type.description}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-8">
        <Container size="default">
          <h2 className="mb-4.5 text-2xl font-bold">Tratamientos y opciones adicionales</h2>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {treatments.map((treatment) => (
              <div key={treatment.short} className="flex gap-3.5 rounded-2xl border border-line bg-white p-4.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient-soft font-display font-bold text-fucsia">
                  {treatment.short}
                </div>
                <div>
                  <div className="text-[15px] font-semibold text-navy">{treatment.name}</div>
                  <div className="mt-0.5 text-[13px] leading-snug text-grafito">{treatment.description}</div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-8">
        <Container size="default">
          <h2 className="mb-4.5 text-2xl font-bold">Compara y decide</h2>
          <div className="overflow-x-auto rounded-card border border-line shadow-brand-sm">
            <table className="w-full min-w-[560px] border-collapse bg-white">
              <thead>
                <tr className="bg-navy text-white">
                  <th className="p-4 text-left font-display text-sm font-semibold">Necesitas</th>
                  <th className="p-4 font-display text-sm font-semibold">Monofocal</th>
                  <th className="p-4 font-display text-sm font-semibold">Bifocal</th>
                  <th className="p-4 font-display text-sm font-semibold">Multifocal</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, index) => (
                  <tr key={row.feature} className={index % 2 ? 'bg-[#fafbfe]' : 'bg-white'}>
                    <td className="border-t border-[#eef1f8] p-3.5 px-4.5 text-sm font-semibold text-navy">
                      {row.feature}
                    </td>
                    <td className="border-t border-[#eef1f8] p-3.5 text-center text-lg">
                      <Mark value={row.mono} />
                    </td>
                    <td className="border-t border-[#eef1f8] p-3.5 text-center text-lg">
                      <Mark value={row.bi} />
                    </td>
                    <td className="border-t border-[#eef1f8] p-3.5 text-center text-lg">
                      <Mark value={row.multi} />
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

          <div className="mt-6.5 text-center">
            <LinkButton href="/cotizador" variant="gradient">
              Cotizar mis cristales
            </LinkButton>
          </div>
        </Container>
      </section>
    </>
  );
}
