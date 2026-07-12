# Inventario de páginas/vistas — `design-reference/`

Fuente: `design-reference/_pepi-standalone-src.html`. El mockup no tiene rutas de URL reales; cada "página" es un valor del estado `view` que activa/desactiva un bloque `<sc-if>`. Esta tabla asume que, en la app real, cada vista se convertirá en una ruta de Next.js propia — eso es una decisión de implementación pendiente, no algo definido por el mockup.

Convención de columnas: **Simulado** = qué tan "real" es el comportamiento hoy en el mockup (Visual / Simulado con localStorage / Sin lógica). El detalle de brechas está en `functional-gaps.md`.

## Sitio público

| Vista (`view=`) | Nombre | Contenido / propósito | Elementos clave | Formularios | Estados | Simulado |
|---|---|---|---|---|---|---|
| `inicio` | Inicio | Hero, 5 beneficios, 4 modelos destacados, banner del cotizador (5 pasos) | Hero con `<image-slot>`, badge "A domicilio", grid de beneficios, grid de destacados, CTA cotizador | — | — | Visual + datos de `SEED`/`featured` |
| `catalogo` | Catálogo de armazones | Listado filtrable de los 10 modelos | Buscador, filtros (público/forma/material/color/rango de precio/checkbox disponibilidad), grid de productos, drawer de filtros en mobile | Buscador (input) + filtros (sin submit, reactivos) | Vacío ("Sin resultados") | Filtro/búsqueda: lógica real en memoria sobre `SEED`/`products` |
| `producto` | Ficha de producto | Detalle de un modelo (galería 3 fotos, specs, colores, CTAs) | Imagen principal + frontal/lateral, specs en tarjetas, swatches de color, CTA "Cotizar este modelo", CTA WhatsApp directo, "Productos relacionados" | — | Placeholder de imagen si no hay foto | Visual; navegación real (selección de producto) |
| `cristales` | Tipos de cristales | Educativo: monofocal/bifocal/multifocal, tratamientos, tabla comparativa | 3 cards de tipo, grid de 6 tratamientos, tabla comparativa, callout de recomendación profesional | — | — | 100% contenido estático |
| `cotizador` | Cotizador de lentes | Flujo de cotización en 5 pasos → mensaje de WhatsApp prellenado | Stepper (1-5), pasos: armazón / cristal / tratamientos / receta (upload) / datos de contacto + consentimiento | Sí — paso 5 (nombre*, teléfono*, correo, comuna, mensaje, checkbox consentimiento) | Éxito ("¡Solicitud enviada!"), error inline (campos requeridos, email inválido, falta consentimiento) | **Simulado**: "enviar" solo guarda en `localStorage` (`pv360_requests`) y arma un link `wa.me`; no hay notificación real al negocio |
| `domicilio` | Atención a domicilio | Explica el servicio (4 pasos) + formulario de consulta de cobertura por comuna | 4 steps ilustrados, formulario de contacto | Sí (nombre*, comuna*, teléfono*, tipo de atención, consentimiento) | Éxito ("¡Consulta recibida!"), error inline | Igual que cotizador: guarda en `localStorage`, sin validación real de cobertura por comuna |
| `nosotros` | Nosotros | Historia/propuesta de valor + 5 valores de marca | Imagen de equipo (`<image-slot>`), grid de valores | — | — | 100% contenido estático |
| `faq` | Preguntas frecuentes | Acordeón de 9 preguntas fijas | Acordeón con animación de altura | — | — | Estático; interacción de apertura/cierre es real (solo UI) |
| `contacto` | Contacto | Canales de contacto (WhatsApp, Instagram, correo, teléfono) + horario/ubicación | 4 tarjetas de canal, 2 tarjetas de info | — | — | Datos vienen de `config`/`CONFIG_DEFAULT` (ver admin → Configuración) |
| `privacidad` | Política de Privacidad | 11 secciones legales (Ley 19.628 / 21.719, datos sensibles de salud visual, plazos, ARCO, cookies) | Texto largo + CTA a Derechos ARCO | — | — | Contenido de ejemplo — **requiere validación legal antes de producción** |
| `derechos` | Derechos ARCO | Explica los 6 derechos + formulario de solicitud | 6 cards + formulario | Sí (nombre completo*, RUT*, correo*, derecho a ejercer*, mensaje, consentimiento) | Éxito ("Solicitud recibida"), error inline | **Simulado**: no persiste ni enruta a ningún lado; solo cambia de pantalla |
| `terminos` | Términos y condiciones | 7 secciones (precios referenciales, cotizaciones, disponibilidad, imágenes, domicilio, salud visual, contacto) | Texto legal | — | — | Contenido de ejemplo — **requiere validación legal** |

