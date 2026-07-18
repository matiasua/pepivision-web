// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/app/admin/requests/actions', () => ({
  toggleRequestStatusAction: vi.fn(),
  deleteRequestAction: vi.fn(),
  getAttachmentDownloadUrlAction: vi.fn(),
}));

const { RequestCard } = await import('@/components/admin/RequestCard');

// Fase 7 (7.7): una fila histórica de Request.details con el valor
// legado "Multifocal" (retirado como nombre público, pero nunca
// reescrito en filas ya persistidas) debe seguir renderizándose en el
// panel admin sin error — RequestCard muestra el string guardado
// directamente, sin un mapper que pueda romperse ante un valor legado.
function baseRequest(details: Record<string, unknown>) {
  return {
    id: 'req_1',
    type: 'QUOTE',
    status: 'NEW',
    name: 'Cliente Histórico',
    phone: '+56911111111',
    email: null,
    comuna: null,
    message: null,
    hasPrescription: null,
    details,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    retentionExpiresAt: new Date('2027-01-01T00:00:00Z'),
    whatsappHref: 'https://wa.me/56911111111',
    attachment: null,
  };
}

describe('components/admin/RequestCard — legacy glassType "Multifocal" (Fase 7)', () => {
  it('renders a historical request with glassType "Multifocal" without throwing, showing the raw stored value', () => {
    const request = baseRequest({ frameChoice: 'advice', glassType: 'Multifocal', treatmentLabels: [] });
    expect(() => render(<RequestCard request={request} />)).not.toThrow();
    expect(screen.getByText('Multifocal')).toBeTruthy();
  });

  it('renders a new-style request with glassType "Progresivo" identically well', () => {
    const request = baseRequest({ frameChoice: 'advice', glassType: 'Progresivo', treatmentLabels: [] });
    render(<RequestCard request={request} />);
    expect(screen.getByText('Progresivo')).toBeTruthy();
  });
});
