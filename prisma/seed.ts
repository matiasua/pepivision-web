// Development seed: the 10 example frames from design-reference/'s `SEED`
// array (_pepi-standalone-src.html), converted into real Product rows.
// Idempotent: re-running upserts by `code` instead of duplicating rows.
// No images are seeded here (no base64 in Postgres, no MinIO upload yet —
// that's Fase 7); products render with the catalog's placeholder slots
// until an admin uploads real photos.
import { Gender, ProductBadge, ProductMaterial, ProductShape, PrismaClient } from '@prisma/client';
import { slugify } from '../lib/slug';
import { getBrandLogos } from '../lib/brands';
import { categoryCapabilitiesSchema, type CategoryCapabilities } from '../modules/catalog/category-capabilities';

const prisma = new PrismaClient();

const SWATCH_HEX: Record<string, string> = {
  Fucsia: '#E5127D',
  Negro: '#1c1c22',
  Carey: '#7a4a1e',
  Azul: '#16265F',
  Plata: '#b8c0cc',
  Dorado: '#d4af37',
  Rosado: '#F48FB1',
  Cristal: '#dfe6ee',
  Verde: '#2f7d5b',
  Café: '#5a3a24',
};

// `brandSlug` picks a real brand from public/marcas/ (via getBrandLogos(),
// same manifest the home carousel and admin selector use — see
// seedBrands() below) purely so the catalog's brand filter has real,
// non-fictitious data to demo against in this dev seed. Assigned
// deterministically (alphabetical order of the real logo files), not
// invented.
const SEED_PRODUCTS = [
  { code: 'PV-101', name: 'Aurora', price: 39900, gender: Gender.MUJER, shape: ProductShape.CAT_EYE, material: ProductMaterial.ACETATO, colors: ['Fucsia', 'Negro', 'Carey'], badge: ProductBadge.MAS_VENDIDO, available: true, sizes: '52-18-140 mm', description: 'Cat eye de acetato con un guiño retro y femenino. Liviano, cómodo y con presencia. Ideal para quienes buscan un look con carácter.', brandSlug: 'angelo-falconi' },
  { code: 'PV-102', name: 'Nova', price: 34900, gender: Gender.UNISEX, shape: ProductShape.REDONDO, material: ProductMaterial.METAL, colors: ['Dorado', 'Plata', 'Negro'], badge: ProductBadge.NUEVO, available: true, sizes: '49-20-145 mm', description: 'Montura redonda de metal fino, minimalista y versátil. Combina con todo y suaviza las facciones.', brandSlug: 'eye-shield' },
  { code: 'PV-103', name: 'Milano', price: 42900, gender: Gender.HOMBRE, shape: ProductShape.RECTANGULAR, material: ProductMaterial.ACETATO, colors: ['Negro', 'Azul', 'Café'], badge: null, available: true, sizes: '55-17-145 mm', description: 'Rectangular clásico de acetato, sobrio y elegante. Una apuesta segura para el día a día y la oficina.', brandSlug: 'eye-tech' },
  { code: 'PV-104', name: 'Bruno', price: 37900, gender: Gender.HOMBRE, shape: ProductShape.CUADRADO, material: ProductMaterial.MIXTO, colors: ['Negro', 'Carey', 'Azul'], badge: null, available: true, sizes: '54-18-140 mm', description: 'Armazón cuadrado mixto (acetato y metal) con líneas firmes. Moderno y resistente.', brandSlug: 'foose' },
  { code: 'PV-105', name: 'Luna', price: 41900, gender: Gender.MUJER, shape: ProductShape.CAT_EYE, material: ProductMaterial.ACETATO, colors: ['Rosado', 'Cristal', 'Carey'], badge: ProductBadge.NUEVO, available: true, sizes: '51-19-140 mm', description: 'Cat eye suave en tonos claros, delicado y luminoso. Perfecto para un estilo fresco y femenino.', brandSlug: 'game-day' },
  { code: 'PV-106', name: 'Piloto', price: 44900, gender: Gender.UNISEX, shape: ProductShape.AVIADOR, material: ProductMaterial.METAL, colors: ['Dorado', 'Plata', 'Negro'], badge: ProductBadge.MAS_VENDIDO, available: true, sizes: '58-14-140 mm', description: 'Aviador atemporal de metal, cómodo y con estilo. Un ícono que nunca pasa de moda.', brandSlug: 'gattizoni' },
  { code: 'PV-107', name: 'Kids Pop', price: 24900, gender: Gender.INFANTIL, shape: ProductShape.REDONDO, material: ProductMaterial.ACETATO, colors: ['Fucsia', 'Azul', 'Verde'], badge: null, available: true, sizes: '44-16-125 mm', description: 'Montura redonda infantil, flexible y resistente. Colores alegres pensados para los más pequeños.', brandSlug: 'george' },
  { code: 'PV-108', name: 'Serena', price: 36900, gender: Gender.MUJER, shape: ProductShape.REDONDO, material: ProductMaterial.ACETATO, colors: ['Carey', 'Rosado', 'Negro'], badge: null, available: true, sizes: '50-20-140 mm', description: 'Redonda de acetato con aire vintage. Cálida, cómoda y muy fácil de combinar.', brandSlug: 'ice-look' },
  { code: 'PV-109', name: 'Max', price: 33900, gender: Gender.HOMBRE, shape: ProductShape.RECTANGULAR, material: ProductMaterial.MIXTO, colors: ['Negro', 'Azul', 'Plata'], badge: null, available: false, sizes: '56-17-145 mm', description: 'Rectangular mixto de perfil deportivo, ligero y funcional para un ritmo activo.', brandSlug: 'jean-de-paris' },
  { code: 'PV-110', name: 'Coral', price: 45900, gender: Gender.MUJER, shape: ProductShape.CAT_EYE, material: ProductMaterial.METAL, colors: ['Dorado', 'Fucsia', 'Plata'], badge: ProductBadge.NUEVO, available: true, sizes: '53-18-140 mm', description: 'Cat eye de metal con detalles finos y un toque sofisticado. Para brillar con elegancia.', brandSlug: 'jorgio' },
];

