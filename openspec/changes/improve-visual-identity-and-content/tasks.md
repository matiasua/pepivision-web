## 1. Favicon y app icons

- [ ] 1.1 Agregar `app/icon.tsx` (o `app/icon.png`/`app/apple-icon.png`) siguiendo la convención de metadata de Next.js.
- [ ] 1.2 Verificar que el favicon/app icon aparece correctamente en pestaña del navegador y al agregar a pantalla de inicio (iOS/Android).

## 2. Iconografía consistente

- [ ] 2.1 Auditar el sitio en busca de emojis usados como iconos informativos; reemplazarlos por el sistema existente de `components/icons.tsx`.
- [ ] 2.2 Confirmar que las cuatro/cinco tarjetas de beneficio del inicio (según el estado del flag de `temporarily-disable-home-visit`) usan la misma familia de iconos.

## 3. Contenido de cristales (depende de `redesign-extensible-catalog-v2`)

- [ ] 3.1 **Bloqueada hasta que `redesign-extensible-catalog-v2` finalice el catálogo de tipos de cristal/tratamientos/opciones adicionales**: agregar los iconos correspondientes a `components/icons.tsx`, mismo estilo que los existentes.
- [ ] 3.2 Aplicar esos iconos a `/cristales` junto con la tabla comparativa accesible ya especificada en `lens-configuration`.

## 4. Accesibilidad

- [ ] 4.1 Auditar `alt` text en logos de marca, fotos de producto, imágenes de categoría; completar los que falten.
- [ ] 4.2 Verificar/extender `prefers-reduced-motion` en el carrusel de marcas y cualquier otra animación CSS encontrada en la auditoría.
- [ ] 4.3 Prueba: axe no reporta violaciones nuevas de `alt`/contraste/movimiento tras los cambios.

## 5. Cierre

- [ ] 5.1 Suite completa (lint/typecheck/tests/build) en verde dentro de Docker Compose.
- [ ] 5.2 `openspec validate improve-visual-identity-and-content --strict`.
- [ ] 5.3 Informe final para revisión y aprobación — no archivar hasta aprobación explícita.
