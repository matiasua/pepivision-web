// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const isHomeVisitEnabled = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
  isHomeVisitEnabled: () => isHomeVisitEnabled(),
}));

const { default: FaqPage } = await import('@/app/faq/page');

describe('app/faq/page — home-visit FAQ entry', () => {
  it('shows the "¿Realizan atención a domicilio?" entry when enabled', () => {
    isHomeVisitEnabled.mockReturnValue(true);
    render(<FaqPage />);

    expect(screen.getByText('¿Realizan atención a domicilio?')).toBeTruthy();
  });

  it('hides the "¿Realizan atención a domicilio?" entry when disabled', () => {
    isHomeVisitEnabled.mockReturnValue(false);
    render(<FaqPage />);

    expect(screen.queryByText('¿Realizan atención a domicilio?')).toBeNull();
  });

  it('always shows unrelated FAQ entries, regardless of the flag', () => {
    isHomeVisitEnabled.mockReturnValue(false);
    render(<FaqPage />);

    expect(screen.getByText('¿Cómo puedo solicitar una cotización?')).toBeTruthy();
  });
});
