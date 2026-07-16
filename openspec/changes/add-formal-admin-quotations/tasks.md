## 1. Modelo de datos

- [ ] 1.1 Agregar `AdminQuotation`, `AdminQuotationLineItem`, y el enum `AdminQuotationStatus` a `prisma/schema.prisma` — aditivo, sin alterar tablas existentes.
- [ ] 1.2 Migración Prisma dentro de Docker Compose.
- [ ] 1.3 Implementar la asignación atómica del correlativo `COT-{año}-{NNNNNN}` (secuencia Postgres o transacción serializable — nunca lectura-luego-escritura no atómica).

## 2. Dominio y ciclo de vida

- [ ] 2.1 Repositorio/servicio: crear borrador, agregar/editar/eliminar líneas (mientras esté en `DRAFT`), calcular neto/IVA/total.
- [ ] 2.2 Transición `DRAFT → ISSUED`: congela líneas y totales, asigna número, genera el PDF (ver Fase 3), y pasa a ser inmutable.
- [ ] 2.3 Transiciones restantes: `ISSUED → SENT → ACCEPTED|REJECTED`, `* → EXPIRED` (por vigencia vencida), `* → VOIDED`.
- [ ] 2.4 Prueba: editar una línea de un `AdminQuotation` ya `ISSUED` es rechazado — solo se puede crear un nuevo borrador.
- [ ] 2.5 Prueba: dos emisiones concurrentes nunca producen el mismo número.
- [ ] 2.6 Auditoría: registrar cada transición de estado con actor, acción y metadata mínima.

## 3. Generación de PDF y almacenamiento

- [ ] 3.1 Seleccionar y justificar la librería de generación de PDF server-side (dentro del contenedor `web`, sin nuevo servicio externo).
- [ ] 3.2 Implementar el layout: logo, datos del cliente, líneas de detalle, neto/IVA/total, términos comerciales, paginación para N líneas.
- [ ] 3.3 Almacenar el PDF en el bucket privado (`modules/storage/private-service.ts`, mismo patrón que adjuntos de receta) — nunca en el bucket público.
- [ ] 3.4 Implementar la descarga vía URL firmada, autorizada solo tras verificar sesión/rol admin.
- [ ] 3.5 Prueba: el PDF generado para una emisión reflejar exactamente los montos congelados, incluso si el precio de catálogo cambia después.

## 4. Fuente de precios

- [ ] 4.1 Una línea con `productOfferingId` lee su precio desde `ProductOffering.priceFromClp` al momento de agregarse al borrador — nunca desde `Product.priceFromClp`.
- [ ] 4.2 Una línea sin `productOfferingId` acepta un `unitPriceClp` ingresado manualmente por el admin.
- [ ] 4.3 Prueba: una línea vinculada a una oferta cuyo precio cambia después de emitida no altera el PDF ya emitido.

## 5. Administración

- [ ] 5.1 Pantalla admin para crear/editar borradores, emitir, y gestionar el ciclo de vida — permitido para `ADMIN` y `SUPERADMIN`.
- [ ] 5.2 Prueba: un `ADMIN` puede crear, emitir y gestionar cotizaciones formales.

## 6. Cierre

- [ ] 6.1 Suite completa (lint/typecheck/tests/build) en verde dentro de Docker Compose.
- [ ] 6.2 `openspec validate add-formal-admin-quotations --strict`.
- [ ] 6.3 Informe final para revisión y aprobación — no archivar hasta aprobación explícita.
