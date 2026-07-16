## 1. Servicio y repositorio

- [ ] 1.1 Implementar `modules/catalog/brand-service.ts`/`brand-repository.ts` (o el módulo que corresponda): crear, editar, activar/desactivar, reordenar, eliminar-si-no-referenciado.
- [ ] 1.2 Slugify + unicidad de `name`/`slug`, mismo patrón que `Category`.
- [ ] 1.3 Bloqueo de eliminación cuando el `Brand` tiene `Product`s asociados (mismo patrón que `Category`/`removeProductColor`).
- [ ] 1.4 Auditoría: `brand.created`, `brand.updated`, `brand.enabled`, `brand.disabled`.

## 2. Subida de logo

- [ ] 2.1 Reutilizar `modules/storage/service.ts` (bucket público) para subir/reemplazar/eliminar el logo, clave `brands/${brandId}/logo-${random}.${extension}`.
- [ ] 2.2 Validación MIME real (JPG/JPEG/PNG) vía `sharp`, mismo patrón que product photos.
- [ ] 2.3 (opcional, coordinar con `redesign-extensible-catalog-v2` si su tarea de imágenes de categoría se implementa primero) salida WebP.

## 3. Administración

- [ ] 3.1 `/admin/brands`: listar (nombre, miniatura, activo, orden), crear, editar, reordenar, activar/desactivar — SUPERADMIN-only.
- [ ] 3.2 Agregar entrada en `components/admin/AdminNav.tsx`.
- [ ] 3.3 Prueba: un `ADMIN` no puede crear/editar marcas (si se cierra la Open Question a favor de SUPERADMIN-only); ajustar si la decisión cambia.
- [ ] 3.4 Prueba: eliminar una marca con productos asociados queda bloqueado; desactivarla funciona.

## 4. Migración del carrusel

- [ ] 4.1 Importación única: crear una fila `Brand` por cada archivo en `public/marcas/` sin `slug` correspondiente todavía, migrando el archivo a MinIO.
- [ ] 4.2 Cambiar `lib/brands.ts#getBrandLogos()` para leer desde `Brand` (`active: true`, ordenado por `sortOrder`) en vez de escanear el sistema de archivos.
- [ ] 4.3 Prueba: el carrusel renderiza exactamente los mismos logos y en el mismo orden inmediatamente después del cambio.
- [ ] 4.4 Prueba: desactivar una marca la retira del carrusel sin afectar su asignación a productos existentes.

## 5. Cierre

- [ ] 5.1 Suite completa (lint/typecheck/tests/build) en verde dentro de Docker Compose.
- [ ] 5.2 `openspec validate add-admin-brand-management --strict`.
- [ ] 5.3 Informe final para revisión y aprobación — no archivar hasta aprobación explícita.
