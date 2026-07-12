# Inventario de componentes visuales — `design-reference/`

Componentes recurrentes identificados en `_pepi-standalone-src.html`. Todos están implementados hoy como markup + estilos inline repetidos (no hay componentización real en el mockup — cada instancia repite su propio `style="..."`), así que esta tabla es una propuesta de qué se volvería un componente reutilizable en la app real, no un inventario de componentes ya existentes en código reutilizable.

| Componente | Descripción | Variantes observadas | Dónde se usa | Naturaleza |
|---|---|---|---|---|
| **Botón primario (pill, gradiente)** | CTA principal, fondo `--grad`, texto blanco, `border-radius:999px` | Con/sin ícono, tamaños hero vs. inline | Hero, cotizador, FAQ CTA, ARCO, footer CTA | Visual |
| **Botón secundario (navy sólido)** | Fondo `--navy`, texto blanco | — | "Ver catálogo", "Ver detalles", "Cotizar este modelo" | Visual |
| **Botón WhatsApp** | Fondo `#25D366`, ícono WhatsApp inline SVG | Pill grande (hero/contacto), icon-only cuadrado (card de producto), flotante circular con pulso | Header, hero, cards, ficha producto, contacto, footer, flotante global | Visual + enlace real (`wa.me`) |
| **Botón outline** | Borde de color (`--blue` o rosa), fondo blanco/transparente | — | "Consultar disponibilidad", banner de cotización continua | Visual |
| **Chip/filtro (pill toggle)** | Botón pequeño con estado activo/inactivo (borde+fondo rosa cuando activo) | Texto (género/forma/material), swatch de color (círculo) | Filtros de catálogo, filtro de solicitudes admin | Estado real en memoria (toggle), sin persistencia de selección entre sesiones |
| **Swatch de color** | Círculo de color con borde blanco + halo | Tamaño 16-26px, con/sin anillo de "activo" | Cards de producto, ficha, filtros, formulario admin | Visual; en admin permite agregar colores custom vía `<input type="color">` |
| **Card de producto (catálogo/destacados/relacionados)** | Imagen 4:3, badge opcional, nombre, código/forma/material, swatches, precio, disponibilidad, CTA(s) | 3 densidades: destacado (inicio), catálogo (con botón WhatsApp), relacionado (compacto) | Inicio, catálogo, ficha (relacionados) | Datos reales de `SEED`, imagen vía placeholder o base64 |
| **Badge de estado** ("Nuevo" / "Más vendido" / disponibilidad) | Pill de color sólido sobre imagen o texto de color junto a un label | Azul=Nuevo, Fucsia=Más vendido, verde/ámbar=Disponible/Bajo pedido | Cards, ficha, tabla admin | Visual, derivado de datos |
| **`<image-slot>` (placeholder de imagen)** | Componente propio de la herramienta de diseño para huecos de imagen editable | shapes rect/rounded/circle | Hero, ficha (3 fotos), nosotros, cards sin foto | **No portable** — es del runtime de diseño; en la app real se reemplaza por `<img>`/`next/image` + estado vacío propio |
| **Stepper (cotizador)** | 5 círculos numerados con línea de progreso y labels (ocultos en mobile) | Estado done/current/pending | Cotizador | Estado real en memoria (`quoteStep`) |
| **Selector "big choice"** (tarjeta grande seleccionable) | Card con título+descripción, borde resaltado si seleccionada | — | Cotizador paso 1 (armazón/asesoría) y paso 2 (tipo de cristal) | Estado real en memoria |
| **Botón de tratamiento (checkbox visual)** | Card rectangular con check (✓) que aparece/desaparece | — | Cotizador paso 3 (selección múltiple) | Estado real en memoria |
| **Dropzone de archivo** | Área con borde punteado, ícono de upload, texto "Arrastra o selecciona tu archivo" | Con confirmación (chip verde con nombre de archivo) tras seleccionar | Cotizador paso 4 (receta óptica) | **Simulado**: solo guarda el `file.name`, el archivo real nunca se sube ni almacena |
| **Acordeón FAQ** | Pregunta + ícono chevron que rota, respuesta con transición de altura (`grid-template-rows`) | Un ítem abierto a la vez | FAQ | Interacción real (solo UI, sin persistencia) |
| **Tabla comparativa** | Tabla con header oscuro, filas alternadas, check/guion por celda | — | Tipos de cristales | 100% estática |
| **Tabs (admin)** | Botones con subrayado activo + badge numérico (solicitudes nuevas) | 3 tabs: Modelos / Solicitudes / Configuración | Panel admin | Estado real en memoria |
| **Confirmación inline "¿Eliminar? Sí/No"** | Reemplaza los botones de acción por una confirmación en la misma fila, sin modal | — | Tabla de modelos, lista de solicitudes | Estado real en memoria |
| **Tarjeta de solicitud (admin)** | Card con badges de tipo/estado, datos de contacto, líneas de detalle, acciones | Cotización vs. Atención a domicilio (badge de color distinto) | Admin → Solicitudes | Datos reales de `localStorage`, sin backend |
| **Formulario genérico (inputs + labels)** | Label 13px navy + input con borde gris, foco azul, variante de error (borde rosa/rojo) | text/email/tel/textarea/select/checkbox/color/file | Cotizador, domicilio, ARCO, login admin, form de modelo, configuración | Validación solo client-side, reglas triviales (`required`, regex de email) |
| **Banner de error inline** | Caja rosa clara (`#fdecef`) con texto en rojo/fucsia (`#c8305b`) | — | Todos los formularios | Visual + estado real |
| **Banner de éxito / confirmación** | Ícono check verde en círculo + título + texto + CTA(s) | Variante grande (pantalla completa de sección) y variante pequeña (inline, ej. "Cambios guardados") | Cotizador, domicilio, ARCO, configuración admin | Visual + estado real (sin persistencia real de "éxito" en backend) |
| **Header sticky** | Logo + nav desktop + CTA WhatsApp + burger (mobile) | Blur de fondo al hacer scroll (`backdrop-filter`) | Global | Visual |
| **Drawer de navegación mobile** | Panel deslizante bajo el header con los mismos links de nav | — | Global (≤1000px) | Estado real (`mobileOpen`) |
| **Drawer de filtros (catálogo, mobile)** | Panel fijo full-screen con overlay oscuro, mismo contenido que el sidebar desktop | — | Catálogo (≤1000px) | Estado real (`filtersOpen`) |
| **Footer** | 4 columnas (marca, navegación, contacto, información legal + link discreto a Admin) | — | Global | Visual, datos de `config` |
| **Banner de cookies** | Barra fija inferior, texto + botón "Aceptar" | Desaparece tras aceptar (persistido) | Global (hasta aceptar) | `localStorage` (`pv360_cookie`) — ver `functional-gaps.md` sobre por qué esto no debe ser el patrón para datos de negocio |
| **Botón flotante de WhatsApp** | Círculo fijo esquina inferior derecha, animación de pulso infinita | Oculto en `admin` | Global (excepto admin) | Visual + enlace real |
| **KPI cards (admin)** | 3 tarjetas simples (número grande + label) | Total / Disponibles / Bajo pedido | Admin → Modelos | Calculado en memoria sobre el array de productos |

## Notas de portabilidad a la app real

- Ningún componente del mockup es reutilizable "tal cual" como código — todo usa estilos inline y el motor de plantillas propietario (`sc-if`/`sc-for`/`{{ }}`). Sirven como **especificación visual** (qué props/estados necesita cada componente), no como implementación a copiar.
- Componentes con estado que hoy dependen de `localStorage` (chips de filtro, stepper, tabs, drawers) son triviales de reimplementar con estado de componente/React normal; los que dependen de `localStorage` **como fuente de datos de negocio** (cards de producto, tabla admin, tarjetas de solicitud) requieren pasar a API real — ver `functional-gaps.md`.
- El dropzone de archivo y los 3 uploads de foto del formulario de modelo son los componentes con la brecha más grande respecto a producción: hoy no suben nada a ningún lado, solo generan/guardan base64 en el navegador.
