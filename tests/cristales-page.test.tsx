// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const { default: CristalesPage } = await import('@/app/cristales/page');

describe('app/cristales/page — contenido e interfaz definitivos (Fase 7 + iteración correctiva)', () => {
  it('renders exactly one h1', () => {
    render(<CristalesPage />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('shows the three definitive lens types as headings, in order', () => {
    render(<CristalesPage />);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toContain('Monofocales');
    expect(headings).toContain('Bifocales');
    expect(headings).toContain('Progresivos');
    expect(headings.indexOf('Monofocales')).toBeLessThan(headings.indexOf('Bifocales'));
    expect(headings.indexOf('Bifocales')).toBeLessThan(headings.indexOf('Progresivos'));
  });

  it('never shows "Multifocales" as a public name', () => {
    render(<CristalesPage />);
    expect(screen.queryByText('Multifocales')).toBeNull();
    expect(screen.queryByText(/multifocal/i)).toBeNull();
  });

  it('shows the approved description text for each lens type', () => {
    render(<CristalesPage />);
    expect(
      screen.getByText('Corrigen una sola distancia visual según las necesidades indicadas en tu receta.')
    ).toBeTruthy();
    expect(
      screen.getByText('Permiten ver de lejos y de cerca mediante dos zonas diferenciadas en un mismo cristal.')
    ).toBeTruthy();
    expect(
      screen.getByText('Ofrecen una transición gradual para ver de lejos, a distancia intermedia y de cerca, sin líneas visibles.')
    ).toBeTruthy();
  });

  it('renders the comparison table with a caption and semantic column/row headers', () => {
    render(<CristalesPage />);
    const table = screen.getByRole('table');
    expect(within(table).getByText(/Comparación entre cristales/)).toBeTruthy();

    const columnHeaders = within(table)
      .getAllByRole('columnheader')
      .map((th) => th.textContent);
    expect(columnHeaders).toEqual(['Característica', 'Monofocal', 'Bifocal', 'Progresivo']);

    const rowHeaders = within(table)
      .getAllByRole('rowheader')
      .map((th) => th.textContent);
    expect(rowHeaders).toEqual([
      'Una sola distancia de visión',
      'Lejos y cerca en un mismo cristal',
      'Visión intermedia continua',
      'Línea divisoria visible',
      'Transición gradual entre distancias',
    ]);
  });

  it('every table cell uses explicit "Sí"/"No" text, not only a symbol or color', () => {
    render(<CristalesPage />);
    const table = screen.getByRole('table');
    const cells = within(table).getAllByRole('cell').map((td) => td.textContent);
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(['Sí', 'No']).toContain(cell);
    }
  });

  it('the intersection values match the definitive table exactly', () => {
    render(<CristalesPage />);
    const rows = screen.getAllByRole('row').slice(1); // skip header row
    const cellsByRow = rows.map((row) => within(row).getAllByRole('cell').map((c) => c.textContent));
    expect(cellsByRow).toEqual([
      ['Sí', 'No', 'No'],
      ['No', 'Sí', 'Sí'],
      ['No', 'No', 'Sí'],
      ['No', 'Sí', 'No'],
      ['No', 'No', 'Sí'],
    ]);
  });

  it('shows the "Tratamientos principales" block with exactly the six approved items', () => {
    render(<CristalesPage />);
    expect(screen.getByRole('heading', { name: 'Tratamientos principales' })).toBeTruthy();
    expect(screen.getByText('Antirreflejo')).toBeTruthy();
    expect(screen.getByText('Filtro de luz azul-violeta')).toBeTruthy();
    expect(screen.getByText('Fotocromático')).toBeTruthy();
    expect(screen.getByText('Protección UV')).toBeTruthy();
    expect(screen.getByText('Cristales de alto índice')).toBeTruthy();
    expect(screen.getByText('Mayor resistencia a rayaduras')).toBeTruthy();

    expect(screen.getAllByText('Tratamiento').length).toBe(5);
    expect(screen.getAllByText('Opción adicional').length).toBeGreaterThan(0);
  });

  it('never shows "Hidrofóbico y oleofóbico" anywhere on the page (retired)', () => {
    render(<CristalesPage />);
    expect(screen.queryByText('Hidrofóbico y oleofóbico')).toBeNull();
    expect(screen.queryByText(/hidrof[oó]bico/i)).toBeNull();
  });

  it('shows the "Opciones para lentes de sol" section with exactly its four items — never "También disponible"', () => {
    render(<CristalesPage />);
    expect(screen.getByRole('heading', { name: 'Opciones para lentes de sol' })).toBeTruthy();
    expect(screen.queryByText('También disponible')).toBeNull();

    expect(screen.getByText('Cristales polarizados')).toBeTruthy();
    expect(screen.getByText('Cristales degradados')).toBeTruthy();
    expect(screen.getByText('Cristales espejados')).toBeTruthy();
    expect(screen.getByText('Cristales solares graduados')).toBeTruthy();
  });

  it('does not show alto índice or general treatments inside the sun-lens options section', () => {
    render(<CristalesPage />);
    const heading = screen.getByRole('heading', { name: 'Opciones para lentes de sol' });
    const section = heading.closest('section');
    expect(section).not.toBeNull();
    const scoped = within(section as HTMLElement);
    expect(scoped.queryByText('Cristales de alto índice')).toBeNull();
    expect(scoped.queryByText('Antirreflejo')).toBeNull();
  });

  it('shows a rich final CTA block with title, helper text, and a "Cotizar mis cristales" button', () => {
    render(<CristalesPage />);
    expect(screen.getByRole('heading', { name: 'Encuentra los cristales adecuados para ti' })).toBeTruthy();
    expect(
      screen.getByText(
        'Cuéntanos qué necesitas y te ayudaremos a elegir una alternativa acorde con tu receta y estilo de vida.'
      )
    ).toBeTruthy();
    const ctaLinks = screen.getAllByRole('link', { name: 'Cotizar mis cristales' });
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
    for (const link of ctaLinks) {
      expect(link.getAttribute('href')).toBe('/cotizador');
    }
  });

  it('never claims absolute scratch resistance anywhere on the page', () => {
    render(<CristalesPage />);
    expect(screen.queryByText(/antirrayas/i)).toBeNull();
  });
});
