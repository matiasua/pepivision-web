// Comando de reconciliación explícito (Fase 9, motor de compatibilidades)
// — nunca invocado desde un request público. Ejecutar con
// `docker compose exec web npm run catalog:reconcile-quote-options`.
// Agrega `quoteOptions` a las dos categorías canónicas cuando falta,
// preserva una edición administrativa ya válida, y reporta (sin
// sobrescribir) un `quoteOptions` inválido. Sale con código distinto de
// cero si hay algún conflicto o categoría faltante, para que no quede un
// estado "aparentemente exitoso" con datos corruptos.
import { prisma } from '@/lib/prisma';
import { reconcileCanonicalQuoteOptions } from '@/modules/catalog/quote-options-reconciliation';

async function main() {
  const results = await reconcileCanonicalQuoteOptions();

  let hasProblem = false;
  for (const result of results) {
    if (result.action === 'added') {
      console.log(`[${result.slug}] quoteOptions agregado (matriz canónica).`);
    } else if (result.action === 'preserved') {
      console.log(`[${result.slug}] quoteOptions ya existía y es válido — preservado sin cambios.`);
    } else if (result.action === 'conflict') {
      hasProblem = true;
      console.error(`[${result.slug}] CONFLICTO: quoteOptions existe pero es inválido — no se sobrescribió.`);
      for (const issue of result.issues ?? []) {
        console.error(`  - ${issue}`);
      }
    } else {
      hasProblem = true;
      console.error(`[${result.slug}] La categoría no existe todavía — ejecuta el seed antes de reconciliar.`);
    }
  }

  if (hasProblem) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Error inesperado al reconciliar quoteOptions.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
