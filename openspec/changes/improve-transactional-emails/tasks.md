## 1. Confirmación al cliente para derechos ARCO

- [ ] 1.1 Crear `modules/notifications/email/templates/data-rights-customer-confirmation.ts`, mismo shape que las plantillas existentes (`{ subject, preheader, html, text }`), sin repetir la descripción libre del titular.
- [ ] 1.2 Conectar el envío en `modules/data-rights/service.ts` junto al ya existente envío de negocio.
- [ ] 1.3 Prueba: una solicitud ARCO genera tanto la confirmación al cliente como la notificación de negocio.

## 2. Aserciones de contenido en pruebas de integración

- [ ] 2.1 Extender el helper de Mailpit (`tests-integration/helpers.ts`) para obtener el detalle de un mensaje (`HTML`/`Text`), no solo su presencia.
- [ ] 2.2 Agregar aserciones de contenido a `tests-integration/quote-requests.test.ts` (categoría/modelo/color presentes en el cuerpo).
- [ ] 2.3 Agregar aserciones de contenido a `tests-integration/home-visit-and-arco.test.ts` (comuna, y — tras 1.1 — el texto de confirmación ARCO).

## 3. Documentación del horario comercial

- [ ] 3.1 Documentar en `modules/business-settings/README.md` (o equivalente) que `hoursText` es la fuente única para el horario mostrado en todos los correos, y que su valor es una decisión de datos administrada en `/admin/settings`, no un valor de código.
- [ ] 3.2 Confirmar/actualizar el valor configurado de `hoursText` en el entorno correspondiente al horario real del negocio (acción de datos, no de código).

## 4. Cierre

- [ ] 4.1 Validación manual en Mailpit de la nueva plantilla ARCO (HTML y texto).
- [ ] 4.2 Suite completa (lint/typecheck/tests/build) en verde dentro de Docker Compose.
- [ ] 4.3 `openspec validate improve-transactional-emails --strict`.
- [ ] 4.4 Informe final para revisión y aprobación — no archivar hasta aprobación explícita.
