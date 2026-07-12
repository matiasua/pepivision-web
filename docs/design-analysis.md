# Análisis del diseño — `design-reference/`

Este documento resume el análisis exhaustivo de `design-reference/`, la exportación original de Claude Design para **Pepi Visión 360**. Es un documento de **solo lectura/análisis**: no se generó código productivo ni se modificó ningún archivo de `design-reference/` para producirlo. Ver también `page-inventory.md`, `component-inventory.md` y `functional-gaps.md`.

## 1. Qué es realmente este export

`design-reference/` no es una aplicación web convencional (HTML/CSS/JS "planos"). Es una **maqueta de una sola página** ("single-file mockup") construida con el motor de plantillas propietario de la herramienta de diseño de Claude ("design canvas" / `dc-runtime`), pensada para *previsualizar* look & feel y flujos, no para ejecutarse en producción.

Archivo por archivo:

| Archivo | Rol | ¿Tocar en la app real? |
|---|---|---|
| `_pepi-standalone-src.html` | **Fuente canónica** del mockup: markup + estilos inline + la lógica de estado en un `<script type="text/x-dc">`. Es el único archivo que hay que leer para entender contenido y comportamiento. | No — solo leer como referencia de contenido/flujo. |
| `Pepi Vision 360.dc.html` | Copia casi idéntica del anterior (diff mínimo: le falta un `<template>` de thumbnail usado solo para el bundler). Formato "vivo" del design canvas. | No. |
| `Pepi Vision 360 (standalone).html` | Bundle de 2.7 MB con imágenes embebidas en base64; salida empaquetada para compartir/visualizar sin dependencias externas. | No. |
| `support.js` | Runtime **generado** (`// GENERATED ... do not edit`) que interpreta las etiquetas propietarias `<x-dc>`, `<sc-if>`, `<sc-for>` y el binding `{{ }}` del mockup. Es un motor de plantillas propio de la herramienta de diseño, no un framework a reutilizar. | No. |
| `image-slot.js` | Componente "omelette" (`<image-slot>`) para placeholders de imagen editables dentro del canvas de diseño. Solo tiene sentido dentro de esa herramienta. | No. |
| `_ds/ionix-design-system-.../` | **Contenido no relacionado**: un design system reconstruido para otra marca/producto ("Ionix Trust", una empresa de antifraude). El mockup de Pepi nunca lo referencia — usa su propia paleta inline. No debe usarse como fuente de branding. | No. |
| `assets/pepi-logo.png`, `uploads/`, `screenshots/` | Logo real y capturas/imagenes de referencia usadas en el mockup. `uploads/Transparente - Principal.png` es un duplicado exacto (mismo MD5) de `assets/pepi-logo.png`. `uploads/pasted-...png` es un recorte de la sección "Colores disponibles" del panel admin. | No. |

**Conclusión clave:** para todo trabajo de análisis o de futura implementación, la única fuente de verdad de contenido/comportamiento es `_pepi-standalone-src.html`. El resto son artefactos derivados o irrelevantes (o, en el caso de `_ds/`, directamente de otra marca).

## 2. Cómo "funciona" el mockup

El archivo fuente define un **layout único** (header, `<main>`, footer, banner de cookies, botón flotante de WhatsApp) y usa una variable de estado `view` (`inicio | catalogo | producto | cristales | cotizador | domicilio | nosotros | faq | contacto | admin | privacidad | derechos | terminos`) para mostrar/ocultar secciones vía `<sc-if>`. No hay rutas de URL reales, ni "páginas" en el sentido de Next.js: es una simulación de SPA con un solo componente de clase (`class Component extends DCLogic`) que concentra **todo** el estado y la lógica de negocio simulada (ver `functional-gaps.md` para el detalle de qué de esto es simulado vs. real).

No hay separación entre "contenido" y "lógica": textos, precios, copys legales, y reglas de validación viven todos mezclados en el mismo archivo de 1400 líneas.

## 3. Sistema visual (fundamentos)

- **Paleta** (inline CSS vars, no design tokens formales): `--navy:#16265F`, `--blue:#1668C8`, `--fucsia:#E5127D`, `--rosado:#F65BA8`, `--ink:#1A2350`, `--grafito:#4a5170`, grises de superficie `--gray:#F4F6FB` / `--gray2:#E8EDF7`, línea `--line:#E2E8F4`. Degradado de marca `--grad: linear-gradient(100deg,#1668C8 0%,#E5127D 100%)` usado en CTAs primarios, franja del cotizador y footer.
- **Tipografía**: Poppins (600/700) para headings y elementos "de marca" (precio, logo del bundler), Inter (400–600) para cuerpo/inputs/botones, cargadas desde Google Fonts CDN (dependencia de red real que la app productiva deberá decidir mantener o self-host).
- **Verde WhatsApp** (`#25D366`) como color funcional fijo para todo lo relacionado a WhatsApp (botón flotante, CTAs, badges de contacto) — no es parte de la paleta de marca pero se usa consistentemente como "color de acción de WhatsApp".
- **Radios**: pills (`999px`) en botones/badges/chips; ~20-24px en cards; ~12-16px en inputs y thumbnails; el aviso de cookies y el footer no llevan radio (full-bleed).
- **Sombras**: dos niveles (`--sh` fuerte, `--shSm` sutil), usadas para elevar cards y CTAs; sin glassmorphism ni blur salvo el header sticky (`backdrop-filter: blur(10px)`).
- **Iconografía**: 100% SVG inline dibujados a mano (stroke ~1.8–2.4px), sin librería de iconos ni sprite — replicar esto en la app real implicará decidir si se mantienen como SVG inline o se migran a una librería (p. ej. lucide) sin cambiar el estilo visual.
- **Animaciones observadas**: pulso del botón de WhatsApp (`@keyframes pulseWa`), transición de acordeón FAQ vía `grid-template-rows` (altura animable con `overflow:hidden`), y transiciones CSS simples de hover/press (`transform`, `box-shadow`) — nada que dependa de una librería de animación.

