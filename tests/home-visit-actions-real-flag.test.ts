import { afterEach, describe, expect, it, vi } from 'vitest';

// Unlike tests/home-visit-actions.test.ts (which mocks isHomeVisitEnabled
// directly to exercise the action's branching), this file exercises the
// REAL lib/env.ts + lib/feature-flags.ts parsing end-to-end, so it is the
// one place that proves the Server Action is actually blocked when
// HOME_VISIT_ENABLED is absent from the environment — not just when some
// mock says "false".
const ORIGINAL = process.env.HOME_VISIT_ENABLED;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.HOME_VISIT_ENABLED;
  else process.env.HOME_VISIT_ENABLED = ORIGINAL;
  vi.resetModules();
});

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

describe('app/domicilio/actions — submitHomeVisitAction with the real (unmocked) feature-flag parsing', () => {
  it('is blocked when HOME_VISIT_ENABLED is absent from the environment', async () => {
    delete process.env.HOME_VISIT_ENABLED;
    vi.resetModules();
    const { submitHomeVisitAction } = await import('@/app/domicilio/actions');

    const result = await submitHomeVisitAction(validInput());

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.formError).toBe('No pudimos procesar tu consulta. Intenta nuevamente.');
    }
    expect(checkPublicFormRateLimit).not.toHaveBeenCalled();
    expect(submitHomeVisit).not.toHaveBeenCalled();
  });

  it('is functional when HOME_VISIT_ENABLED=true', async () => {
    process.env.HOME_VISIT_ENABLED = 'true';
    vi.resetModules();
    checkPublicFormRateLimit.mockReturnValue(false);
    submitHomeVisit.mockResolvedValue({
      customerName: 'Cliente Test',
      whatsappHref: 'https://wa.me/123',
      comunaCovered: true,
    });
    const { submitHomeVisitAction } = await import('@/app/domicilio/actions');

    const result = await submitHomeVisitAction(validInput());

    expect(result.status).toBe('success');
    expect(submitHomeVisit).toHaveBeenCalledTimes(1);
  });
});
