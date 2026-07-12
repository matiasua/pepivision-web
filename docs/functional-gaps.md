# Brechas funcionales — prototipo vs. aplicación productiva

Este documento clasifica cada pieza de comportamiento observada en `design-reference/_pepi-standalone-src.html` en una de cuatro categorías, y separa lo que ya se sabe de lo que falta decidir antes de escribir una propuesta OpenSpec de implementación.

**Clasificación usada:**
- 🎨 **Solo visual** — apariencia/estilo sin lógica de negocio detrás; se traduce casi 1:1 a la UI real.
- 🧪 **Simulado** — hay una interacción que "parece" funcionar, pero corre enteramente en el navegador (memoria o `localStorage`), sin backend, sin persistencia real ni efectos fuera del propio navegador.
- 🛠️ **Requiere implementación real** — funcionalidad que el mockup solo esboza y que necesita backend/BD/infraestructura real para existir en producción.
- ❓ **Decisión pendiente** — el mockup no resuelve esto (o lo resuelve de una forma que probablemente no sea la definitiva); debe zanjarse en la propuesta OpenSpec antes de implementar.

## 1. Persistencia de datos

| Ítem | Categoría | Detalle |
|---|---|---|
| Catálogo de productos (`SEED` → `pv360_products`) | 🧪 Simulado | Vive en `localStorage`, por navegador/dispositivo. Un cambio hecho por el admin en su laptop no lo ve ningún cliente ni el admin en otro dispositivo. |
| Solicitudes de cotización/domicilio (`pv360_requests`) | 🧪 Simulado | Mismo problema: se guardan localmente en el navegador de quien las envía, no llegan a ningún lado que el negocio pueda ver centralizado. |
| Configuración del negocio (`pv360_config`) | 🧪 Simulado | Igual — cambia el `localStorage` del admin que lo edita, no un backend compartido. |
| Sesión de cookies aceptadas (`pv360_cookie`) | 🎨 Solo visual (a nivel de mockup) | Aceptable que sea client-side incluso en producción (es una preferencia de UI del visitante), pero la política de cookies real deberá revisarse igual (ver sección Legal). |
| Modelo de datos de productos, solicitudes, configuración | 🛠️ Requiere implementación real | Diseñar el esquema Prisma/PostgreSQL correspondiente (productos, variantes de color, fotos, solicitudes, config de negocio) — el mockup da un buen punto de partida de los *campos* necesarios (ver `page-inventory.md` / `component-inventory.md`), no del modelo relacional. |
| **Regla del proyecto**: `localStorage` no puede ser persistencia productiva (`CLAUDE.md`) | 🛠️ Requiere implementación real | Todo lo anterior marcado como 🧪 debe migrar a PostgreSQL vía Prisma. |

## 2. Imágenes de producto

| Ítem | Categoría | Detalle |
|---|---|---|
| Subida de foto (principal/frontal/lateral) en el form de modelo | 🧪 Simulado | Se lee el archivo, se reescala a máx. 900px por `<canvas>` y se codifica como **JPEG base64** guardado dentro del mismo JSON de `localStorage`. No hay subida a ningún storage. |
| Copy del mockup "Las imágenes se optimizan automáticamente" | 🧪 Simulado (afirmación del prototipo, no del producto real) | El único "procesamiento" es el resize a 900px + calidad 0.82 en el propio navegador; no hay pipeline de optimización/CDN real. |
| Almacenamiento de imágenes fuera del contenedor de la app | 🛠️ Requiere implementación real | Regla del proyecto (`CLAUDE.md`): las imágenes deben vivir fuera del contenedor de la aplicación (volumen montado o storage externo), nunca embebidas en base64 en una base de datos ni en disco del contenedor. |
| Límite de tamaño de `localStorage` (~5-10 MB por origen) | 🛠️ Requiere implementación real | Con imágenes base64 de 3 fotos × 10+ productos, el prototipo ya está cerca de los límites típicos de `localStorage`; el propio código muestra un mensaje de error para este caso (`"No se pudo guardar (almacenamiento lleno)..."`), evidencia de que el propio prototipo es consciente de no ser viable a escala. |

## 3. Autenticación y autorización (panel admin)

