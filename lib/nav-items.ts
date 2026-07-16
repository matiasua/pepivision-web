// Shared nav item list (Header + Footer), matching design-reference/'s
// `navItems`.
export const navItems = [
  { label: 'Inicio', href: '/' },
  { label: 'Catálogo', href: '/catalogo' },
  { label: 'Cotizador', href: '/cotizador' },
  { label: 'Tipos de cristales', href: '/cristales' },
  { label: 'Atención a domicilio', href: '/domicilio' },
  { label: 'Nosotros', href: '/nosotros' },
  { label: 'Preguntas frecuentes', href: '/faq' },
  { label: 'Contacto', href: '/contacto' },
] as const;

// Pure function (no env/process access) so it stays safe to call from a
// Client Component (Header.tsx) — the caller reads the actual flag
// server-side (lib/feature-flags.ts#isHomeVisitEnabled) and passes the
// boolean down as a prop; this function never imports lib/env.ts itself.
// See openspec/changes/temporarily-disable-home-visit/design.md.
export function getVisibleNavItems(homeVisitEnabled: boolean) {
  return homeVisitEnabled ? navItems : navItems.filter((item) => item.href !== '/domicilio');
}