## 4. Responsive

Dos breakpoints por media query, sin mobile-first real (el HTML es desktop-first y las reglas de `max-width` van sobreescribiendo):

- **≤1000px**: nav de escritorio se oculta y aparece el botón hamburguesa + drawer móvil; el CTA de WhatsApp del header desaparece (queda solo el flotante); grids de 4–5 columnas pasan a 2; el panel de filtros del catálogo se convierte en un drawer lateral fijo (`position:fixed`, overlay oscuro) con botón "Filtros" visible y footer de "Ver N resultados"; las etiquetas del stepper del cotizador se ocultan (solo quedan los números).
- **≤560px**: casi todos los grids restantes colapsan a 1 columna; el H1 del hero reduce tamaño; la sección de contacto pasa a 1 columna.

La captura `screenshots/catalogo.png` (916px de ancho) confirma este comportamiento en la práctica: a ese ancho ya se ve el layout "mobile" (burger menu, sin nav de escritorio).

No hay evidencia de un breakpoint intermedio de tablet más allá de estos dos, ni de comportamiento distinto en pantallas muy grandes (no hay `max-width` container fuera de 1000-1200px, así que el diseño no "crece" más allá de eso).

## 5. Estados de UI observados

| Tipo | Dónde aparece | Cómo se implementa |
|---|---|---|
| **Vacío** | Catálogo sin resultados de filtro (“Sin resultados”); panel admin sin solicitudes (“Sin solicitudes por ahora”); slots de imagen sin foto (`<image-slot>` / ícono genérico "Subir foto") | Condicionales `sc-if` sobre listas vacías; sin ilustración custom, solo texto + ícono. |
| **Éxito** | Cotizador enviado, consulta de domicilio enviada, solicitud ARCO enviada, configuración guardada en admin | Pantallas/paneles dedicados con ícono de check verde y CTA de siguiente paso (p. ej. "Continuar por WhatsApp" / "Nueva cotización"). |
| **Error** | Validación de formularios (cotizador, domicilio, ARCO, login admin) | Banners inline rojos (`#fdecef` / `#c8305b`) con mensaje de texto fijo; también estilos de borde rojo en inputs individuales. |
| **Carga (loading)** | **No existe ningún estado de carga** — no hay spinners, skeletons, ni estados "pending". Todo es síncrono porque no hay llamadas de red reales. | — |
| **Confirmación destructiva** | Eliminar modelo / eliminar solicitud en admin | Patrón "¿Eliminar? Sí/No" inline, sin modal. |

La ausencia total de estados de carga es un dato importante: la app real, al introducir un backend/API real (Next.js + Prisma + Postgres), necesitará diseñar estos estados desde cero — no hay nada que "portar" del mockup en este aspecto.

## 6. Datos simulados

Todo el contenido de negocio es data hardcodeada dentro de la clase `Component`:

- `SEED`: 10 armazones de catálogo (id, nombre, código, precio, género, forma, material, colores, medidas, descripción, disponibilidad, badge).
- `TREATMENTS`: 6 tratamientos de cristal fijos (filtro luz azul, antirreflejo, fotocromático, UV, adelgazado, anti-rayas).
- `FAQS`: 9 preguntas/respuestas fijas.
- `CONFIG_DEFAULT`: datos de negocio de ejemplo (WhatsApp, teléfono visible, correo, Instagram, horario, ubicación).
- Tabla comparativa cristales (`compRows`) y opciones de filtro (género/forma/material/color/rango de precio): listas fijas en código.

Ver `functional-gaps.md` para el detalle de qué de esto (persistencia, autenticación, notificaciones) es **solo apariencia** frente a lo que se necesita construir de verdad.

## 7. Alcance y fidelidad del mockup

- Cubre **todo el recorrido de negocio** descrito conceptualmente: descubrimiento (inicio/catálogo/ficha), educación (tipos de cristales), conversión (cotizador 5 pasos + WhatsApp), servicio (atención a domicilio), confianza (nosotros, FAQ, contacto), legal (privacidad, ARCO, términos) y back-office (panel admin con modelos/solicitudes/configuración).
- Es **contenido y flujo**, no arquitectura: no define modelos de datos, no define API, no define reglas de negocio más allá de validaciones triviales de formulario, y no resuelve ninguno de los requisitos no funcionales del proyecto (seguridad, persistencia real, notificación real al negocio).
- El copy legal (privacidad, ARCO, términos) está redactado con referencias reales a leyes chilenas (Ley 19.628, Ley 21.719) pero es contenido de ejemplo que deberá ser validado/aprobado como definitivo antes de usarse en producción (ver `functional-gaps.md`, sección de decisiones pendientes).
