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

// Isolates this test from the real public/marcas/ directory contents.
vi.mock('@/lib/brands', () => ({
  getBrandLogos: () => [],
}));

const { default: Home } = await import('@/app/page');

describe('app/page — Home (home-visit benefit card + floating badge)', () => {
  it('shows the "Servicio a domicilio" card and the floating "A domicilio" badge when enabled', () => {
    isHomeVisitEnabled.mockReturnValue(true);
    render(<Home />);

    expect(screen.getByText('Servicio a domicilio')).toBeTruthy();
    expect(screen.getByText('A domicilio')).toBeTruthy();
  });

  it('hides the "Servicio a domicilio" card and the floating "A domicilio" badge when disabled', () => {
    isHomeVisitEnabled.mockReturnValue(false);
    render(<Home />);

    expect(screen.queryByText('Servicio a domicilio')).toBeNull();
    expect(screen.queryByText('A domicilio')).toBeNull();
  });

  it('always shows the other benefit cards, regardless of the flag', () => {
    isHomeVisitEnabled.mockReturnValue(false);
    render(<Home />);

    expect(screen.getByText('Atención personalizada')).toBeTruthy();
    expect(screen.getByText('Lentes según tu receta')).toBeTruthy();
    expect(screen.getByText('Modelos modernos')).toBeTruthy();
    expect(screen.getByText('Cotización rápida')).toBeTruthy();
  });
});
