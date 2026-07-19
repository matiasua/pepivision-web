import { z } from 'zod';

// Fase 12 (cierre operativo): un valor por definición. El tipo real de la
// definición (resuelto server-side, nunca confiado del cliente) decide
// cuál de estos campos se usa; este schema solo acota la FORMA — la
// validación semántica (pertenece a `options`, no cruza categoría,
// duplicados, etc.) vive en offering-attribute-service.ts.
export const offeringAttributeValueInputSchema = z
  .object({
    attributeDefinitionId: z.string().trim().min(1),
    // `null` explícito = "el administrador retiró este valor" — a
    // diferencia de `undefined` (campo simplemente no enviado), que el
    // servicio trata igual (ambos significan "sin valor para este
    // atributo en este submit").
    textValue: z.string().trim().max(300).nullable().optional(),
    multiValues: z.array(z.string().trim().min(1).max(120)).max(30).nullable().optional(),
    numberValue: z.number().finite().nonnegative().nullable().optional(),
    booleanValue: z.boolean().nullable().optional(),
  })
  .strict();

export type OfferingAttributeValueInput = z.infer<typeof offeringAttributeValueInputSchema>;

export const updateOfferingAttributeValuesSchema = z.object({
  offeringId: z.string().trim().min(1),
  // Límite generoso pero acotado — nunca "cientos" de valores por una
  // sola oferta (ver sección de seguridad, sin DoS mediante payloads
  // enormes).
  values: z.array(offeringAttributeValueInputSchema).max(50),
});

export type UpdateOfferingAttributeValuesInput = z.infer<typeof updateOfferingAttributeValuesSchema>;
