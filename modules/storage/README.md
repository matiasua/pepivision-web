# modules/storage

Abstracción de almacenamiento de objetos compatible con S3 (`OBJECT_STORAGE_*`),
independiente del proveedor: en desarrollo apunta a MinIO (ver Fase 1). Ver
`openspec/changes/add-pepi-vision-360-v1/specs/product-image-storage/spec.md`.

- `client.ts` — `S3Client` (`@aws-sdk/client-s3`) singleton, compartido por el bucket público y el privado (mismo endpoint/credenciales; solo el nombre de bucket cambia por llamada).
- `schemas.ts` — validación de metadatos de archivo (tipo MIME permitido, tamaño máximo antes de procesar), tanto para fotos de producto (`imageFileMetaSchema`) como para adjuntos de solicitud (`attachmentFileMetaSchema`, PDF/JPG/PNG/WEBP, 10 MB).
- `service.ts` — `buildStorageKey()`, `buildPublicUrl()` (distinto de `OBJECT_STORAGE_ENDPOINT`, ver design.md), `uploadObject()`/`deleteObject()`. Bucket **público** (`OBJECT_STORAGE_BUCKET`): fotografías de producto.
- `private-service.ts` — mismo patrón pero contra `PRIVATE_OBJECT_STORAGE_BUCKET`, un bucket **separado y sin acceso anónimo** (`mc anonymous set none` en `minio-init`, nunca `download`) para adjuntos sensibles de solicitudes (recetas ópticas — ver `RequestAttachment` en `modules/requests`). No expone `buildPublicUrl`: la única forma de leer un objeto es `getSignedAttachmentUrl()`, una URL firmada de un minuto, generada solo después de que `modules/requests/admin-service.ts` ya verificó sesión y autorización — nunca se guarda una URL permanente en la base de datos.

El procesamiento de imágenes (redimensionado/optimización con `sharp`) y la
persistencia en `ProductImage` viven en `modules/catalog` (`admin-service.ts`),
que es quien conoce el dominio de "imagen de producto" — este módulo solo
sabe subir/bajar bytes de un bucket. `lib/attachment-processing.ts` (fuera de
este módulo, mismo patrón que `lib/image-processing.ts`) confirma que el
contenido real de un adjunto corresponde a su MIME declarado (firma `%PDF`
para PDF, decodificación real vía `sharp` para imágenes) antes de subirlo —
un cliente puede declarar cualquier `Content-Type`, así que el allowlist de
`schemas.ts` por sí solo no basta para rechazar un ejecutable renombrado.