// redesign-extensible-catalog-v2 (Fase 2): las tres categorías iniciales,
// con sus capabilities cerradas en design.md → "Capacidades tipadas —
// Valores iniciales de las tres categorías (CERRADO...)". Solo estas tres
// se siembran por script — toda categoría posterior se crea desde
// /admin/categories (Fase 4), nunca agregándola aquí.
const SEED_CATEGORIES: { slug: string; name: string; sortOrder: number; capabilities: CategoryCapabilities }[] = [
  {
    slug: 'armazones',
    name: 'Armazones',
    sortOrder: 0,
    capabilities: {
      requiresColor: true,
      allowsLensType: false,
      allowsTreatments: false,
      allowsPrescription: false,
      allowsPrescriptionAttachment: false,
      allowsLensTint: false,
      allowsFrameSelection: true,
    },
  },
  {
    slug: 'lentes-opticos',
    name: 'Lentes ópticos',
    sortOrder: 1,
    capabilities: {
      requiresColor: true,
      allowsLensType: true,
      allowsTreatments: true,
      allowsPrescription: true,
      allowsPrescriptionAttachment: true,
      allowsLensTint: false,
      allowsFrameSelection: true,
    },
  },
  {
    slug: 'lentes-de-sol-opticos',
    name: 'Lentes de sol ópticos',
    sortOrder: 2,
    capabilities: {
      requiresColor: true,
      allowsLensType: true,
      allowsTreatments: true,
      allowsPrescription: true,
      allowsPrescriptionAttachment: true,
      allowsLensTint: true,
      allowsFrameSelection: true,
    },
  },
];

