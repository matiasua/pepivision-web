// Backfill explícito de la Fase 15 (redesign-extensible-catalog-v2 —
// migración, backfill y corte definitivo, tarea 15.8): crea una
// `ProductOffering` en Lentes ópticos para cada `Product` visible que
// todavía no tiene ninguna oferta. Nunca se invoca automáticamente
// (ni en el arranque de la app, ni en requests públicos, ni en
// migraciones Prisma, ni en el seed normal) — solo manualmente:
//
//   Dry-run (por defecto, nunca escribe):
//     docker compose exec web npm run catalog:backfill-product-offerings
//
//   Write mode (requiere AMBAS banderas explícitas):
//     docker compose exec web npm run catalog:backfill-product-offerings -- \
//       --write --confirm=BACKFILL_PRODUCT_OFFERINGS
//
// Ver modules/catalog/offering-backfill.ts para la lógica (planificación
// + escritura transaccional) y design.md → "Fase 15" para la decisión de
// alcance completa.
import { AdminRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/modules/auth/service';
import {
  executeProductOfferingBackfill,
  planProductOfferingBackfill,
  type BackfillPlan,
} from '@/modules/catalog/offering-backfill';

const REQUIRED_CONFIRMATION = 'BACKFILL_PRODUCT_OFFERINGS';

function printPlan(plan: BackfillPlan) {
  console.log(`Categoría destino: ${plan.categorySlug} (${plan.categoryFound ? 'existe' : 'NO EXISTE — bloqueante'})`);
  console.log(`Products examinados (visibles, sin ninguna oferta): ${plan.productsExamined}`);
  console.log(`ProductOffering existentes hoy (se preservan sin cambios): ${plan.existingOfferingsPreserved}`);
  console.log(`Ofertas a crear: ${plan.candidates.length}`);
  for (const candidate of plan.candidates) {
    console.log(
      `  - ${candidate.productCode}: /catalogo/${plan.categorySlug}/${candidate.plannedSlug} · Desde $${candidate.priceFromClp.toLocaleString('es-CL')} (sortOrder ${candidate.plannedSortOrder})`
    );
  }
  if (plan.dataConflicts.length > 0) {
    console.log(`Conflictos de datos (bloqueantes, omitidos): ${plan.dataConflicts.length}`);
    for (const conflict of plan.dataConflicts) {
      console.log(`  - ${conflict.productCode}: ${conflict.reason}`);
    }
  }
  if (plan.slugConflicts.length > 0) {
    console.log(`Conflictos de slug (bloqueantes, omitidos): ${plan.slugConflicts.length}`);
    for (const conflict of plan.slugConflicts) {
      console.log(`  - ${conflict.productCode}: "${conflict.slug}" ya está en uso por la oferta ${conflict.conflictingOfferingId}`);
    }
  }
  console.log(`Total de ProductOffering esperado después de escribir: ${plan.totalOfferingsAfterWrite}`);
}

function hasBlockingConflicts(plan: BackfillPlan): boolean {
  return !plan.categoryFound || plan.dataConflicts.length > 0 || plan.slugConflicts.length > 0;
}

async function resolveAuditActorId(): Promise<string> {
  const superadmin = await prisma.adminUser.findFirst({
    where: { role: AdminRole.SUPERADMIN, active: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!superadmin) {
    throw new Error(
      'No hay ningún SUPERADMIN activo para atribuir la auditoría de este backfill — crea uno con `npm run admin:create-superadmin` antes de escribir.'
    );
  }
  return superadmin.id;
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const confirmArg = args.find((a) => a.startsWith('--confirm='));
  const confirmValue = confirmArg?.split('=')[1];

  console.log('=== Backfill de ProductOffering (Lentes ópticos) — planificación ===');
  const plan = await planProductOfferingBackfill();
  printPlan(plan);

  if (!write) {
    console.log('\nDry-run únicamente — no se escribió nada. Agrega --write --confirm=BACKFILL_PRODUCT_OFFERINGS para ejecutar.');
    if (hasBlockingConflicts(plan)) {
      console.error('\nHay conflictos bloqueantes — no se podría ejecutar en modo escritura hasta resolverlos.');
      process.exitCode = 1;
    }
    return;
  }

  // --write por sí solo nunca es suficiente — la confirmación literal
  // debe coincidir exactamente, nunca inferida de un valor por defecto.
  if (confirmValue !== REQUIRED_CONFIRMATION) {
    console.error(
      `\nFalta la confirmación explícita. Vuelve a ejecutar con --write --confirm=${REQUIRED_CONFIRMATION} exactamente.`
    );
    process.exitCode = 1;
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('\nEste backfill no está autorizado a ejecutarse con NODE_ENV=production. Abortando.');
    process.exitCode = 1;
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error('\nDATABASE_URL no está definida. Abortando.');
    process.exitCode = 1;
    return;
  }

  if (hasBlockingConflicts(plan)) {
    console.error('\nHay conflictos bloqueantes — no se ejecutará el modo escritura. Revisa el plan de arriba.');
    process.exitCode = 1;
    return;
  }

  if (plan.candidates.length === 0) {
    console.log('\nNo hay candidatos pendientes — nada que escribir (idempotente).');
    return;
  }

  console.log('\n=== Modo escritura confirmado — repitiendo la planificación dentro de la transacción ===');
  const actorId = await resolveAuditActorId();
  const result = await executeProductOfferingBackfill();

  for (const offeringId of result.createdOfferingIds) {
    await recordAudit({
      actorId,
      action: 'offering.created',
      targetType: 'ProductOffering',
      targetId: offeringId,
      metadata: { source: 'backfill-product-offerings', categorySlug: plan.categorySlug },
    });
  }

  console.log(`\nOfertas creadas: ${result.createdCount}.`);
  console.log('Ejecuta el script nuevamente (sin --write) para confirmar 0 candidatos restantes.');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Error inesperado durante el backfill.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