Elementos globales presentes en (casi) todas las vistas públicas: header sticky con nav + CTA WhatsApp + drawer mobile, footer con navegación/contacto/legal/enlace a Administración, banner de cookies (hasta aceptar), botón flotante de WhatsApp (oculto solo en `admin`).

## Panel de administración

| Vista / sub-estado | Nombre | Contenido / propósito | Elementos clave | Formularios | Estados | Simulado |
|---|---|---|---|---|---|---|
| `admin` (no autenticado) | Login admin | Formulario de acceso | Usuario, clave, hint de credenciales demo visibles en pantalla (`admin` / `pepi360`) | Sí (usuario, clave) | Error ("Usuario o clave incorrectos") | **Totalmente simulado**: credenciales hardcodeadas en JS del cliente, sesión = flag en `localStorage` |
| `admin` → **Modelos** (listado) | Gestión de modelos | Tabla de los 10 modelos con foto/nombre/precio/estado/acciones | 3 KPIs (total/disponibles/bajo pedido), tabla, botón "Agregar modelo" | — | Confirmación inline "¿Eliminar?" Sí/No | CRUD en memoria + `localStorage` (`pv360_products`) |
| `admin` → **Modelos** (form) | Alta/edición de modelo | Formulario completo de un armazón | Nombre, código, precio, medidas, público, forma, material, disponibilidad, etiqueta, colores (predefinidos + custom con color picker), descripción, 3 fotos (principal/frontal/lateral) | Sí | Error inline (campos obligatorios) | Fotos: resize client-side a JPEG base64 vía `<canvas>`, guardadas dentro del JSON de `localStorage` |
| `admin` → **Solicitudes** | Bandeja de solicitudes | Lista de cotizaciones + consultas de domicilio recibidas | Filtro (todas/cotizaciones/atención), tarjeta por solicitud con detalle, botón "Contactar" (WhatsApp), toggle atendida/nueva, eliminar | — | Vacío ("Sin solicitudes por ahora"), confirmación de borrado inline | Datos 100% de `localStorage` (`pv360_requests`); "Contactar" abre WhatsApp manualmente, no notifica nada |
| `admin` → **Configuración** | Datos del negocio | Formulario de WhatsApp/teléfono/correo/Instagram/horario/ubicación que alimenta el resto del sitio | Formulario simple | Sí | "Cambios guardados" (check verde) | Persistido en `localStorage` (`pv360_config`); sin control de acceso más allá del login general |

## Notas para el inventario de rutas de la app real

- El mockup no distingue "página" de "modal"/"sub-vista" — por ejemplo Admin tiene 3 secciones (Modelos/Solicitudes/Configuración) y 2 modos (lista/formulario) dentro de una sola "vista"; habrá que decidir la granularidad de rutas Next.js (`/admin`, `/admin/solicitudes`, `/admin/config`, etc. — **decisión pendiente**, ver `functional-gaps.md`).
- No hay página 404 ni manejo de rutas inválidas (no aplica: no hay routing real).
- No hay sitemap ni metadatos SEO por página — solo un `<meta name="description">` y OpenGraph genéricos a nivel de documento completo.
