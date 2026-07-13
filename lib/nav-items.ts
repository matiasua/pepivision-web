// Shared nav item list (Header + Footer), matching design-reference/'s
// `navItems`. /catalogo and /cotizador are included because the spec's
// navigation requirement lists them — they 404 (via our custom not-found
// page) until Fase 4/5 build those routes; that's expected, not a bug.
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
