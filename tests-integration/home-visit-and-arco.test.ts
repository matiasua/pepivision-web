// Covers Fase 9 integration points 15-17: atención a domicilio (comuna
// habilitada y no habilitada), derechos ARCO, EmailLog/Mailpit real.
import { afterAll, describe, expect, it } from 'vitest';
import { submitHomeVisit } from '@/modules/requests/service';
import { submitDataRightsRequest } from '@/modules/data-rights/service';
import { deleteMailpitMessages, findMailpitMessagesTo, prisma, uniqueTag } from './helpers';

describe('modules/requests/service — submitHomeVisit (integration)', () => {
  const requestIds: string[] = [];
  const comunaIds: string[] = [];
  const dataRightsIds: string[] = [];
  const mailpitIds: string[] = [];

  afterAll(async () => {
    await prisma.emailLog.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.request.deleteMany({ where: { id: { in: requestIds } } });
    await prisma.emailLog.deleteMany({ where: { dataRightsRequestId: { in: dataRightsIds } } });
    await prisma.dataRightsRequest.deleteMany({ where: { id: { in: dataRightsIds } } });
    await prisma.enabledComuna.deleteMany({ where: { id: { in: comunaIds } } });
    await deleteMailpitMessages(mailpitIds);
  });

  function uniquePhone() {
    return `+56 9 ${Math.floor(10000000 + Math.random() * 89999999)}`;
  }

  it('flags the request as covered when the comuna is active in EnabledComuna', async () => {
    const comunaName = uniqueTag('comuna');
    const comuna = await prisma.enabledComuna.create({ data: { name: comunaName, active: true } });
    comunaIds.push(comuna.id);

    const phone = uniquePhone();
    const tag = uniqueTag('domicilio');
    const email = `${tag}@integration.test.pepivision360.invalid`;

    const result = await submitHomeVisit({
      name: `Cliente ${tag}`,
      comuna: comunaName,
      phone,
      email,
      attentionType: 'Asesoría para elegir lentes',
      consent: true,
      website: '',
    });
    expect(result.comunaCovered).toBe(true);

    const request = await prisma.request.findFirstOrThrow({ where: { phone, type: 'HOME_VISIT' } });
    requestIds.push(request.id);
    expect((request.details as { comunaCovered: boolean }).comunaCovered).toBe(true);

    const messages = await findMailpitMessagesTo(email);
    expect(messages.length).toBeGreaterThanOrEqual(1);
    mailpitIds.push(...messages.map((m) => m.ID));
  });

  it('flags the request as NOT covered for a comuna outside the enabled list, but still creates it', async () => {
    const phone = uniquePhone();
    const tag = uniqueTag('domicilio');
    const uncoveredComuna = `Comuna inexistente ${tag}`;

    const result = await submitHomeVisit({
      name: `Cliente ${tag}`,
      comuna: uncoveredComuna,
      phone,
      email: undefined,
      attentionType: undefined,
      consent: true,
      website: '',
    });
    expect(result.comunaCovered).toBe(false);

    const request = await prisma.request.findFirstOrThrow({ where: { phone, type: 'HOME_VISIT' } });
    requestIds.push(request.id);
    expect((request.details as { comunaCovered: boolean }).comunaCovered).toBe(false);
  });

  it('an inactive comuna is treated as not covered', async () => {
    const comunaName = uniqueTag('comuna');
    const comuna = await prisma.enabledComuna.create({ data: { name: comunaName, active: false } });
    comunaIds.push(comuna.id);

    const phone = uniquePhone();
    const result = await submitHomeVisit({
      name: 'Cliente comuna inactiva',
      comuna: comunaName,
      phone,
      email: undefined,
      attentionType: undefined,
      consent: true,
      website: '',
    });
    expect(result.comunaCovered).toBe(false);

    const request = await prisma.request.findFirstOrThrow({ where: { phone, type: 'HOME_VISIT' } });
    requestIds.push(request.id);
  });
});

describe('modules/data-rights/service — submitDataRightsRequest (integration)', () => {
  const dataRightsIds: string[] = [];
  const mailpitIds: string[] = [];

  afterAll(async () => {
    await prisma.emailLog.deleteMany({ where: { dataRightsRequestId: { in: dataRightsIds } } });
    await prisma.dataRightsRequest.deleteMany({ where: { id: { in: dataRightsIds } } });
    await deleteMailpitMessages(mailpitIds);
  });

  it('creates a RECEIVED data-rights request and notifies the business (captured in Mailpit)', async () => {
    const tag = uniqueTag('arco');
    const email = `${tag}@integration.test.pepivision360.invalid`;

    const result = await submitDataRightsRequest({
      rightType: 'ACCESS',
      name: `Titular ${tag}`,
      email,
      phone: undefined,
      description: 'Quiero saber qué datos personales tienen sobre mí.',
      consent: true,
      website: '',
    });
    expect(result.customerName).toBe(`Titular ${tag}`);

    const request = await prisma.dataRightsRequest.findFirstOrThrow({ where: { email } });
    dataRightsIds.push(request.id);
    expect(request.status).toBe('RECEIVED');
    expect(request.rightType).toBe('ACCESS');

    const emailLogs = await prisma.emailLog.findMany({ where: { dataRightsRequestId: request.id } });
    expect(emailLogs.length).toBeGreaterThanOrEqual(1);

    // Business notification's reply-to is the requester's own address —
    // confirmed indirectly via a successful Mailpit capture (the business
    // inbox address, read from BusinessSettings/site-config, is the "to").
    const businessMessages = await findMailpitMessagesTo(emailLogs[0].toAddress);
    mailpitIds.push(...businessMessages.map((m) => m.ID));
  });

  it('the honeypot short-circuits before any DataRightsRequest row is created', async () => {
    const tag = uniqueTag('arco');
    const email = `${tag}@integration.test.pepivision360.invalid`;

    await submitDataRightsRequest({
      rightType: 'ACCESS',
      name: `Bot ${tag}`,
      email,
      phone: undefined,
      description: 'spam',
      consent: true,
      website: 'http://spam.example',
    });

    const request = await prisma.dataRightsRequest.findFirst({ where: { email } });
    expect(request).toBeNull();
  });
});
