import type { Metadata } from 'next';
import { Container } from '@/components/Container';
import { Eyebrow } from '@/components/Eyebrow';

export const metadata: Metadata = {
  title: 'Nosotros',
  description: 'En Pepi Visión 360 creemos que elegir tus lentes debe ser una experiencia simple, cercana y personalizada.',
};

const values = [
  {
    name: 'Cercanía',
    icon: (
      <path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    ),
  },
  {
    name: 'Confianza',
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
  {
    name: 'Comodidad',
    icon: <path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />,
  },
  {
    name: 'Estilo',
    icon: <path d="m12 2 2.4 7.4H22l-6 4.6 2.3 7.4L12 17l-6.3 4.4L8 14 2 9.4h7.6z" />,
  },
  {
    name: 'Atención personalizada',
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
      </>
    ),
  },
];

export default function NosotrosPage() {
  return (
    <>
      <section className="py-12">
        <Container size="default">
          <div className="grid grid-cols-1 items-center gap-11 lg:grid-cols-2">
            <div>
              <Eyebrow tone="soft">Nosotros</Eyebrow>
              <h1 className="mt-4 text-[32px] font-bold sm:text-[36px]">Una óptica cercana y moderna</h1>
              <p className="mt-4 text-base leading-relaxed text-grafito">
                En Pepi Visión 360 creemos que elegir tus lentes debe ser una experiencia simple, cercana y
                personalizada. Te ayudamos a encontrar un armazón que represente tu estilo y cristales
                adecuados para tus necesidades visuales.
              </p>
              <p className="mt-3.5 text-base leading-relaxed text-grafito">
                Facilitamos el acceso a lentes personalizados, con atención humana y a tu ritmo, dentro o
                fuera de casa.
              </p>
            </div>
            <div className="relative">
              <div className="absolute -inset-3.5 rotate-[2.5deg] rounded-[30px] bg-brand-gradient opacity-15" />
              <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[24px] bg-[#dfe7f5] shadow-brand">
                <span className="px-6 text-center text-sm text-grafito">Foto del equipo / atención</span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-8">
        <Container size="default">
          <h2 className="mb-7 text-center text-2xl font-bold">Nuestros valores</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {values.map((value) => (
              <div
                key={value.name}
                className="rounded-2xl border border-line bg-white p-6 text-center shadow-brand-sm"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient-soft">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-fucsia)" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                    {value.icon}
                  </svg>
                </div>
                <div className="font-semibold text-navy">{value.name}</div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
