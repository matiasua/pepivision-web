// Development seed: the 10 example frames from design-reference/'s `SEED`
// array (_pepi-standalone-src.html), converted into real Product rows.
// Idempotent: re-running upserts by `code` instead of duplicating rows.
// No images are seeded here (no base64 in Postgres, no MinIO upload yet —
// that's Fase 7); products render with the catalog's placeholder slots
// until an admin uploads real photos.
import { Gender, ProductBadge, ProductMaterial, ProductShape, PrismaClient } from '@prisma/client';
import { slugify } from '../lib/slug';

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

const SEED_PRODUCTS = [
  { code: 'PV-101', name: 'Aurora', price: 39900, gender: Gender.MUJER, shape: ProductShape.CAT_EYE, material: ProductMaterial.ACETATO, colors: ['Fucsia', 'Negro', 'Carey'], badge: ProductBadge.MAS_VENDIDO, available: true, sizes: '52-18-140 mm', description: 'Cat eye de acetato con un guiño retro y femenino. Liviano, cómodo y con presencia. Ideal para quienes buscan un look con carácter.' },
  { code: 'PV-102', name: 'Nova', price: 34900, gender: Gender.UNISEX, shape: ProductShape.REDONDO, material: ProductMaterial.METAL, colors: ['Dorado', 'Plata', 'Negro'], badge: ProductBadge.NUEVO, available: true, sizes: '49-20-145 mm', description: 'Montura redonda de metal fino, minimalista y versátil. Combina con todo y suaviza las facciones.' },
  { code: 'PV-103', name: 'Milano', price: 42900, gender: Gender.HOMBRE, shape: ProductShape.RECTANGULAR, material: ProductMaterial.ACETATO, colors: ['Negro', 'Azul', 'Café'], badge: null, available: true, sizes: '55-17-145 mm', description: 'Rectangular clásico de acetato, sobrio y elegante. Una apuesta segura para el día a día y la oficina.' },
  { code: 'PV-104', name: 'Bruno', price: 37900, gender: Gender.HOMBRE, shape: ProductShape.CUADRADO, material: ProductMaterial.MIXTO, colors: ['Negro', 'Carey', 'Azul'], badge: null, available: true, sizes: '54-18-140 mm', description: 'Armazón cuadrado mixto (acetato y metal) con líneas firmes. Moderno y resistente.' },
  { code: 'PV-105', name: 'Luna', price: 41900, gender: Gender.MUJER, shape: ProductShape.CAT_EYE, material: ProductMaterial.ACETATO, colors: ['Rosado', 'Cristal', 'Carey'], badge: ProductBadge.NUEVO, available: true, sizes: '51-19-140 mm', description: 'Cat eye suave en tonos claros, delicado y luminoso. Perfecto para un estilo fresco y femenino.' },
  { code: 'PV-106', name: 'Piloto', price: 44900, gender: Gender.UNISEX, shape: ProductShape.AVIADOR, material: ProductMaterial.METAL, colors: ['Dorado', 'Plata', 'Negro'], badge: ProductBadge.MAS_VENDIDO, available: true, sizes: '58-14-140 mm', description: 'Aviador atemporal de metal, cómodo y con estilo. Un ícono que nunca pasa de moda.' },
  { code: 'PV-107', name: 'Kids Pop', price: 24900, gender: Gender.INFANTIL, shape: ProductShape.REDONDO, material: ProductMaterial.ACETATO, colors: ['Fucsia', 'Azul', 'Verde'], badge: null, available: true, sizes: '44-16-125 mm', description: 'Montura redonda infantil, flexible y resistente. Colores alegres pensados para los más pequeños.' },
  { code: 'PV-108', name: 'Serena', price: 36900, gender: Gender.MUJER, shape: ProductShape.REDONDO, material: ProductMaterial.ACETATO, colors: ['Carey', 'Rosado', 'Negro'], badge: null, available: true, sizes: '50-20-140 mm', description: 'Redonda de acetato con aire vintage. Cálida, cómoda y muy fácil de combinar.' },
  { code: 'PV-109', name: 'Max', price: 33900, gender: Gender.HOMBRE, shape: ProductShape.RECTANGULAR, material: ProductMaterial.MIXTO, colors: ['Negro', 'Azul', 'Plata'], badge: null, available: false, sizes: '56-17-145 mm', description: 'Rectangular mixto de perfil deportivo, ligero y funcional para un ritmo activo.' },
  { code: 'PV-110', name: 'Coral', price: 45900, gender: Gender.MUJER, shape: ProductShape.CAT_EYE, material: ProductMaterial.METAL, colors: ['Dorado', 'Fucsia', 'Plata'], badge: ProductBadge.NUEVO, available: true, sizes: '53-18-140 mm', description: 'Cat eye de metal con detalles finos y un toque sofisticado. Para brillar con elegancia.' },
];

async function main() {
  for (const item of SEED_PRODUCTS) {
    const slug = slugify(item.name);
    const colorRecords = item.colors.map((name) => ({ name, hex: SWATCH_HEX[name] ?? '#cccccc' }));

    const existing = await prisma.product.findUnique({ where: { code: item.code } });

    if (existing) {
      await prisma.productColor.deleteMany({ where: { productId: existing.id } });
      await prisma.product.update({
        where: { code: item.code },
        data: {
          slug,
          name: item.name,
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
    } else {
      await prisma.product.create({
        data: {
          code: item.code,
          slug,
          name: item.name,
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
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
