import { afterEach, describe, expect, it, vi } from 'vitest';

const isHomeVisitEnabled = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
  isHomeVisitEnabled: () => isHomeVisitEnabled(),
}));

vi.mock('@/lib/fonts', () => ({
  poppins: { variable: '--font-poppins' },
  inter: { variable: '--font-inter' },
}));

const { generateMetadata } = await import('@/app/layout');

describe('app/layout — generateMetadata (sitewide description)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('mentions "atención a domicilio" in the description when enabled', () => {
    isHomeVisitEnabled.mockReturnValue(true);
    const metadata = generateMetadata();
    expect(metadata.description).toContain('atención a domicilio');
  });

  it('omits "atención a domicilio" from the description when disabled', () => {
    isHomeVisitEnabled.mockReturnValue(false);
    const metadata = generateMetadata();
    expect(metadata.description).not.toContain('atención a domicilio');
  });
});