/**
 * Idempotente vía upsert-por-slug, igual que seedBrands() — re-ejecutar no
 * duplica categorías ni cambia el `id` de una ya existente. Exportada
 * (a diferencia del resto de este script) para que
 * tests-integration/category-seed.test.ts pueda ejercer la idempotencia
 * real contra Postgres sin correr todo el seed de catálogo/comunas.
 *
 * A diferencia de seedBrands() (que sí resincroniza name/logoPath/sortOrder
 * en cada corrida — seguro ahí porque Brand no tiene ningún panel admin
 * que los edite), Category SÍ tendrá `/admin/categories` (Fase 4,
 * name/sortOrder/capabilities/active/visible/etc. editables). Por eso
 * `update: {}`: una categoría que ya existe nunca se toca — el seed solo
 * crea las que faltan, para no pisar silenciosamente una edición
 * administrativa posterior con una nueva corrida de `prisma db seed`.
 */
export async function seedCategories() {
  for (const item of SEED_CATEGORIES) {
    // Valida incluso este valor hardcoded contra el mismo schema Zod que
    // protege una escritura real desde /admin/categories — nunca se asume
    // que un literal en código está automáticamente bien formado.
    const capabilities = categoryCapabilitiesSchema.parse(item.capabilities);
    await prisma.category.upsert({
      where: { slug: item.slug },
      update: {},
      create: { slug: item.slug, name: item.name, sortOrder: item.sortOrder, capabilities },
    });
  }

  const count = await prisma.category.count();
  console.log(`Seed de categorías completo. ${count} categorías en la base de datos.`);
}

// Dev bootstrap for `home-visit-coverage`: there is no admin panel yet to
// manage this list (depends on admin-auth, Fase 6), but the home-visit
// form's "comuna habilitada" validation (Fase 5) needs real rows to check
// against. Based in Quilicura per lib/site-config.ts; one comuna (Puente
// Alto) is seeded inactive so the "not covered" warning path is testable.
const SEED_COMUNAS: { name: string; region: string; active: boolean }[] = [
  { name: 'Quilicura', region: 'Región Metropolitana', active: true },
  { name: 'Renca', region: 'Región Metropolitana', active: true },
  { name: 'Huechuraba', region: 'Región Metropolitana', active: true },
  { name: 'Conchalí', region: 'Región Metropolitana', active: true },
  { name: 'Independencia', region: 'Región Metropolitana', active: true },
  { name: 'Recoleta', region: 'Región Metropolitana', active: true },
  { name: 'Santiago', region: 'Región Metropolitana', active: true },
  { name: 'Providencia', region: 'Región Metropolitana', active: true },
  { name: 'Ñuñoa', region: 'Región Metropolitana', active: true },
  { name: 'Puente Alto', region: 'Región Metropolitana', active: false },
];

/**
 * Upserts one Brand row per real logo in public/marcas/ (via
 * getBrandLogos() — the exact same manifest the home carousel and admin
 * selector read), keyed by the normalized slug so re-running never
 * duplicates a brand even if its display name capitalization changes.
 * Returns a slug -> id map for wiring SEED_PRODUCTS.brandSlug below.
 */
async function seedBrands(): Promise<Map<string, string>> {
  const logos = getBrandLogos();
  const slugToId = new Map<string, string>();

  for (const [index, logo] of logos.entries()) {
    const slug = slugify(logo.alt);
    const brand = await prisma.brand.upsert({
      where: { slug },
      update: { name: logo.alt, logoPath: logo.src, sortOrder: index },
      create: { name: logo.alt, slug, logoPath: logo.src, sortOrder: index },
    });
    slugToId.set(slug, brand.id);
  }

  console.log(`Seed de marcas completo. ${slugToId.size} marcas en la base de datos.`);
  return slugToId;
}

