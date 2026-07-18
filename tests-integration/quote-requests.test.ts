// Covers Fase 9 integration points 12-14 (+ EmailLog verification via
// Mailpit, point 17) y Fase 10 (cotizador configurable, tareas 10.6-10.9):
// cotización sin receta, cotización con receta, RequestAttachment, correo
// capturado en Mailpit real, re-resolución server-side de categoría/
// oferta/producto/color.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AdminRole, Gender, ProductMaterial, ProductShape } from '@prisma/client';
import { submitQuote } from '@/modules/requests/service';
import { createProduct } from '@/modules/catalog/admin-service';
import { createOffering } from '@/modules/catalog/offering-service';
import { seedCategories } from '../prisma/seed';
import {
  createTestAdmin,
  deleteTestAdmins,
  deleteMailpitMessages,
  env,
  findMailpitMessagesTo,
  objectExistsInBucket,
  prisma,
  tinyPngBuffer,
  uniqueTag,
} from './helpers';

describe('modules/requests/service — submitQuote (integration)', () => {
  const requestIds: string[] = [];
  const mailpitIds: string[] = [];
  const adminIds: string[] = [];
  const brandIds: string[] = [];
  const productIds: string[] = [];
  const offeringIds: string[] = [];
  let opticalCategoryId: string;

  beforeAll(async () => {
    await seedCategories();
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-opticos' } });
    opticalCategoryId = category.id;
  });

  afterAll(async () => {
    await prisma.requestAttachment.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.emailLog.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.request.deleteMany({ where: { id: { in: requestIds } } });
    await deleteMailpitMessages(mailpitIds);
    await prisma.productOffering.deleteMany({ where: { id: { in: offeringIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.brand.deleteMany({ where: { id: { in: brandIds } } });
    await deleteTestAdmins(adminIds);
  });

  function uniquePhone() {
    return `+56 9 ${Math.floor(10000000 + Math.random() * 89999999)}`;
  }

  async function makeActor() {
    const { user, session } = await createTestAdmin(AdminRole.ADMIN);
    adminIds.push(user.id);
    return session;
  }

  async function makeOpticalOffering() {
    const actor = await makeActor();
    const tag = uniqueTag('prod');
    const brand = await prisma.brand.create({ data: { name: tag, slug: tag, active: true } });
    brandIds.push(brand.id);
    const product = await createProduct(
      {
        name: `Modelo ${tag}`,
        code: tag,
        brandId: brand.id,
        priceFromClp: 29990,
        sizes: undefined,
        gender: Gender.UNISEX,
        shape: ProductShape.REDONDO,
        material: ProductMaterial.ACETATO,
        available: true,
        visible: true,
        badge: undefined,
        description: undefined,
        colors: [{ name: 'Negro', hex: '#000000' }],
      },
      actor
    );
    productIds.push(product.id);

    const offering = await createOffering(
      {
        productId: product.id,
        categoryId: opticalCategoryId,
        title: undefined,
        commercialDescription: undefined,
        priceFromClp: 19990,
        active: true,
        visible: true,
        featured: false,
        sortOrder: 0,
        seoTitle: undefined,
        seoDescription: undefined,
      },
      actor
    );
    offeringIds.push(offering.id);

    const color = await prisma.productColor.findFirstOrThrow({ where: { productId: product.id } });
    return { offering, product, color };
  }

  it('creates a quote request without a prescription (asesoría, Sin graduación no aplica en ópticos — Monofocal siempre requiere receta)', async () => {
    const tag = uniqueTag('quote');
    const email = `${tag}@integration.test.pepivision360.invalid`;
    const phone = uniquePhone();

    const result = await submitQuote(
      {
        categoryId: opticalCategoryId,
        frameChoice: 'advice',
        lensModality: 'monofocal',
        treatments: ['antirreflejo'],
        additionalOptions: [],
        hasPrescription: 'Sí',
        name: `Cliente ${tag}`,
        phone,
        email,
        comuna: undefined,
        message: undefined,
        consent: true,
        website: '',
      },
      null
    );
    expect(result.customerName).toBe(`Cliente ${tag}`);

    const request = await prisma.request.findFirstOrThrow({ where: { phone, type: 'QUOTE' } });
    requestIds.push(request.id);
    expect(request.hasPrescription).toBe(true);

    const details = request.details as Record<string, unknown>;
    expect(details.categorySlug).toBe('lentes-opticos');
    expect(details.glassType).toBe('Monofocal');
    expect(details.treatmentLabels).toEqual(['Antirreflejo']);

    const attachments = await prisma.requestAttachment.findMany({ where: { requestId: request.id } });
    expect(attachments).toHaveLength(0);

    const emailLogs = await prisma.emailLog.findMany({ where: { requestId: request.id } });
    expect(emailLogs.length).toBeGreaterThanOrEqual(1);
    expect(emailLogs.every((log) => log.status === 'SENT')).toBe(true);

    const messages = await findMailpitMessagesTo(email);
    expect(messages.length).toBeGreaterThanOrEqual(1);
    mailpitIds.push(...messages.map((m) => m.ID));
  });

  it('creates a quote request WITH a prescription attachment, stored in the private bucket', async () => {
    const tag = uniqueTag('quote');
    const email = `${tag}@integration.test.pepivision360.invalid`;
    const phone = uniquePhone();
    const buffer = await tinyPngBuffer();

    await submitQuote(
      {
        categoryId: opticalCategoryId,
        frameChoice: 'advice',
        lensModality: 'bifocal',
        treatments: [],
        additionalOptions: [],
        hasPrescription: 'Sí',
        name: `Cliente ${tag}`,
        phone,
        email,
        comuna: undefined,
        message: undefined,
        consent: true,
        website: '',
      },
      { buffer, contentType: 'image/png', size: buffer.length, originalFileName: 'receta.png' }
    );

    const request = await prisma.request.findFirstOrThrow({
      where: { phone, type: 'QUOTE' },
      include: { attachments: true },
    });
    requestIds.push(request.id);

    expect(request.attachments).toHaveLength(1);
    const attachment = request.attachments[0];
    expect(attachment.mimeType).toBe('image/png');
    expect(await objectExistsInBucket(env.PRIVATE_OBJECT_STORAGE_BUCKET, attachment.storageKey)).toBe(true);

    const messages = await findMailpitMessagesTo(email);
    mailpitIds.push(...messages.map((m) => m.ID));
  });

  it('creates a quote request with lensModality "progresivo" end-to-end (glassType se resuelve al label "Progresivo")', async () => {
    const tag = uniqueTag('quote');
    const email = `${tag}@integration.test.pepivision360.invalid`;
    const phone = uniquePhone();

    await submitQuote(
      {
        categoryId: opticalCategoryId,
        frameChoice: 'advice',
        lensModality: 'progresivo',
        treatments: ['fotocromatico'],
        additionalOptions: [],
        hasPrescription: 'Sí',
        name: `Cliente ${tag}`,
        phone,
        email,
        comuna: undefined,
        message: undefined,
        consent: true,
        website: '',
      },
      null
    );

    const request = await prisma.request.findFirstOrThrow({ where: { phone, type: 'QUOTE' } });
    requestIds.push(request.id);
    expect((request.details as Record<string, unknown>).glassType).toBe('Progresivo');

    const messages = await findMailpitMessagesTo(email);
    expect(messages.length).toBeGreaterThanOrEqual(1);
    mailpitIds.push(...messages.map((m) => m.ID));
  });

  it('rejects a prescription file whose content does not match its declared type (never trusts declared MIME alone)', async () => {
    const tag = uniqueTag('quote');
    const phone = uniquePhone();

    await expect(
      submitQuote(
        {
          categoryId: opticalCategoryId,
          frameChoice: 'advice',
          lensModality: 'monofocal',
          treatments: [],
          additionalOptions: [],
          hasPrescription: 'Sí',
          name: `Cliente ${tag}`,
          phone,
          email: undefined,
          comuna: undefined,
          message: undefined,
          consent: true,
          website: '',
        },
        { buffer: Buffer.from('not-a-real-pdf-or-image'), contentType: 'application/pdf', size: 25, originalFileName: 'receta.pdf' }
      )
    ).rejects.toThrow();

    const request = await prisma.request.findFirst({ where: { phone, type: 'QUOTE' } });
    expect(request).toBeNull(); // rejected before persisting anything
  });

  it('the honeypot short-circuits before any Request row or email is created', async () => {
    const tag = uniqueTag('quote');
    const phone = uniquePhone();

    await submitQuote(
      {
        categoryId: opticalCategoryId,
        frameChoice: 'advice',
        lensModality: 'monofocal',
        treatments: [],
        additionalOptions: [],
        hasPrescription: 'No',
        name: `Bot ${tag}`,
        phone,
        email: undefined,
        comuna: undefined,
        message: undefined,
        consent: true,
        website: 'http://spam.example', // honeypot field filled in => bot
      },
      null
    );

    const request = await prisma.request.findFirst({ where: { phone, type: 'QUOTE' } });
    expect(request).toBeNull();
  });

  // Fase 10, 10.6-10.7: flujo con ProductOffering real.
  it('10.6 — flujo Lentes ópticos completo desde una ProductOffering real, con color re-resuelto server-side', async () => {
    const { offering, color } = await makeOpticalOffering();
    const tag = uniqueTag('quote');
    const phone = uniquePhone();

    await submitQuote(
      {
        categoryId: opticalCategoryId,
        frameChoice: 'catalog',
        offeringId: offering.id,
        frameProductColorId: color.id,
        lensModality: 'monofocal',
        treatments: ['antirreflejo', 'proteccion-uv'],
        additionalOptions: ['alto-indice'],
        hasPrescription: 'Sí',
        name: `Cliente ${tag}`,
        phone,
        email: undefined,
        comuna: undefined,
        message: undefined,
        consent: true,
        website: '',
      },
      null
    );

    const request = await prisma.request.findFirstOrThrow({ where: { phone, type: 'QUOTE' } });
    requestIds.push(request.id);
    const details = request.details as Record<string, unknown>;
    expect(details.offeringId).toBe(offering.id);
    expect(details.frameProductColorId).toBe(color.id);
    expect(details.frameProductColorName).toBe(color.name);
    expect(details.additionalOptionLabels).toEqual(['Cristales de alto índice']);
    expect(details.priceFromSnapshot).toBe(19990);
  });

  it('10.7 — un offeringId que pertenece a otra categoría es rechazado (nunca persiste)', async () => {
    const { offering } = await makeOpticalOffering();
    const sunCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-de-sol' } });
    const tag = uniqueTag('quote');
    const phone = uniquePhone();

    await expect(
      submitQuote(
        {
          categoryId: sunCategory.id, // reclama la categoría equivocada para esta oferta
          frameChoice: 'catalog',
          offeringId: offering.id,
          lensModality: 'sin-graduacion',
          treatments: [],
          additionalOptions: [],
          name: `Cliente ${tag}`,
          phone,
          email: undefined,
          comuna: undefined,
          message: undefined,
          consent: true,
          website: '',
        },
        null
      )
    ).rejects.toThrow();

    const request = await prisma.request.findFirst({ where: { phone, type: 'QUOTE' } });
    expect(request).toBeNull();
  });

  it('10.7 — un color que no pertenece al producto resuelto es rechazado', async () => {
    const { offering } = await makeOpticalOffering();
    const { color: otherProductColor } = await makeOpticalOffering();
    const tag = uniqueTag('quote');
    const phone = uniquePhone();

    await expect(
      submitQuote(
        {
          categoryId: opticalCategoryId,
          frameChoice: 'catalog',
          offeringId: offering.id,
          frameProductColorId: otherProductColor.id, // pertenece a OTRO producto
          lensModality: 'monofocal',
          treatments: [],
          additionalOptions: [],
          hasPrescription: 'Sí',
          name: `Cliente ${tag}`,
          phone,
          email: undefined,
          comuna: undefined,
          message: undefined,
          consent: true,
          website: '',
        },
        null
      )
    ).rejects.toThrow();

    const request = await prisma.request.findFirst({ where: { phone, type: 'QUOTE' } });
    expect(request).toBeNull();
  });

  it('10.8 — un tratamiento fuera de la allowlist de la categoría nunca se persiste ni se envía (rechazado antes de guardar)', async () => {
    const { offering, color } = await makeOpticalOffering();
    const tag = uniqueTag('quote');
    const phone = uniquePhone();

    await expect(
      submitQuote(
        {
          categoryId: opticalCategoryId,
          frameChoice: 'catalog',
          offeringId: offering.id,
          frameProductColorId: color.id,
          lensModality: 'monofocal',
          treatments: ['polarizado'], // exclusivo de Lentes de sol
          additionalOptions: [],
          hasPrescription: 'Sí',
          name: `Cliente ${tag}`,
          phone,
          email: undefined,
          comuna: undefined,
          message: undefined,
          consent: true,
          website: '',
        },
        null
      )
    ).rejects.toThrow();

    const request = await prisma.request.findFirst({ where: { phone, type: 'QUOTE' } });
    expect(request).toBeNull();
  });

  it('10.9 — la ruta de asesoría omite el paso de color/oferta (sin offeringId ni color, igual persiste)', async () => {
    const tag = uniqueTag('quote');
    const phone = uniquePhone();

    await submitQuote(
      {
        categoryId: opticalCategoryId,
        frameChoice: 'advice',
        lensModality: 'progresivo',
        treatments: [],
        additionalOptions: [],
        hasPrescription: 'Sí',
        name: `Cliente ${tag}`,
        phone,
        email: undefined,
        comuna: undefined,
        message: undefined,
        consent: true,
        website: '',
      },
      null
    );

    const request = await prisma.request.findFirstOrThrow({ where: { phone, type: 'QUOTE' } });
    requestIds.push(request.id);
    const details = request.details as Record<string, unknown>;
    expect(details.offeringId).toBeNull();
    expect(details.frameProductColorId).toBeNull();
  });
});
