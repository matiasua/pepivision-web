import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildDkimConfig } from '@/modules/notifications/client';

const sendMail = vi.fn();
vi.mock('@/modules/notifications/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/notifications/client')>();
  return { ...actual, mailTransport: { sendMail: (...args: unknown[]) => sendMail(...args) } };
});

const emailLogCreate = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: { emailLog: { create: (...args: unknown[]) => emailLogCreate(...args) } },
}));

const { sendAndLog } = await import('@/modules/notifications/service');

describe('modules/notifications/client — buildDkimConfig', () => {
  it('returns undefined when any of the three pieces is missing', () => {
    expect(buildDkimConfig('', '', '')).toBeUndefined();
    expect(buildDkimConfig('example.cl', '', 'key')).toBeUndefined();
    expect(buildDkimConfig('example.cl', 'selector', '')).toBeUndefined();
  });

  it('returns a config object only when all three are present', () => {
    expect(buildDkimConfig('example.cl', 'selector1', '-----BEGIN PRIVATE KEY-----')).toEqual({
      domainName: 'example.cl',
      keySelector: 'selector1',
      privateKey: '-----BEGIN PRIVATE KEY-----',
    });
  });
});

describe('modules/notifications/service — sendAndLog (deliverability/anti-spam posture)', () => {
  afterEach(() => vi.clearAllMocks());

  it('sends with a display name (never a bare address) and the standard anti-auto-reply headers', async () => {
    sendMail.mockResolvedValue({ messageId: 'msg_1' });

    await sendAndLog({ kind: 'CUSTOMER_CONFIRMATION', to: 'ana@example.cl', subject: 'Asunto', text: 'texto', html: '<p>html</p>' });

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.objectContaining({ name: 'Pepi Visión 360' }),
        headers: expect.objectContaining({
          'Auto-Submitted': 'auto-generated',
          'X-Auto-Response-Suppress': 'All',
        }),
      })
    );
  });

  it('sets Reply-To to the business contact address for a customer-facing email', async () => {
    sendMail.mockResolvedValue({ messageId: 'msg_2' });

    await sendAndLog({
      kind: 'CUSTOMER_CONFIRMATION',
      to: 'ana@example.cl',
      replyTo: 'contacto@pepivision360.cl',
      subject: 'Asunto',
      text: 'texto',
      html: '<p>html</p>',
    });

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ replyTo: 'contacto@pepivision360.cl' }));
  });

  it('sets Reply-To to the customer address for a business-facing email', async () => {
    sendMail.mockResolvedValue({ messageId: 'msg_3' });

    await sendAndLog({
      kind: 'BUSINESS_NOTIFICATION',
      to: 'contacto@pepivision360.cl',
      replyTo: 'ana@example.cl',
      subject: 'Asunto',
      text: 'texto',
      html: '<p>html</p>',
    });

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ replyTo: 'ana@example.cl' }));
  });

  it('omits Reply-To entirely when none was given, rather than falling back to the no-reply sender', async () => {
    sendMail.mockResolvedValue({ messageId: 'msg_4' });

    await sendAndLog({ kind: 'BUSINESS_NOTIFICATION', to: 'contacto@pepivision360.cl', subject: 'Asunto', text: 'texto', html: '<p>html</p>' });

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ replyTo: undefined }));
  });

  it('logs SENT with the providerMessageId on success', async () => {
    sendMail.mockResolvedValue({ messageId: 'msg_5' });

    await sendAndLog({ kind: 'CUSTOMER_CONFIRMATION', to: 'ana@example.cl', subject: 'Asunto', text: 'texto', html: '<p>html</p>' });

    expect(emailLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SENT', providerMessageId: 'msg_5' }) })
    );
  });

  it('logs FAILED (and never throws) when sending fails', async () => {
    sendMail.mockRejectedValue(new Error('SMTP down'));

    await expect(
      sendAndLog({ kind: 'CUSTOMER_CONFIRMATION', to: 'ana@example.cl', subject: 'Asunto', text: 'texto', html: '<p>html</p>' })
    ).resolves.toBeUndefined();

    expect(emailLogCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }));
  });
});