/**
 * Reconciles a product's colors against `desiredNames` without ever
 * deleting a color that still has photos attached — the previous version
 * of this seed did an unconditional deleteMany-then-recreate, which would
 * throw a foreign key violation (and abort the whole seed run) against
 * any product whose colors already have real ProductImage rows pointing
 * at them (composite FK, see migration 20260714000000_product_image_gallery).
 * A color with photos that's no longer in `desiredNames` is simply left
 * in place instead — safe, and still idempotent.
 */
async function syncProductColors(productId: string, desiredNames: string[]) {
  const existing = await prisma.productColor.findMany({ where: { productId } });
  const existingByName = new Map(existing.map((c) => [c.name, c]));

  for (const name of desiredNames) {
    const hex = SWATCH_HEX[name] ?? '#cccccc';
    const current = existingByName.get(name);
    if (current) {
      if (current.hex !== hex) {
        await prisma.productColor.update({ where: { id: current.id }, data: { hex } });
      }
    } else {
      await prisma.productColor.create({ data: { productId, name, hex } });
    }
  }

  const toRemove = existing.filter((c) => !desiredNames.includes(c.name));
  if (toRemove.length > 0) {
    const stillUsed = await prisma.productImage.findMany({
      where: { productColorId: { in: toRemove.map((c) => c.id) } },
      select: { productColorId: true },
      distinct: ['productColorId'],
    });
    const usedIds = new Set(stillUsed.map((i) => i.productColorId));
    const removable = toRemove.filter((c) => !usedIds.has(c.id));
    if (removable.length > 0) {
      await prisma.productColor.deleteMany({ where: { id: { in: removable.map((c) => c.id) } } });
    }
  }
}

async function main() {
  await seedCategories();
  const brandIdBySlug = await seedBrands();

  for (const item of SEED_PRODUCTS) {
    const slug = slugify(item.name);
    const brandId = brandIdBySlug.get(item.brandSlug) ?? null;

    // Match by code first, falling back to slug: an admin may have since
    // edited a seeded product's code from the panel (real, observed case:
    // "Coral" / PV-110 was renamed to XAPFO-126), and this seed must stay
    // idempotent against that rather than attempting to create a second
    // row with the same slug and crashing on the unique constraint.
    const existing =
      (await prisma.product.findUnique({ where: { code: item.code } })) ??
      (await prisma.product.findUnique({ where: { slug } }));

    if (existing) {
      await syncProductColors(existing.id, item.colors);
      await prisma.product.update({
        where: { id: existing.id },
        data: {
          slug,
          name: item.name,
          brandId,
          priceFromClp: item.price,
          gender: item.gender,
          shape: item.shape,
          material: item.material,
          badge: item.badge,
          available: item.available,
          sizes: item.sizes,
          description: item.description,
        },
      });
    } else {
      const colorRecords = item.colors.map((name) => ({ name, hex: SWATCH_HEX[name] ?? '#cccccc' }));
      await prisma.product.create({
        data: {
          code: item.code,
          slug,
          name: item.name,
          brandId,
          priceFromClp: item.price,
          gender: item.gender,
          shape: item.shape,
          material: item.material,
          badge: item.badge,
          available: item.available,
          sizes: item.sizes,
          description: item.description,
          colors: { create: colorRecords },
        },
      });
    }
  }

  const count = await prisma.product.count();
  console.log(`Seed de catálogo completo. ${count} productos en la base de datos.`);

  for (const comuna of SEED_COMUNAS) {
    await prisma.enabledComuna.upsert({
      where: { name: comuna.name },
      update: { region: comuna.region, active: comuna.active },
      create: comuna,
    });
  }

  const comunaCount = await prisma.enabledComuna.count();
  console.log(`Seed de comunas completo. ${comunaCount} comunas en la base de datos.`);
}

// Guarda contra ejecutar el seed completo como efecto colateral de un
// `import` (p. ej. desde tests-integration/category-seed.test.ts, que solo
// necesita `seedCategories`) — `main()` corre únicamente cuando este
// archivo es el punto de entrada real (`tsx prisma/seed.ts` /
// `prisma db seed`).
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