| Ítem | Categoría | Detalle |
|---|---|---|
| Login admin (usuario `admin` / clave `pepi360`) | 🧪 Simulado | Credenciales **hardcodeadas en el JS del cliente**, visibles en el propio HTML/bundle y mostradas en pantalla como "Demo". Cualquiera que abra las devtools puede leerlas o simplemente setear `localStorage['pv360_admin']='1'` para entrar sin login. |
| Sesión de admin (`pv360_admin` flag) | 🧪 Simulado | No hay expiración, no hay token, no hay verificación server-side de ningún tipo. |
| Autenticación real (hash de contraseña, sesión/JWT, expiración, roles) | 🛠️ Requiere implementación real | Debe diseñarse como parte de la propuesta OpenSpec — el mockup no da ninguna pista de cuántos admins habrá, si hay roles distintos, ni cómo se gestionan altas/bajas de usuarios admin. |
| Autorización por acción (¿todos los admins pueden borrar solicitudes/editar config?) | ❓ Decisión pendiente | El mockup trata a "admin" como un rol único sin permisos diferenciados. |

## 4. Notificación / flujo de conversión (cotizador, domicilio)

| Ítem | Categoría | Detalle |
|---|---|---|
| "Enviar" cotización / consulta de domicilio | 🧪 Simulado | Solo agrega un registro a `localStorage` y arma un enlace `wa.me/<numero>?text=...` — el mensaje de WhatsApp **no se envía automáticamente**; el usuario debe abrir WhatsApp y presionar enviar manualmente. El negocio no recibe ninguna notificación real a menos que el cliente complete ese segundo paso. |
| Validaciones de formulario (nombre/teléfono obligatorios, regex de email, checkbox de consentimiento) | 🧪 Simulado (client-side) | Son solo JS del navegador, fácilmente bypasseables; deben re-implementarse server-side con Zod. |
| Notificación real al negocio cuando llega una solicitud (email, WhatsApp Business API, push, etc.) | 🛠️ Requiere implementación real | El mockup no implementa esto en absoluto — solo asume que el propio cliente reenvía el WhatsApp. |
| ¿Se mantiene el patrón "deep link a wa.me" en producción, o se integra la WhatsApp Business API / un canal de notificación al negocio? | ❓ Decisión pendiente | Impacta directamente el modelo de datos de "solicitudes" y si hace falta un proveedor externo. |
| Validación real de cobertura por comuna (atención a domicilio) | 🛠️ Requiere implementación real | Hoy "comuna" es un campo de texto libre sin validar contra ninguna lista/zona real; el copy dice "la disponibilidad se confirma caso a caso" — no hay lógica de cobertura, solo un formulario de contacto. |
| Adjuntar receta óptica (paso 4 del cotizador) | 🧪 Simulado | El input de archivo solo guarda `file.name` en el estado — el archivo en sí **nunca se lee ni se sube**. Es el hueco más grande del flujo de cotización: la propuesta debe decidir cómo/dónde se almacena un documento de salud sensible de forma segura. |

## 5. Panel de administración — CRUD de modelos

| Ítem | Categoría | Detalle |
|---|---|---|
| Alta/edición/baja de modelos, contador de disponibles/bajo pedido | 🧪 Simulado | Lógica de CRUD en memoria correcta *como especificación de UX*, pero persistida solo en `localStorage` del navegador del admin. |
| Colores predefinidos + colores personalizados (color picker) | 🎨 Solo visual / 🧪 Simulado | El catálogo de colores base (`SWATCH`) es una lista fija en código; agregar un color custom es solo estado en memoria — no valida duplicados más allá del propio nombre, no normaliza el hex. |
| Confirmación de borrado inline | 🎨 Solo visual | Patrón de UX válido para portar tal cual (no requiere modal), pero la operación de borrado en sí debe ser una llamada real a la API en producción. |

## 6. Legal / cumplimiento

| Ítem | Categoría | Detalle |
|---|---|---|
| Texto de Política de Privacidad, Términos y Derechos ARCO | ❓ Decisión pendiente | Es contenido de ejemplo razonable y ya referencia leyes chilenas reales (Ley 19.628, Ley 21.719), pero **debe ser revisado y aprobado como definitivo** (o por un asesor legal) antes de publicarse en producción — no asumir que el copy actual es el final. |
| Formulario de solicitud ARCO | 🧪 Simulado | "Enviar solicitud" solo cambia de pantalla a un mensaje de confirmación; no persiste nada, no genera ningún caso/ticket real, no notifica a nadie. |
| Manejo de datos sensibles (receta óptica = dato de salud visual, según la propia Política de Privacidad del mockup) | 🛠️ Requiere implementación real | Ligado al punto de "adjuntar receta" de la sección 4: si va a tratarse como dato sensible según la política propia del sitio, el diseño de almacenamiento/seguridad debe reflejar eso explícitamente (cifrado, acceso restringido, plazos de retención), no solo "subir un archivo". |
| Plazo de retención de datos (12 meses declarado en la política) | ❓ Decisión pendiente | Nadie en el sistema actual implementa borrado/anonimización automática — habrá que decidir si se automatiza o es un proceso manual, y quién es responsable. |

