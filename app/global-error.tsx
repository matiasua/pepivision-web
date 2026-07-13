'use client';

// Root error boundary. Replaces Next.js's built-in `_global-error` page,
// which fails to prerender in this Next/React version combination.
// Must define its own <html>/<body> — it replaces the whole document
// (no Header/Footer) when an error escapes the root layout, so it also
// re-imports the fonts/styles the root layout would normally provide.
import { poppins, inter } from '@/lib/fonts';
import { Button } from '@/components/Button';
import './globals.css';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es" className={`${poppins.variable} ${inter.variable} antialiased`}>
      <body className="flex min-h-screen items-center justify-center bg-brand-gradient-soft px-5">
        <div className="max-w-md text-center">
          <span className="font-display text-[64px] font-bold text-fucsia">!</span>
          <h1 className="mt-2 text-2xl font-bold sm:text-[28px]">Ocurrió un error</h1>
          <p className="mt-3 text-grafito">
            Algo no funcionó como esperábamos. Intenta nuevamente en unos segundos.
          </p>
          <div className="mt-7">
            <Button onClick={() => reset()} variant="primary">
              Reintentar
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
