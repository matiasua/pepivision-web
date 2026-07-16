import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { SectionHeading } from '@/components/SectionHeading';
import { Eyebrow } from '@/components/Eyebrow';
import { Card, IconBadge } from '@/components/Card';
import { LinkButton } from '@/components/Button';
import { BrandCarousel } from '@/components/BrandCarousel';
import { WhatsAppIcon, ChevronRightIcon, CheckIcon } from '@/components/icons';
import { defaultWhatsAppHref } from '@/lib/whatsapp';
import { getBrandLogos } from '@/lib/brands';
import { isHomeVisitEnabled } from '@/lib/feature-flags';

// No title override here: the homepage should show the root layout's
// branded default title ("Pepi Visión 360 · Ver bien nunca fue tan
// fácil"), not "Inicio · Pepi Visión 360" via the template.
export const metadata: Metadata = {
  description:
    'Armazones modernos, cristales personalizados y atención cercana, sin salir de casa. Cotiza tus lentes por WhatsApp.',
};

const BASE_BENEFITS = [
  {
    title: 'Atención personalizada',
    description: 'Te acompañamos a elegir lo que mejor se adapta a ti.',
  },
  {
    title: 'Lentes según tu receta',
    description: 'Cristales preparados a la medida de tu necesidad visual.',
  },
  {
    title: 'Modelos modernos',
    description: 'Armazones con estilo, para todos los gustos y edades.',
  },
];

const HOME_VISIT_BENEFIT = {
  title: 'Servicio a domicilio',
  description: 'Llevamos la atención hasta donde estés, con coordinación previa.',
};

const QUOTE_BENEFIT = {
  title: 'Cotización rápida',
  description: 'Recibe tu presupuesto por WhatsApp en pocos pasos.',
};

const quoteSteps = ['Armazón', 'Cristal', 'Tratamientos', 'Receta', 'Datos'];