## 7. Integraciones externas

| Integración | Categoría | Detalle |
|---|---|---|
| WhatsApp (`wa.me` deep links) | 🧪 Simulado (parcialmente real) | El enlace en sí es real y funcional (abre WhatsApp con texto prellenado), pero no hay integración de la WhatsApp Business API — es un "atajo" de UX, no una integración de backend. |
| Instagram | 🎨 Solo visual | Solo un link `https://instagram.com/<usuario>`, sin API ni contenido embebido. |
| Google Fonts (Poppins, Inter vía CDN) | 🎨 Solo visual (pero dependencia de red real) | Debe decidirse si se mantiene como CDN externo o se self-hostean las fuentes (impacta performance/privacidad — carga de recursos de terceros). |
| Pasarela de pago | ❓ Decisión pendiente (ausente del mockup) | El mockup no contempla pago online en ningún punto — toda la conversión termina en "cotización por WhatsApp". Confirmar si esto se mantiene así en producción o si hay planes de checkout/pago. |
| Email transaccional | ❓ Decisión pendiente (ausente del mockup) | No hay ningún envío de correo en el prototipo (ni de confirmación al cliente ni de alerta al negocio), pese a que se recolecta el campo "correo" en varios formularios. |
| Mapas/geolocalización para cobertura de domicilio | ❓ Decisión pendiente (ausente del mockup) | "Comuna" es texto libre; no hay ningún mapa, autocomplete de direcciones chilenas, ni verificación de zona. |

## 8. Otros huecos técnicos generales (no ligados a una pantalla específica)

- **Sin estados de carga**: el mockup no tiene ningún spinner/skeleton porque no hay llamadas de red reales; la app real deberá diseñarlos desde cero para cada operación que hoy es síncrona (login, guardar producto, enviar cotización, etc.).
- **Sin manejo de errores de red/servidor**: todos los "errores" del mockup son de validación de formulario, nunca de fallo de conexión, timeout, o error 500 — necesarios en producción.
- **Sin SEO/rutas reales por página**: solo hay meta tags a nivel de documento único; cada vista pública necesitará sus propios metadatos si se implementa como rutas Next.js reales.
- **Sin tests, sin build, sin accesibilidad auditada**: hay algunos `aria-label` puntuales (íconos de header, botones de WhatsApp), pero no hay evidencia de una auditoría de accesibilidad completa (contraste, foco de teclado, lectura de estados dinámicos por lector de pantalla).
- **Datos de catálogo/precios son ficticios**: los 10 modelos, precios y stock son de ejemplo — se necesitará carga real de datos antes de lanzar (vía el propio panel admin una vez exista de verdad, o una migración/seed inicial).

## 9. Resumen de decisiones pendientes a resolver en la propuesta OpenSpec

Antes de iniciar cualquier implementación (recordando que, por regla del proyecto, no se debe implementar hasta que exista una propuesta OpenSpec aprobada), conviene que esa propuesta zanje explícitamente:

1. ¿Se mantiene el flujo de conversión basado en `wa.me` (deep link manual) o se integra la WhatsApp Business API para notificación automática al negocio?
2. ¿Cómo y dónde se almacena la receta óptica adjunta (dato de salud sensible según la propia Política de Privacidad)? ¿Cifrado en reposo? ¿Quién tiene acceso?
3. ¿Habrá más de un usuario/rol de administrador, o un único acceso compartido como en el mockup?
4. ¿Se automatiza el borrado/anonimización de datos personales al cumplir el plazo de retención declarado (12 meses), o es un proceso manual?
5. ¿El copy legal actual (privacidad, términos, ARCO) se usa como base a revisar, o se reemplaza por contenido validado legalmente desde cero?
6. ¿Se necesita validar cobertura de atención a domicilio contra una lista real de comunas, o sigue siendo "a confirmar caso a caso" manualmente?
7. ¿Hay planes de pago/checkout online a futuro, o el modelo de negocio seguirá cerrando la venta 100% por WhatsApp fuera de la plataforma?
8. ¿Se envían correos transaccionales (confirmación al cliente, alerta al negocio) o toda la comunicación pasa por WhatsApp?
9. Granularidad de rutas del panel admin (¿`/admin`, `/admin/solicitudes`, `/admin/config` como rutas separadas, o una sola vista con tabs como hoy?).
10. ¿Se mantienen las fuentes vía Google Fonts CDN o se self-hostean dentro del proyecto?
