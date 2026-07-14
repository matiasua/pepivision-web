import { afterEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@/lib/errors';
import type { QuoteRequestInput } from '@/modules/requests/schemas';

const createRequest = vi.fn();
const findProductById = vi.fn();
const findActiveComunaByName = vi.fn();

vi.mock('@/modules/requests/repository', () => ({
  createRequest: (...args: unknown[]) => createRequest(...args),
  findProductById: (...args: unknown[]) => findProductById(...args),
  findActiveComunaByName: (...args: unknown[]) => findActiveComunaByName(...args),
}));

const uploadPrivateObject = vi.fn();
const deletePrivateObject = vi.fn();

vi.mock('@/modules/storage/private-service', () => ({
  buildAttachmentStorageKey: (extension: string) => `prescriptions/fixed-key.${extension}`,
  uploadPrivateObject: (...args: unknown[]) => uploadPrivateObject(...args),
  deletePrivateObject: (...args: unknown[]) => deletePrivateObject(...args),
}));

const verifyAttachmentContent = vi.fn();

vi.mock('@/lib/attachment-processing', () => ({
  sanitizeAttachmentFileName: (name: string) => name,
  verifyAttachmentContent: (...args: unknown[]) => verifyAttachmentContent(...args),
}));

vi.mock('@/modules/business-settings/service', () => ({
  getEffectiveBusinessSettings: async () => ({
    requestRetentionMonths: 12,
    notificationEmail: 'negocio@pepivision360.cl',
    phoneDisplay: '+56 9 3699 2313',
    email: 'negocio@pepivision360.cl',
    instagramHandle: 'pepivision360',
    hoursText: 'Lunes a sábado de 10:00 a 18:00 hrs',
    locationText: 'Quilicura, Región Metropolitana',
  }),
}));

const sendAndLog = vi.fn();

vi.mock('@/modules/notifications/service', () => ({
  sendAndLog: (...args: unknown[]) => sendAndLog(...args),
}));

// Imported after the mocks above so submitQuote picks up the mocked modules.
const { submitQuote } = await import('@/modules/requests/service');

function baseInput(overrides: Partial<QuoteRequestInput> = {}): QuoteRequestInput {
  return {
    frameChoice: 'advice',
    glassType: 'Monofocal',
    treatments: [],
    hasPrescription: 'Sí',
    name: 'Ana Pérez',
    phone: '+56911111111',
    email: 'ana@example.cl',
    comuna: 'Ñuñoa',
    message: null,
    consent: true,
    website: '',
    ...overrides,
  } as QuoteRequestInput;
}

function fakeFile(overrides: Partial<{ buffer: Buffer; contentType: string; size: number; originalFileName: string }> = {}) {
  return {
    buffer: Buffer.from('contenido'),
    contentType: 'application/pdf',
    size: 1024,
    originalFileName: 'receta.pdf',
    ...overrides,
  };
}

describe('modules/requests/service — submitQuote (prescription attachment)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uploads to the private bucket and persists the attachment together with the request', async () => {
    verifyAttachmentContent.mockResolvedValue(true);
    uploadPrivateObject.mockResolvedValue(undefined);
    createRequest.mockResolvedValue({ id: 'req_1' });

    await submitQuote(baseInput(), fakeFile());

    expect(uploadPrivateObject).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'prescriptions/fixed-key.pdf', contentType: 'application/pdf' })
    );
    expect(createRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        attachment: expect.objectContaining({
          storageKey: 'prescriptions/fixed-key.pdf',
          mimeType: 'application/pdf',
          originalFileName: 'receta.pdf',
          sizeBytes: 1024,
        }),
      })
    );
    expect(deletePrivateObject).not.toHaveBeenCalled();
  });

  it('accepts JPG, PNG and WEBP prescriptions, not just PDF', async () => {
    verifyAttachmentContent.mockResolvedValue(true);
    uploadPrivateObject.mockResolvedValue(undefined);
    createRequest.mockResolvedValue({ id: 'req_2' });

    for (const contentType of ['image/jpeg', 'image/png', 'image/webp']) {
      await submitQuote(baseInput(), fakeFile({ contentType, originalFileName: 'receta.jpg' }));
    }

    expect(createRequest).toHaveBeenCalledTimes(3);
    expect(uploadPrivateObject).toHaveBeenCalledTimes(3);
  });

  it('rejects a disallowed MIME type before touching storage', async () => {
    await expect(submitQuote(baseInput(), fakeFile({ contentType: 'image/svg+xml' }))).rejects.toThrow(ValidationError);

    expect(uploadPrivateObject).not.toHaveBeenCalled();
    expect(createRequest).not.toHaveBeenCalled();
  });

  it('rejects a file over the size limit before touching storage', async () => {
    await expect(
      submitQuote(baseInput(), fakeFile({ size: 10 * 1024 * 1024 + 1 }))
    ).rejects.toThrow(ValidationError);

    expect(uploadPrivateObject).not.toHaveBeenCalled();
    expect(createRequest).not.toHaveBeenCalled();
  });

  it('rejects a corrupt file (content does not match its declared MIME type)', async () => {
    verifyAttachmentContent.mockResolvedValue(false);

    await expect(submitQuote(baseInput(), fakeFile())).rejects.toThrow(ValidationError);

    expect(uploadPrivateObject).not.toHaveBeenCalled();
    expect(createRequest).not.toHaveBeenCalled();
  });

  it('rolls back the uploaded object when persisting the request fails', async () => {
    verifyAttachmentContent.mockResolvedValue(true);
    uploadPrivateObject.mockResolvedValue(undefined);
    deletePrivateObject.mockResolvedValue(undefined);
    createRequest.mockRejectedValue(new Error('db down'));

    await expect(submitQuote(baseInput(), fakeFile())).rejects.toThrow(ValidationError);

    expect(deletePrivateObject).toHaveBeenCalledWith('prescriptions/fixed-key.pdf');
  });

  it('does not touch the private bucket when no file was attached, even if hasPrescription is "Sí"', async () => {
    createRequest.mockResolvedValue({ id: 'req_3' });

    await submitQuote(baseInput({ hasPrescription: 'Sí' }), null);

    expect(uploadPrivateObject).not.toHaveBeenCalled();
    expect(createRequest).toHaveBeenCalledWith(expect.objectContaining({ attachment: undefined, hasPrescription: true }));
  });

  it('sends the business notification with hasPrescriptionAttachment=true only when an attachment was actually persisted', async () => {
    verifyAttachmentContent.mockResolvedValue(true);
    uploadPrivateObject.mockResolvedValue(undefined);
    createRequest.mockResolvedValue({ id: 'req_4' });

    await submitQuote(baseInput(), fakeFile());

    const businessCall = sendAndLog.mock.calls.find(([arg]) => arg.kind === 'BUSINESS_NOTIFICATION');
    expect(businessCall?.[0].text).toContain('receta adjunta disponible de forma segura en el panel de administración');
  });

  it('sends both the customer confirmation and the business notification with a non-empty HTML part alongside text', async () => {
    verifyAttachmentContent.mockResolvedValue(true);
    uploadPrivateObject.mockResolvedValue(undefined);
    createRequest.mockResolvedValue({ id: 'req_5' });

    await submitQuote(baseInput(), fakeFile());

    expect(sendAndLog).toHaveBeenCalledTimes(2);
    for (const [call] of sendAndLog.mock.calls) {
      expect(typeof call.html).toBe('string');
      expect(call.html.length).toBeGreaterThan(0);
      expect(call.html.toLowerCase()).toContain('<!doctype html>');
      expect(typeof call.text).toBe('string');
      expect(call.text.length).toBeGreaterThan(0);
    }
  });
});