export default function Home() {
  const brandLogos = getBrandLogos();
  const homeVisitEnabled = isHomeVisitEnabled();
  const benefits = homeVisitEnabled
    ? [...BASE_BENEFITS, HOME_VISIT_BENEFIT, QUOTE_BENEFIT]
    : [...BASE_BENEFITS, QUOTE_BENEFIT];

  return (
    <>
      {/* Hero */}
      <section className="bg-brand-gradient-soft">
        <Container className="grid grid-cols-1 items-center gap-12 py-16 pb-18 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Eyebrow
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <path d="M12 5c-5 0-8.5 4.2-9.5 6.3-.3.5-.3 1 0 1.4C3.5 14.8 7 19 12 19s8.5-4.2 9.5-6.3c.3-.4.3-.9 0-1.4C20.5 9.2 17 5 12 5Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              }
            >
              Óptica virtual · Chile
            </Eyebrow>
            <h1 className="mt-5 text-[36px] font-bold leading-tight tracking-tight sm:text-[52px]">
              Encuentra los lentes <span className="text-fucsia">perfectos</span> para ti
            </h1>
            <p className="mt-4.5 max-w-lg text-lg leading-relaxed text-grafito sm:text-[19px]">
              Armazones modernos, cristales personalizados y atención cercana, sin salir de casa.
            </p>
            <div className="mt-7.5 flex flex-wrap gap-3.5">
              <LinkButton href="/catalogo" variant="primary">
                Ver catálogo
                <ChevronRightIcon className="h-[18px] w-[18px]" />
              </LinkButton>
              <LinkButton href={defaultWhatsAppHref} variant="whatsapp">
                <WhatsAppIcon className="h-[19px] w-[19px]" />
                Cotizar por WhatsApp
              </LinkButton>
            </div>
            <div className="mt-6.5 flex items-center gap-2.5 font-semibold text-navy">
              <CheckIcon className="h-5 w-5 text-fucsia" />
              Ver bien nunca fue tan fácil.
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rotate-[-3deg] rounded-[36px] bg-brand-gradient opacity-15" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-[#dfe7f5] shadow-brand">
              <div className="flex h-full w-full items-center justify-center text-sm text-grafito">
                Foto: persona con lentes modernos
              </div>
            </div>
            {homeVisitEnabled ? (
              <div className="absolute -left-3.5 bottom-4.5 flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-brand">
                <IconBadge>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-blue)" strokeWidth={2}>
                    <circle cx="7" cy="14" r="4" />
                    <circle cx="17" cy="14" r="4" />
                    <path d="M11 14a1 1 0 0 1 2 0M3 11l2-2h4M21 11l-2-2h-4" />
                  </svg>
                </IconBadge>
                <div>
                  <div className="font-display text-[15px] font-bold text-navy">A domicilio</div>
                  <div className="text-[12.5px] text-grafito">Coordinamos contigo</div>
                </div>
              </div>
            ) : null}
          </div>
        </Container>
      </section>

      {/* Beneficios */}
      <section className="py-16">
        <Container>
          <SectionHeading
            center
            title="Por qué elegir Pepi Visión 360"
            subtitle="Cercanía, estilo y salud visual, en un solo lugar."
          />
          <div className="mt-10 grid grid-cols-1 gap-4.5 sm:grid-cols-2 lg:grid-cols-5">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="transition-transform duration-200 hover:-translate-y-1">
                <IconBadge>
                  <CheckIcon className="h-6 w-6 text-fucsia" />
                </IconBadge>
                <h3 className="mt-4 text-base font-semibold">{benefit.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-grafito">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Marcas que trabajamos */}
      {brandLogos.length > 0 ? (
        <section className="py-14">
          <Container>
            <SectionHeading
              center
              title="Marcas que reflejan tu estilo"
              subtitle="Seleccionamos armazones de marcas reconocidas para que encuentres el diseño, la comodidad y la calidad que mejor se adapta a ti."
            />
            <div className="mt-9">
              <BrandCarousel logos={brandLogos} />
            </div>
          </Container>
        </section>
      ) : null}

      {/* Destacados — placeholder: el catálogo real llega en la Fase 4 */}
      <section className="py-14">
        <Container>
          <div className="mb-6.5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-[30px] font-bold">Modelos que están volando</h2>
              <p className="mt-2 text-grafito">Una muestra de nuestro catálogo.</p>
            </div>
            <LinkButton href="/catalogo" variant="ghost" size="sm">
              Ver todo el catálogo
              <ChevronRightIcon className="h-4 w-4" />
            </LinkButton>
          </div>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-card border border-line bg-white shadow-brand-sm"
              >
                <div className="flex aspect-[4/3] items-center justify-center bg-gray text-xs text-[#5b6b85]">
                  Catálogo disponible próximamente
                </div>
                <div className="p-4">
                  <div className="h-3.5 w-2/3 rounded bg-gray-2" />
                  <div className="mt-2.5 h-3 w-1/3 rounded bg-gray-2" />
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Cotizador presence */}
      <section className="py-14">
        <Container>
          <div className="relative overflow-hidden rounded-[28px] bg-navy p-9 shadow-brand sm:p-11">
            <div className="pointer-events-none absolute -right-10 -top-18 h-[280px] w-[280px] rounded-full bg-fucsia/45 blur-[34px]" />
            <div className="pointer-events-none absolute -bottom-22 -left-12 h-[260px] w-[260px] rounded-full bg-blue/40 blur-[34px]" />
            <div className="relative grid grid-cols-1 items-center gap-9 lg:grid-cols-[1.3fr_0.7fr]">
              <div>
                <span className="inline-flex rounded-pill bg-white/10 px-4 py-1.5 text-[13px] font-semibold text-white">
                  Cotizador en línea
                </span>
                <h2 className="mt-4 text-[28px] font-bold leading-tight text-white sm:text-[32px]">
                  Arma tu cotización en <span className="text-rosado">5 simples pasos</span>
                </h2>
                <p className="mt-3 max-w-lg text-base leading-relaxed text-[#c7d2ee]">
                  Elige tu armazón, el tipo de cristal y los tratamientos. Te preparamos un presupuesto
                  referencial y sigues por WhatsApp cuando quieras.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {quoteSteps.map((step, index) => (
                    <span
                      key={step}
                      className="rounded-pill bg-white/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-[#dbe4fb]"
                    >
                      {index + 1} · {step}
                    </span>
                  ))}
                </div>
                <div className="mt-6.5">
                  <LinkButton href="/cotizador" variant="gradient">
                    Iniciar cotización
                    <ChevronRightIcon className="h-[18px] w-[18px]" />
                  </LinkButton>
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-7 text-center">
                <div className="font-display text-[46px] font-bold leading-none text-white">360°</div>
                <div className="mt-1.5 text-sm text-[#c7d2ee]">Atención completa</div>
                <div className="my-4.5 h-px bg-white/15" />
                <div className="text-[15px] font-semibold text-white">Presupuesto sin compromiso</div>
                <div className="mt-1.5 text-[12.5px] text-[#9db0e0]">
                  Valores &quot;desde&quot; · el total depende de tu receta, armazón y tratamientos.
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
