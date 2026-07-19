// Covers Fase 9 integration points 12-14 (+ EmailLog verification via
// Mailpit, point 17) y Fase 10 (cotizador configurable, tareas 10.6-10.9):
// cotización sin receta, cotización con receta, RequestAttachment, correo
// capturado en Mailpit real, re-resolución server-side de categoría/
// oferta/producto/color.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AdminRole, Gender, Prisma, ProductMaterial, ProductShape } from '@prisma/client';
import { submitQuote } from '@/modules/requests/service';
import { createProduct } from '@/modules/catalog/admin-service';
import { createOffering } from '@/modules/catalog/offering-service';
import { parseRequestDetails, REQUEST_DETAILS_V2 } from '@/modules/requests/request-snapshot';
import { listRequests } from '@/modules/requests/admin-service';
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

  // Fase 11 — snapshot histórico definitivo (11.1, 11.3).
  describe('Fase 11 — snapshot histórico versionado e inmutable', () => {
    it('11.1 — toda solicitud nueva queda tagueada con detailsVersion: 2', async () => {
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
      expect((request.details as Record<string, unknown>).detailsVersion).toBe(REQUEST_DETAILS_V2);

      const normalized = parseRequestDetails(request.details);
      expect(normalized.version).toBe(2);
      expect(normalized.frameProductColorName).toBe(color.name);
    });

    it('11.3 — el snapshot no cambia si luego se edita el nombre de Category, el nombre de Product, el color o el precio de la oferta', async () => {
      const { offering, product, color } = await makeOpticalOffering();
      const tag = uniqueTag('quote');
      const phone = uniquePhone();

      await submitQuote(
        {
          categoryId: opticalCategoryId,
          frameChoice: 'catalog',
          offeringId: offering.id,
          frameProductColorId: color.id,
          lensModality: 'monofocal',
          treatments: ['antirreflejo'],
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
      const originalDetails = parseRequestDetails(request.details);

      // Edita las entidades vivas después de crear la solicitud — nunca a
      // través de un UPDATE directo sobre `requests`, solo sobre el
      // catálogo del que se tomó el snapshot.
      const originalCategory = await prisma.category.findUniqueOrThrow({ where: { id: opticalCategoryId } });
      const originalProductName = product.name;
      const originalColorName = color.name;
      const originalPrice = offering.priceFromClp;

      try {
        await prisma.category.update({ where: { id: opticalCategoryId }, data: { name: 'Nombre editado post-solicitud' } });
        await prisma.product.update({ where: { id: product.id }, data: { name: 'Producto editado post-solicitud' } });
        await prisma.productColor.update({ where: { id: color.id }, data: { name: 'Color editado post-solicitud' } });
        await prisma.productOffering.update({ where: { id: offering.id }, data: { priceFromClp: 999999 } });

        const reread = await prisma.request.findUniqueOrThrow({ where: { id: request.id } });
        const rereadDetails = parseRequestDetails(reread.details);

        expect(rereadDetails.categoryName).toBe(originalDetails.categoryName);
        expect(rereadDetails.categoryName).not.toBe('Nombre editado post-solicitud');
        expect(rereadDetails.frameProductName).toContain(originalProductName);
        expect(rereadDetails.frameProductColorName).toBe(originalColorName);
        expect(rereadDetails.priceFromSnapshot).toBe(originalPrice);
      } finally {
        // Restaura las entidades exactamente a su estado original — este
        // test nunca deja el catálogo real/de fixtures mutado al salir.
        await prisma.category.update({ where: { id: opticalCategoryId }, data: { name: originalCategory.name } });
        await prisma.product.update({ where: { id: product.id }, data: { name: originalProductName } });
        await prisma.productColor.update({ where: { id: color.id }, data: { name: originalColorName } });
        await prisma.productOffering.update({ where: { id: offering.id }, data: { priceFromClp: originalPrice } });
      }
    });

    it('11.3 — una oferta ocultada/desactivada después de crear la solicitud no impide leer el snapshot ya persistido', async () => {
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

      await prisma.productOffering.update({ where: { id: offering.id }, data: { active: false, visible: false } });

      const reread = await prisma.request.findUniqueOrThrow({ where: { id: request.id } });
      const normalized = parseRequestDetails(reread.details);
      expect(normalized.version).toBe(2);
      expect(normalized.frameProductColorName).toBe(color.name);
    });

    it('11.3 — desactivar/ocultar la Category después de crear la solicitud no impide leer el snapshot ya persistido', async () => {
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

      // La categoría canónica real se comparte con el resto de la suite —
      // se desactiva/oculta y se restaura de inmediato, nunca se deja así.
      try {
        await prisma.category.update({ where: { id: opticalCategoryId }, data: { active: false, visible: false } });
        const reread = await prisma.request.findUniqueOrThrow({ where: { id: request.id } });
        const normalized = parseRequestDetails(reread.details);
        expect(normalized.version).toBe(2);
        expect(normalized.categoryName).toBe('Lentes ópticos');
      } finally {
        await prisma.category.update({ where: { id: opticalCategoryId }, data: { active: true, visible: true } });
      }
    });

    it('11.3 — desactivar/ocultar el Product después de crear la solicitud no impide leer el snapshot ya persistido', async () => {
      const { offering, product, color } = await makeOpticalOffering();
      const tag = uniqueTag('quote');
      const phone = uniquePhone();

      await submitQuote(
        {
          categoryId: opticalCategoryId,
          frameChoice: 'catalog',
          offeringId: offering.id,
          frameProductColorId: color.id,
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
      );
      const request = await prisma.request.findFirstOrThrow({ where: { phone, type: 'QUOTE' } });
      requestIds.push(request.id);

      await prisma.product.update({ where: { id: product.id }, data: { visible: false, available: false } });

      const reread = await prisma.request.findUniqueOrThrow({ where: { id: request.id } });
      const normalized = parseRequestDetails(reread.details);
      expect(normalized.version).toBe(2);
      expect(normalized.frameProductName).toContain(product.name);
    });

    it('11.3 — modificar Category.capabilities.quoteOptions después de crear la solicitud no afecta el snapshot ya persistido', async () => {
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
          treatments: ['antirreflejo'],
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

      const originalCategory = await prisma.category.findUniqueOrThrow({ where: { id: opticalCategoryId } });
      const originalCapabilities = originalCategory.capabilities as Record<string, unknown>;
      try {
        // Reduce drásticamente la allowlist efectiva de la categoría — si el
        // snapshot dependiera del catálogo vivo, "Antirreflejo" ya no
        // debería poder mostrarse para esta categoría.
        await prisma.category.update({
          where: { id: opticalCategoryId },
          data: {
            capabilities: {
              ...originalCapabilities,
              quoteOptions: { version: 1, lensTypes: ['monofocal'], treatments: [], additionalOptions: [] },
            },
          },
        });

        const reread = await prisma.request.findUniqueOrThrow({ where: { id: request.id } });
        const normalized = parseRequestDetails(reread.details);
        expect(normalized.treatmentLabels).toEqual(['Antirreflejo']);
      } finally {
        await prisma.category.update({
          where: { id: opticalCategoryId },
          data: { capabilities: originalCapabilities as Prisma.InputJsonValue },
        });
      }
    });

    it('11.3 — modificar ProductOffering.configuration (lensOptionExclusions) después de crear la solicitud no afecta el snapshot ya persistido', async () => {
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
          treatments: ['antirreflejo'],
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

      // Configuration de la oferta ahora excluiría exactamente lo que ya
      // se cotizó — el snapshot no debe verse afectado retroactivamente.
      await prisma.productOffering.update({
        where: { id: offering.id },
        data: {
          configuration: {
            version: 1,
            lensOptionExclusions: { treatments: ['antirreflejo'], additionalOptions: ['alto-indice'] },
          },
        },
      });

      const reread = await prisma.request.findUniqueOrThrow({ where: { id: request.id } });
      const normalized = parseRequestDetails(reread.details);
      expect(normalized.treatmentLabels).toEqual(['Antirreflejo']);
      expect(normalized.additionalOptionLabels).toEqual(['Cristales de alto índice']);
    });

    it('11.3 — eliminar por completo el Product/ProductOffering/ProductColor sintéticos después de crear la solicitud no impide leer el snapshot (Request no tiene FK hacia el catálogo)', async () => {
      const { offering, product, color } = await makeOpticalOffering();
      const tag = uniqueTag('quote');
      const phone = uniquePhone();

      await submitQuote(
        {
          categoryId: opticalCategoryId,
          frameChoice: 'catalog',
          offeringId: offering.id,
          frameProductColorId: color.id,
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
      );
      const request = await prisma.request.findFirstOrThrow({ where: { phone, type: 'QUOTE' } });
      requestIds.push(request.id);

      const capturedProductName = product.name;
      const capturedColorName = color.name;
      const capturedOfferingId = offering.id;

      // Product.id → ProductOffering.productId tiene onDelete: Cascade —
      // borrar el producto se lleva la oferta y sus colores con él. Request
      // no tiene ninguna FK hacia Category/Product/ProductOffering/
      // ProductColor — su snapshot es un JSON autocontenido.
      await prisma.product.delete({ where: { id: product.id } });
      productIds.splice(productIds.indexOf(product.id), 1);
      offeringIds.splice(offeringIds.indexOf(offering.id), 1);

      const reread = await prisma.request.findUniqueOrThrow({ where: { id: request.id } });
      const normalized = parseRequestDetails(reread.details);
      expect(normalized.version).toBe(2);
      expect(normalized.frameProductName).toContain(capturedProductName);
      expect(normalized.frameProductColorName).toBe(capturedColorName);
      expect((reread.details as Record<string, unknown>).offeringId).toBe(capturedOfferingId);
    });

    it('11.3 — una fila con details: null (Request.details es Json? nullable) se lee de forma segura, nunca lanza', async () => {
      const now = new Date();
      const nullDetailsRow = await prisma.request.create({
        data: {
          type: 'QUOTE',
          name: 'Cliente Details Nulo',
          phone: uniquePhone(),
          details: Prisma.JsonNull,
          consentAcceptedAt: now,
          retentionExpiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        },
      });
      requestIds.push(nullDetailsRow.id);

      const normalized = parseRequestDetails(nullDetailsRow.details);
      expect(normalized.version).toBe('unknown');
      expect(normalized.categoryName).toBeNull();
    });

    it('11.2 — filtrar por "Todas" (sin filtro de categoría) sigue mostrando solicitudes V1, intermedias y V2 juntas — nunca oculta legacy silenciosamente', async () => {
      const legacyPhone = uniquePhone();
      const now = new Date();
      const legacyRow = await prisma.request.create({
        data: {
          type: 'QUOTE',
          name: 'Cliente Legado Para Filtro',
          phone: legacyPhone,
          details: { frameChoice: 'advice', glassType: 'Multifocal' },
          consentAcceptedAt: now,
          retentionExpiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        },
      });
      requestIds.push(legacyRow.id);

      const all = await listRequests({});
      expect(all.some((r) => r.id === legacyRow.id)).toBe(true);
    });

    it('11.3 — una fila V1 sintética (sin detailsVersion) sigue siendo legible, y "Multifocal" histórico se conserva sin reescritura', async () => {
      const settings = { requestRetentionMonths: 12 };
      const now = new Date();
      const legacyRow = await prisma.request.create({
        data: {
          type: 'QUOTE',
          name: 'Cliente Legado Sintético',
          phone: uniquePhone(),
          details: {
            frameChoice: 'advice',
            frameProductName: null,
            glassType: 'Multifocal',
            treatments: ['ar'],
            treatmentLabels: ['Antirreflejo'],
            prescriptionAnswer: 'Sí',
          },
          consentAcceptedAt: now,
          retentionExpiresAt: new Date(now.getTime() + settings.requestRetentionMonths * 30 * 24 * 60 * 60 * 1000),
        },
      });
      requestIds.push(legacyRow.id);

      const normalized = parseRequestDetails(legacyRow.details);
      expect(normalized.version).toBe(1);
      expect(normalized.glassType).toBe('Multifocal');
      expect(normalized.categoryName).toBeNull();

      // Confirma explícitamente que ningún código de esta fase reescribió
      // la fila al leerla.
      const rereadRow = await prisma.request.findUniqueOrThrow({ where: { id: legacyRow.id } });
      expect((rereadRow.details as Record<string, unknown>).glassType).toBe('Multifocal');
      expect((rereadRow.details as Record<string, unknown>).detailsVersion).toBeUndefined();
    });
  });

  // Corrección de presentación posterior a la Fase 11: "Receta óptica" no
  // debe aparecer en absoluto (ni como "—") cuando la modalidad no la
  // requiere — verificado contra el correo real capturado en Mailpit.
  describe('Corrección de presentación — omitir "Receta óptica" cuando no aplica', () => {
    it('solar sin graduación: el correo real (HTML y texto) no menciona "Receta óptica" en ningún formato', async () => {
      const sunCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-de-sol' } });
      const tag = uniqueTag('quote');
      const email = `${tag}@integration.test.pepivision360.invalid`;
      const phone = uniquePhone();

      await submitQuote(
        {
          categoryId: sunCategory.id,
          frameChoice: 'advice',
          lensModality: 'sin-graduacion',
          treatments: ['uv400'],
          additionalOptions: [],
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

      // Correo de confirmación al cliente.
      const customerMessages = await findMailpitMessagesTo(email);
      expect(customerMessages.length).toBeGreaterThanOrEqual(1);
      mailpitIds.push(...customerMessages.map((m) => m.ID));
      const customerFull = await fetch(`http://mailpit:8025/api/v1/message/${customerMessages[0].ID}`).then((r) => r.json());
      expect(customerFull.Text).not.toContain('Receta óptica');
      expect(customerFull.HTML).not.toContain('Receta óptica');
      expect(customerFull.Text).toContain('Tipo de cristal: Sin graduación');

      // Correo de notificación al negocio — dirección distinta a la del
      // cliente; se busca por asunto único (nombre del cliente de prueba)
      // en vez de por destinatario. Este es el correo donde se detectó
      // originalmente el defecto (el otro call site de submitQuote seguía
      // usando `prescriptionAnswer ?? '—'`).
      const businessSearch = await fetch(
        `http://mailpit:8025/api/v1/search?query=${encodeURIComponent(`subject:"Nueva cotización — Cliente ${tag}"`)}`
      ).then((r) => r.json());
      expect(businessSearch.messages.length).toBeGreaterThanOrEqual(1);
      mailpitIds.push(...businessSearch.messages.map((m: { ID: string }) => m.ID));
      const businessFull = await fetch(`http://mailpit:8025/api/v1/message/${businessSearch.messages[0].ID}`).then((r) =>
        r.json()
      );
      expect(businessFull.Text).not.toContain('Receta óptica');
      expect(businessFull.HTML).not.toContain('Receta óptica');
      expect(businessFull.Text).toContain('Tipo de cristal: Sin graduación');
    });

    it('solar graduado (Solar progresivo): el correo real sí incluye "Receta óptica" con la respuesta real', async () => {
      const sunCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-de-sol' } });
      const tag = uniqueTag('quote');
      const email = `${tag}@integration.test.pepivision360.invalid`;
      const phone = uniquePhone();

      await submitQuote(
        {
          categoryId: sunCategory.id,
          frameChoice: 'advice',
          lensModality: 'solar-progresivo',
          treatments: ['uv400'],
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

      const customerMessages = await findMailpitMessagesTo(email);
      expect(customerMessages.length).toBeGreaterThanOrEqual(1);
      mailpitIds.push(...customerMessages.map((m) => m.ID));
      const customerFull = await fetch(`http://mailpit:8025/api/v1/message/${customerMessages[0].ID}`).then((r) => r.json());
      expect(customerFull.Text).toContain('Receta óptica: Sí');
      expect(customerFull.HTML).toContain('Receta óptica');

      const businessSearch = await fetch(
        `http://mailpit:8025/api/v1/search?query=${encodeURIComponent(`subject:"Nueva cotización — Cliente ${tag}"`)}`
      ).then((r) => r.json());
      expect(businessSearch.messages.length).toBeGreaterThanOrEqual(1);
      mailpitIds.push(...businessSearch.messages.map((m: { ID: string }) => m.ID));
      const businessFull = await fetch(`http://mailpit:8025/api/v1/message/${businessSearch.messages[0].ID}`).then((r) =>
        r.json()
      );
      expect(businessFull.Text).toContain('Receta óptica: Sí');
      expect(businessFull.HTML).toContain('Receta óptica');
    });
  });

  // Fase 11 (11.2, 11.4) — filtro de categoría en el inbox administrativo.
  describe('Fase 11 — filtro de categoría del inbox administrativo', () => {
    it('11.4 — filtrar por categoría reduce correctamente los resultados a las solicitudes de esa categoría', async () => {
      const { offering, color } = await makeOpticalOffering();
      const sunCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-de-sol' } });
      const opticalTag = uniqueTag('quote');
      const opticalPhone = uniquePhone();
      const sunPhone = uniquePhone();

      await submitQuote(
        {
          categoryId: opticalCategoryId,
          frameChoice: 'catalog',
          offeringId: offering.id,
          frameProductColorId: color.id,
          lensModality: 'monofocal',
          treatments: [],
          additionalOptions: [],
          hasPrescription: 'Sí',
          name: `Cliente óptico ${opticalTag}`,
          phone: opticalPhone,
          email: undefined,
          comuna: undefined,
          message: undefined,
          consent: true,
          website: '',
        },
        null
      );
      const opticalRequest = await prisma.request.findFirstOrThrow({ where: { phone: opticalPhone, type: 'QUOTE' } });
      requestIds.push(opticalRequest.id);

      await submitQuote(
        {
          categoryId: sunCategory.id,
          frameChoice: 'advice',
          lensModality: 'sin-graduacion',
          treatments: [],
          additionalOptions: [],
          name: `Cliente solar ${opticalTag}`,
          phone: sunPhone,
          email: undefined,
          comuna: undefined,
          message: undefined,
          consent: true,
          website: '',
        },
        null
      );
      const sunRequest = await prisma.request.findFirstOrThrow({ where: { phone: sunPhone, type: 'QUOTE' } });
      requestIds.push(sunRequest.id);

      const opticalResults = await listRequests({ category: 'lentes-opticos' });
      expect(opticalResults.some((r) => r.id === opticalRequest.id)).toBe(true);
      expect(opticalResults.some((r) => r.id === sunRequest.id)).toBe(false);

      const sunResults = await listRequests({ category: 'lentes-de-sol' });
      expect(sunResults.some((r) => r.id === sunRequest.id)).toBe(true);
      expect(sunResults.some((r) => r.id === opticalRequest.id)).toBe(false);

      const allResults = await listRequests({});
      expect(allResults.some((r) => r.id === opticalRequest.id)).toBe(true);
      expect(allResults.some((r) => r.id === sunRequest.id)).toBe(true);
    });
  });

  // Fase 13 (redesign-extensible-catalog-v2 — emails y WhatsApp consumiendo
  // el snapshot de categoría/oferta/precio): ambos correos y el mensaje de
  // WhatsApp deben mostrar exactamente el mismo priceFromSnapshot ya
  // persistido en Request.details, nunca un recálculo. Real Postgres +
  // Mailpit, sin mocks.
  describe('Fase 13 — emails y WhatsApp consumen categoría, oferta y precio del snapshot', () => {
    it('óptica con ProductOffering y precio: ambos correos muestran "Precio referencial: Desde $X", y el snapshot persiste el mismo valor', async () => {
      const { offering, color } = await makeOpticalOffering();
      const tag = uniqueTag('quote');
      const email = `${tag}@integration.test.pepivision360.invalid`;
      const phone = uniquePhone();

      await submitQuote(
        {
          categoryId: opticalCategoryId,
          frameChoice: 'catalog',
          offeringId: offering.id,
          frameProductColorId: color.id,
          lensModality: 'monofocal',
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
        null
      );
      const request = await prisma.request.findFirstOrThrow({ where: { phone, type: 'QUOTE' } });
      requestIds.push(request.id);

      const details = request.details as Record<string, unknown>;
      expect(details.priceFromSnapshot).toBe(19990);
      expect(details.categorySlug).toBe('lentes-opticos');

      const customerMessages = await findMailpitMessagesTo(email);
      expect(customerMessages.length).toBeGreaterThanOrEqual(1);
      mailpitIds.push(...customerMessages.map((m) => m.ID));
      const customerFull = await fetch(`http://mailpit:8025/api/v1/message/${customerMessages[0].ID}`).then((r) => r.json());
      expect(customerFull.Text).toContain('Precio referencial: Desde $19.990');
      expect(customerFull.HTML).toContain('Precio referencial');
      expect(customerFull.HTML).toContain('Desde $19.990');
      expect(customerFull.HTML).toContain('Lentes ópticos');

      const businessSearch = await fetch(
        `http://mailpit:8025/api/v1/search?query=${encodeURIComponent(`subject:"Nueva cotización — Cliente ${tag}"`)}`
      ).then((r) => r.json());
      expect(businessSearch.messages.length).toBeGreaterThanOrEqual(1);
      mailpitIds.push(...businessSearch.messages.map((m: { ID: string }) => m.ID));
      const businessFull = await fetch(`http://mailpit:8025/api/v1/message/${businessSearch.messages[0].ID}`).then((r) =>
        r.json()
      );
      expect(businessFull.Text).toContain('Precio referencial: Desde $19.990');
      expect(businessFull.HTML).toContain('Precio referencial');
      expect(businessFull.HTML).toContain('Desde $19.990');
    });

    it('solar con ProductOffering y precio: ambos correos muestran el precio y la categoría Lentes de sol', async () => {
      const actor = await makeActor();
      const sunCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-de-sol' } });
      const tag = uniqueTag('prodsun');
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
          colors: [{ name: 'Carey', hex: '#8a5a2b' }],
        },
        actor
      );
      productIds.push(product.id);
      const offering = await createOffering(
        {
          productId: product.id,
          categoryId: sunCategory.id,
          title: undefined,
          commercialDescription: undefined,
          priceFromClp: 45000,
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

      const tagQ = uniqueTag('quote');
      const email = `${tagQ}@integration.test.pepivision360.invalid`;
      const phone = uniquePhone();

      await submitQuote(
        {
          categoryId: sunCategory.id,
          frameChoice: 'catalog',
          offeringId: offering.id,
          frameProductColorId: color.id,
          lensModality: 'sin-graduacion',
          treatments: ['uv400'],
          additionalOptions: [],
          name: `Cliente ${tagQ}`,
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

      const details = request.details as Record<string, unknown>;
      expect(details.priceFromSnapshot).toBe(45000);
      expect(details.categorySlug).toBe('lentes-de-sol');

      const customerMessages = await findMailpitMessagesTo(email);
      expect(customerMessages.length).toBeGreaterThanOrEqual(1);
      mailpitIds.push(...customerMessages.map((m) => m.ID));
      const customerFull = await fetch(`http://mailpit:8025/api/v1/message/${customerMessages[0].ID}`).then((r) => r.json());
      expect(customerFull.Text).toContain('Precio referencial: Desde $45.000');
      expect(customerFull.HTML).toContain('Lentes de sol');

      const businessSearch = await fetch(
        `http://mailpit:8025/api/v1/search?query=${encodeURIComponent(`subject:"Nueva cotización — Cliente ${tagQ}"`)}`
      ).then((r) => r.json());
      expect(businessSearch.messages.length).toBeGreaterThanOrEqual(1);
      mailpitIds.push(...businessSearch.messages.map((m: { ID: string }) => m.ID));
      const businessFull = await fetch(`http://mailpit:8025/api/v1/message/${businessSearch.messages[0].ID}`).then((r) =>
        r.json()
      );
      expect(businessFull.Text).toContain('Precio referencial: Desde $45.000');
    });

    it('asesoría sin ProductOffering: ningún correo muestra "Precio referencial" — nunca "$0" ni "Por cotizar" inventado', async () => {
      const tag = uniqueTag('quote');
      const email = `${tag}@integration.test.pepivision360.invalid`;
      const phone = uniquePhone();

      await submitQuote(
        {
          categoryId: opticalCategoryId,
          frameChoice: 'advice',
          lensModality: 'monofocal',
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
        null
      );
      const request = await prisma.request.findFirstOrThrow({ where: { phone, type: 'QUOTE' } });
      requestIds.push(request.id);

      const details = request.details as Record<string, unknown>;
      expect(details.priceFromSnapshot ?? null).toBeNull();

      const customerMessages = await findMailpitMessagesTo(email);
      expect(customerMessages.length).toBeGreaterThanOrEqual(1);
      mailpitIds.push(...customerMessages.map((m) => m.ID));
      const customerFull = await fetch(`http://mailpit:8025/api/v1/message/${customerMessages[0].ID}`).then((r) => r.json());
      expect(customerFull.Text).not.toContain('Precio referencial');
      expect(customerFull.HTML).not.toContain('Precio referencial');
      expect(customerFull.HTML).not.toContain('$0');
      expect(customerFull.HTML).not.toContain('Por cotizar');

      const businessSearch = await fetch(
        `http://mailpit:8025/api/v1/search?query=${encodeURIComponent(`subject:"Nueva cotización — Cliente ${tag}"`)}`
      ).then((r) => r.json());
      expect(businessSearch.messages.length).toBeGreaterThanOrEqual(1);
      mailpitIds.push(...businessSearch.messages.map((m: { ID: string }) => m.ID));
      const businessFull = await fetch(`http://mailpit:8025/api/v1/message/${businessSearch.messages[0].ID}`).then((r) =>
        r.json()
      );
      expect(businessFull.Text).not.toContain('Precio referencial');
      expect(businessFull.HTML).not.toContain('$0');
    });

    it('el WhatsApp generado contiene la misma categoría y el mismo precio que el snapshot, decodificando el parámetro del mensaje', async () => {
      const { offering, color } = await makeOpticalOffering();
      const tag = uniqueTag('quote');
      const phone = uniquePhone();

      const result = await submitQuote(
        {
          categoryId: opticalCategoryId,
          frameChoice: 'catalog',
          offeringId: offering.id,
          frameProductColorId: color.id,
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
      );
      const request = await prisma.request.findFirstOrThrow({ where: { phone, type: 'QUOTE' } });
      requestIds.push(request.id);

      const url = new URL(result.whatsappHref);
      const decoded = decodeURIComponent(url.searchParams.get('text') ?? '');
      expect(decoded).toContain('Lentes ópticos');
      expect(decoded).toContain('Desde $19.990');
      expect(decoded).toContain(`Cliente ${tag}`);
      for (const forbidden of ['lentes-opticos', offering.id, offering.productId, 'storageKey', 'http://', 'https://']) {
        expect(decoded).not.toContain(forbidden);
      }
    });

    it('el WhatsApp de una asesoría sin oferta omite el precio y nunca inventa una oferta', async () => {
      const sunCategory = await prisma.category.findUniqueOrThrow({ where: { slug: 'lentes-de-sol' } });
      const tag = uniqueTag('quote');
      const phone = uniquePhone();

      const result = await submitQuote(
        {
          categoryId: sunCategory.id,
          frameChoice: 'advice',
          lensModality: 'solar-progresivo',
          treatments: ['uv400'],
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

      const url = new URL(result.whatsappHref);
      const decoded = decodeURIComponent(url.searchParams.get('text') ?? '');
      expect(decoded).toContain('Lentes de sol');
      expect(decoded).toContain('Solar progresivo');
      expect(decoded).not.toContain('Desde $');
      expect(decoded).not.toContain('$0');
    });

    it('un adjunto de receta nunca aparece mencionado en el mensaje de WhatsApp (ni datos internos del archivo)', async () => {
      const tag = uniqueTag('quote');
      const phone = uniquePhone();
      const pngBuffer = await tinyPngBuffer();

      const result = await submitQuote(
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
        { buffer: pngBuffer, contentType: 'image/png', size: pngBuffer.length, originalFileName: 'receta.png' }
      );
      const request = await prisma.request.findFirstOrThrow({ where: { phone, type: 'QUOTE' } });
      requestIds.push(request.id);

      const url = new URL(result.whatsappHref);
      const decoded = decodeURIComponent(url.searchParams.get('text') ?? '');
      for (const forbidden of ['receta.png', 'storageKey', 'prescriptions/', 'X-Amz-Signature', 'minio', '.png']) {
        expect(decoded).not.toContain(forbidden);
      }
    });
  });
});
