// Replaces Next.js's built-in `_not-found` page (see app/global-error.tsx
// for why: it fails to prerender in this Next/React version combination).
// Renders inside the root layout, so it inherits Header/Footer/fonts —
// only the message body needs brand styling.
import { LinkButton } from '@/components/Button';
import { Container } from '@/components/Container';

export default function NotFound() {
  return (
    <section className="bg-brand-gradient-soft py-20">
      <Container size="narrow" className="text-center">
        <span className="font-display text-[64px] font-bold text-fucsia">404</span>
        <h1 className="mt-2 text-2xl font-bold sm:text-[28px]">Página no encontrada</h1>
        <p className="mx-auto mt-3 max-w-md text-grafito">
          La página que buscas no existe o todavía no está disponible en esta fase del proyecto.
        </p>
        <div className="mt-7">
          <LinkButton href="/" variant="primary">
            Volver al inicio
          </LinkButton>
        </div>
      </Container>
    </section>
  );
}
