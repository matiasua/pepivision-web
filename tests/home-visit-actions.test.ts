import { afterEach, describe, expect, it, vi } from 'vitest';

const isHomeVisitEnabled = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
  isHomeVisitEnabled: () => isHomeVisitEnabled(),
}));

const checkPublicFormRateLimit = vi.fn();
vi.mock('@/lib/public-form-rate-limit', () => ({
  checkPublicFormRateLimit: (...args: unknown[]) => checkPublicFormRateLimit(...args),
  PUBLIC_FORM_RATE_LIMIT_MESSAGE: 'Demasiados intentos. Intenta más tarde.',
}));

vi.mock('@/lib/request-ip', () => ({
  getClientIp: async () => '127.0.0.1',
}));

const submitHomeVisit = vi.fn();
vi.mock('@/modules/requests/service', () => ({
  submitHomeVisit: (...args: unknown[]) => submitHomeVisit(...args),
}));

// Imported after the mocks above so the action picks up the mocked modules.
const { submitHomeVisitAction } = await import('@/app/domicilio/actions');

function validInput() {
  return {
    name: 'Cliente Test',
    comuna: 'Ñuñoa',
    phone: '+56911111111',
    email: 'cliente@example.cl',
    attentionType: undefined,
    consent: true,
    website: '',
  };
}

describe('app/domicilio/actions — submitHomeVisitAction (server-side flag gating)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('rejects with a generic error and performs zero writes/side effects when the flag is disabled', async () => {
    isHomeVisitEnabled.mockReturnValue(false);

    const result = await submitHomeVisitAction(validInput());

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.formError).toBe('No pudimos procesar tu consulta. Intenta nuevamente.');
    }
    // Zero processing: not even the rate limiter or the domain function ran.
    expect(checkPublicFormRateLimit).not.toHaveBeenCalled();
    expect(submitHomeVisit).not.toHaveBeenCalled();
  });

  it('rejects a manipulated/direct call the same way, regardless of input shape, when disabled', async () => {
    isHomeVisitEnabled.mockReturnValue(false);

    const result = await submitHomeVisitAction({ garbage: true });

    expect(result.status).toBe('error');
    expect(submitHomeVisit).not.toHaveBeenCalled();
  });

  it('never reveals that the feature is disabled in the returned error message', async () => {
    isHomeVisitEnabled.mockReturnValue(false);

    const result = await submitHomeVisitAction(validInput());

    if (result.status === 'error') {
      expect(result.formError?.toLowerCase()).not.toMatch(/deshabilitad|no disponible|domicilio/);
    }
  });

  it('processes normally (rate limit, validation, submitHomeVisit) when the flag is enabled', async () => {
    isHomeVisitEnabled.mockReturnValue(true);
    checkPublicFormRateLimit.mockReturnValue(false);
    submitHomeVisit.mockResolvedValue({
      customerName: 'Cliente Test',
      whatsappHref: 'https://wa.me/123',
      comunaCovered: true,
    });

    const result = await submitHomeVisitAction(validInput());

    expect(checkPublicFormRateLimit).toHaveBeenCalledTimes(1);
    expect(submitHomeVisit).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('success');
  });

  it('still enforces rate limiting when enabled', async () => {
    isHomeVisitEnabled.mockReturnValue(true);
    checkPublicFormRateLimit.mockReturnValue(true);

    const result = await submitHomeVisitAction(validInput());

    expect(result.status).toBe('error');
    expect(submitHomeVisit).not.toHaveBeenCalled();
  });

  it('still enforces schema validation when enabled — an invalid payload never reaches submitHomeVisit', async () => {
    isHomeVisitEnabled.mockReturnValue(true);
    checkPublicFormRateLimit.mockReturnValue(false);

    const result = await submitHomeVisitAction({ ...validInput(), name: '' });

    expect(result.status).toBe('error');
    expect(submitHomeVisit).not.toHaveBeenCalled();
  });

  it('still short-circuits on the honeypot when enabled (delegated to submitHomeVisit, unchanged)', async () => {
    isHomeVisitEnabled.mockReturnValue(true);
    checkPublicFormRateLimit.mockReturnValue(false);
    submitHomeVisit.mockResolvedValue({
      customerName: 'Bot',
      whatsappHref: 'https://wa.me/123',
      comunaCovered: false,
    });

    await submitHomeVisitAction({ ...validInput(), website: 'http://spam.example' });

    // The action itself doesn't inspect the honeypot — submitHomeVisit does
    // (unchanged) — so this just confirms the action still delegates to it
    // when enabled, rather than short-circuiting earlier.
    expect(submitHomeVisit).toHaveBeenCalledTimes(1);
  });
});
