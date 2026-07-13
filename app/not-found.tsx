// Replaces Next.js's built-in `_not-found` page (see app/global-error.tsx
// for why: it fails to prerender in this Next/React version combination).
export default function NotFound() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Página no encontrada</h1>
      <p>La página que buscas no existe.</p>
    </main>
  );
}
