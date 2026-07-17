// Cubre Fase 2 (tarea 2.3, ahora también 5.4/5.5 tras la corrección de
// taxonomía) de redesign-extensible-catalog-v2: correr el seed de
// categorías dos veces no duplica filas ni cambia sus ids. Real Postgres
// via Prisma, no mocks. Las dos categorías definitivas sembradas
// (lentes-opticos, lentes-de-sol) son datos de desarrollo compartidos e
// idempotentes — igual que Brand/EnabledComuna, no se eliminan al final de
// este test. Ver tests-integration/category-taxonomy-migration.test.ts
// para la migración desde la taxonomía legada de tres categorías.
import { describe, expect, it } from 'vitest';
import { seedCategories } from '../prisma/seed';
import { prisma } from './helpers';

const SEEDED_SLUGS = ['lentes-de-sol', 'lentes-opticos'];

describe('prisma/seed — seedCategories (integration)', () => {
  it('running the seed twice keeps exactly two categories with stable ids', async () => {
    await seedCategories();
    const firstRun = await prisma.category.findMany({
      where: { slug: { in: SEEDED_SLUGS } },
      orderBy: { slug: 'asc' },
    });
    expect(firstRun).toHaveLength(2);

    await seedCategories();
    const secondRun = await prisma.category.findMany({
      where: { slug: { in: SEEDED_SLUGS } },
      orderBy: { slug: 'asc' },
    });

    expect(secondRun).toHaveLength(2);
    expect(secondRun.map((c) => c.id)).toEqual(firstRun.map((c) => c.id));
    expect(secondRun.map((c) => c.slug)).toEqual(SEEDED_SLUGS);
  });

  it('never seeds armazones or lentes-de-sol-opticos', async () => {
    await seedCategories();

    const legacy = await prisma.category.findMany({
      where: { slug: { in: ['armazones', 'lentes-de-sol-opticos'] } },
    });
    expect(legacy).toHaveLength(0);
  });

  it('seeds the closed capabilities table from design.md for each of the two definitive categories', async () => {
    await seedCategories();

    const lentesOpticos = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-opticos' } });
    expect(lentesOpticos.name).toBe('Lentes ópticos');
    expect(lentesOpticos.capabilities).toMatchObject({
      requiresColor: true,
      allowsLensType: true,
      allowsTreatments: true,
      allowsPrescription: true,
      allowsPrescriptionAttachment: true,
      allowsLensTint: false,
      allowsFrameSelection: true,
    });

    const lentesDeSol = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-de-sol' } });
    expect(lentesDeSol.name).toBe('Lentes de sol');
    expect(lentesDeSol.capabilities).toMatchObject({
      requiresColor: true,
      allowsLensType: true,
      allowsTreatments: true,
      allowsPrescription: true,
      allowsPrescriptionAttachment: true,
      allowsLensTint: true,
      allowsFrameSelection: true,
    });
  });

  it('never overwrites an administratively-edited category on a later re-run', async () => {
    await seedCategories();

    // Simula una edición desde el futuro /admin/categories (Fase 4) sobre
    // exactamente los campos que el seed sembró inicialmente — name,
    // sortOrder y capabilities — más active/visible, que el seed nunca
    // toca en absoluto.
    const before = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-opticos' } });
    const originalCapabilities = before.capabilities as Record<string, boolean>;
    const editedCapabilities = { ...originalCapabilities, allowsLensTint: true };
    await prisma.category.update({
      where: { id: before.id },
      data: {
        name: 'Lentes ópticos (editado por admin)',
        sortOrder: 99,
        active: false,
        visible: false,
        capabilities: editedCapabilities,
      },
    });

    await seedCategories();

    const after = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-opticos' } });
    expect(after.id).toBe(before.id);
    expect(after.name).toBe('Lentes ópticos (editado por admin)');
    expect(after.sortOrder).toBe(99);
    expect(after.active).toBe(false);
    expect(after.visible).toBe(false);
    expect(after.capabilities).toMatchObject(editedCapabilities);

    const total = await prisma.category.count({ where: { slug: { in: SEEDED_SLUGS } } });
    expect(total).toBe(2);

    // Deja la categoría como el resto de las pruebas de este archivo la
    // esperan (activa/visible, capabilities originales) — no es un dato
    // sintético propio que se limpie por id, es la fila de desarrollo
    // compartida que este mismo archivo reutiliza en los otros tests.
    await prisma.category.update({
      where: { id: before.id },
      data: { name: before.name, sortOrder: before.sortOrder, active: true, visible: true, capabilities: originalCapabilities },
    });
  });
});
