## 1. Flag

- [x] 1.1 Agregar `HOME_VISIT_ENABLED` a `lib/env.ts` — **fail-closed, default `false`**: solo el string exacto `"true"` habilita el servicio; ausente/vacío/`"false"`/inválido resuelven todos a deshabilitado, sin lanzar error de arranque (`z.string().optional().default('false').transform(...)`, nunca `z.enum` ni `Boolean(...)`). Helper centralizado agregado en `lib/feature-flags.ts#isHomeVisitEnabled()` — ningún call site compara `process.env` directamente. Wireado también en `compose.yaml` (`web` y `e2e`, fallback `:-false`), que no lo declaraban originalmente.

## 2. Rutas y navegación pública

- [x] 2.1 `app/domicilio/page.tsx` devuelve `notFound()` cuando el flag está deshabilitado (también en `generateMetadata`, para no filtrar título/descripción).
- [x] 2.2 `lib/nav-items.ts` omite la entrada "Atención a domicilio" cuando el flag está deshabilitado (afecta header, nav móvil y footer a la vez, vía `getVisibleNavItems()` — pura, sin leer env, para no romper el bundle de cliente de `Header.tsx`).
- [x] 2.3 `app/page.tsx` oculta la tarjeta de beneficio "Servicio a domicilio" y el badge flotante "A domicilio" cuando el flag está deshabilitado.

## 3. Conservación explícita (no tocar)

- [x] 3.1 Confirmado (`git status`/`git diff` vacíos): `app/admin/home-visits/`, `components/admin/AdminNav.tsx`, el filtro por tipo en `app/admin/requests/`, y `components/admin/RequestCard.tsx` no fueron modificados y permanecen accesibles sin importar el estado del flag (verificado con flag=false: `/admin/home-visits` responde 307 → `/admin`, no 404).
- [x] 3.2 Confirmado (`grep` sin resultados): `modules/home-visit-coverage/` y `modules/requests/service.ts#submitHomeVisit` no importan `feature-flags` ni leen `HOME_VISIT_ENABLED` — solo `app/domicilio/actions.ts` lo hace.
- [x] 3.3 Confirmado vía pruebas de integración existentes (sin cambios, todas en verde) y verificación manual: ninguna fila `Request`/`EnabledComuna` histórica se ve afectada.

## 4. Pruebas

- [x] 4.0 `tests/feature-flags.test.ts` reescrito para el parseo fail-closed: ausente→false, `false`→false, `true`→true, cadena vacía→false, valor inválido→false (sin lanzar), `"TRUE"` (mayúsculas)→false (solo el string exacto `"true"` habilita). Nuevo `tests/home-visit-actions-real-flag.test.ts` prueba la Server Action con el parseo real (no mockeado) de `lib/feature-flags`: bloqueada cuando la variable está ausente, funcional cuando `HOME_VISIT_ENABLED=true` — cierra el caso que `tests/home-visit-actions.test.ts` (que mockea `isHomeVisitEnabled` directamente) no podía distinguir por sí solo.
- [x] 4.1 Prueba: con el flag habilitado, `/domicilio` renderiza el formulario, el nav lo incluye, y las tarjetas del inicio lo muestran — verificado vía suite E2E completa (61 passed, 1 skip preexistente no relacionado) con `HOME_VISIT_ENABLED=true`.
- [x] 4.2 Prueba: con el flag deshabilitado, `/domicilio` devuelve 404, el nav lo omite en header/móvil/footer, y las tarjetas del inicio no lo muestran — verificado vía `e2e/public/home-visit-availability.spec.ts` (nueva) con `HOME_VISIT_ENABLED=false` (6/6 passed).
- [x] 4.3 Prueba: con el flag deshabilitado, `/admin/home-visits` sigue siendo accesible (307 a `/admin`, no 404) y los datos históricos siguen accesibles vía Prisma (no afectados por el flag, confirmado en 3.2/3.3).
- [x] 4.4 Actualizado `e2e/public/navigation.spec.ts`: la aserción de "8 secciones" ahora separa las 7 siempre presentes de la entrada de domicilio, verificada según el estado real del flag (no hardcodeada a "siempre presente").
- [x] 4.5 Actualizado `e2e/a11y/public-pages.spec.ts`: `/domicilio` se sacó del loop genérico `STATIC_PAGES` y tiene su propia prueba que afirma el código de estado (200 o 404) según el flag, además de correr axe sobre lo que efectivamente se renderiza en cualquiera de los dos casos.

## 5. Documentación y cierre

- [x] 5.1 Documentado en `README.md` (nueva sección "Feature flags") y `.env.example` que `HOME_VISIT_ENABLED=false` es la forma soportada de deshabilitar el servicio — incluyendo la advertencia de que `/`, `/faq` y `/domicilio` se generan estáticamente en el build de producción y requieren reconstruir la imagen (no solo reiniciar) para reflejar un cambio del flag en esas tres páginas.
- [x] 5.2 Nota para `catalog-seo` ya documentada en `design.md`/`proposal.md` de este mismo cambio — no se construye un sitemap en este cambio, ya que no existe ninguno hoy (confirmado nuevamente durante la implementación: no existe `app/sitemap.ts`).
- [x] 5.3 `openspec validate temporarily-disable-home-visit --strict` → válido.
- [x] 5.4 Suite completa (lint/typecheck/unit/integración/build) en verde dentro de Docker Compose, más `npm audit --omit=dev` (0 vulnerabilidades), E2E y axe en ambos estados del flag.
- [x] 5.5 Informe final entregado para revisión y aprobación — no se archiva el cambio hasta aprobación explícita.
