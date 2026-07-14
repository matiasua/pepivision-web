// Covers Fase 9 integration points 12-14 (+ EmailLog verification via
// Mailpit, point 17): cotización sin receta, cotización con receta,
// RequestAttachment, correo capturado en Mailpit real.
import { afterAll, describe, expect, it } from 'vitest';
import { submitQuote } from '@/modules/requests/service';
import {
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

  afterAll(async () => {
    await prisma.requestAttachment.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.emailLog.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.request.deleteMany({ where: { id: { in: requestIds } } });
    await deleteMailpitMessages(mailpitIds);
  });

  function uniquePhone() {
    return `+56 9 ${Math.floor(10000000 + Math.random() * 89999999)}`;
  }

  it('creates a quote request without a prescription, logs the customer email in Mailpit', async () => {
    const tag = uniqueTag('quote');
    const email = `${tag}@integration.test.pepivision360.invalid`;
    const phone = uniquePhone();

    const result = await submitQuote(
      {
        frameChoice: 'advice',
        glassType: 'Monofocal',
        treatments: ['ar'],
        hasPrescription: 'No',
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
    expect(request.hasPrescription).toBe(false);

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
        frameChoice: 'advice',
        glassType: 'Bifocal',
        treatments: [],
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

  it('rejects a prescription file whose content does not match its declared type (never trusts declared MIME alone)', async () => {
    const tag = uniqueTag('quote');
    const phone = uniquePhone();

    await expect(
      submitQuote(
        {
          frameChoice: 'advice',
          glassType: 'Monofocal',
          treatments: [],
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
        frameChoice: 'advice',
        glassType: 'Monofocal',
        treatments: [],
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
});
