'use client';

// Root error boundary. Replaces Next.js's built-in `_global-error` page,
// which fails to prerender in this Next/React version combination.
// Must define its own <html>/<body> — it replaces the whole document
// when an error escapes the root layout.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body>
        <main style={{ padding: '2rem' }}>
          <h1>Ocurrió un error</h1>
          <p>Intenta nuevamente en unos segundos.</p>
          <button onClick={() => reset()}>Reintentar</button>
        </main>
      </body>
    </html>
  );
}
