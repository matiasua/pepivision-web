## 1. Flag

- [ ] 1.1 Agregar `HOME_VISIT_ENABLED` a `lib/env.ts` (booleano, default `true`).

## 2. Rutas y navegación pública

- [ ] 2.1 `app/domicilio/page.tsx` devuelve `notFound()` cuando el flag está deshabilitado.
- [ ] 2.2 `lib/nav-items.ts` omite la entrada "Atención a domicilio" cuando el flag está deshabilitado (afecta header, nav móvil y footer a la vez, sin tocar `Header.tsx`/`Footer.tsx`).
- [ ] 2.3 `app/page.tsx` oculta la tarjeta de beneficio "Servicio a domicilio" y el badge flotante "A domicilio" cuando el flag está deshabilitado.

## 3. Conservación explícita (no tocar)

- [ ] 3.1 Confirmar que `app/admin/home-visits/`, `components/admin/AdminNav.tsx`, el filtro por tipo en `app/admin/requests/`, y `components/admin/RequestCard.tsx` permanecen accesibles sin cambios, sin importar el estado del flag.
- [ ] 3.2 Confirmar que `modules/home-visit-coverage/` y `modules/requests/service.ts#submitHomeVisit` no leen el flag — solo la ruta pública lo hace.
- [ ] 3.3 Confirmar que ninguna fila `Request`/`EnabledComuna` histórica se ve afectada.

## 4. Pruebas

- [ ] 4.1 Prueba: con el flag habilitado, `/domicilio` renderiza el formulario, el nav lo incluye, y las tarjetas del inicio lo muestran (comportamiento actual, sin regresión).
- [ ] 4.2 Prueba: con el flag deshabilitado, `/domicilio` devuelve 404, el nav lo omite en header/móvil/footer, y las tarjetas del inicio no lo muestran.
- [ ] 4.3 Prueba: con el flag deshabilitado, `/admin/home-visits` sigue siendo accesible y sigue mostrando datos históricos.
- [ ] 4.4 Actualizar `e2e/public/navigation.spec.ts` (afirma "Atención a domicilio" como uno de los 8 ítems de nav requeridos) para cubrir ambos estados del flag, no solo el estado habilitado.
- [ ] 4.5 Actualizar `e2e/a11y/public-pages.spec.ts` (incluye `/domicilio` en `STATIC_PAGES`) para omitir esa entrada, o afirmar 404, cuando el flag está deshabilitado.

## 5. Documentación y cierre

- [ ] 5.1 Documentar en el README/env de ejemplo que `HOME_VISIT_ENABLED=false` es la forma soportada de deshabilitar el servicio.
- [ ] 5.2 Nota para `catalog-seo` (u otro cambio futuro que introduzca un sitemap): excluir `/domicilio` del sitemap cuando el flag esté deshabilitado — no se construye un sitemap en este cambio, ya que no existe ninguno hoy.
- [ ] 5.3 `openspec validate temporarily-disable-home-visit --strict`.
- [ ] 5.4 Suite completa (lint/typecheck/tests/build) en verde dentro de Docker Compose.
- [ ] 5.5 Informe final para revisión y aprobación — no archivar hasta aprobación explícita.
