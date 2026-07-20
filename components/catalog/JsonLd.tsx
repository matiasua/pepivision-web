import { serializeJsonLd } from '@/modules/catalog/seo';

/**
 * Único componente de renderizado de JSON-LD del catálogo (Fase 14) —
 * `dangerouslySetInnerHTML` es correcto y necesario aquí: el contenido ya
 * pasó por `serializeJsonLd()` (JSON.stringify + escape de `<`/`>`/`&`),
 * nunca HTML crudo ni datos sin serializar. Interpolar `data` directamente
 * como hijo de `<script>` rompería el JSON (React escaparía las comillas
 * como entidades HTML).
 */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
