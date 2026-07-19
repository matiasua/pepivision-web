// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import type { FilterableAttributeDefinition } from '@/modules/catalog/dynamic-filters';

let currentSearch = '';
const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

const { CatalogFilters } = await import('@/components/catalog/CatalogFilters');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  currentSearch = '';
});

const SELECT_ATTR: FilterableAttributeDefinition = {
  id: 'def_select',
  key: 'certificacion',
  label: 'Certificación',
  type: 'SELECT',
  options: ['UV400', 'Polarizado'],
  sortOrder: 0,
};
const MULTI_ATTR: FilterableAttributeDefinition = {
  id: 'def_multi',
  key: 'extras',
  label: 'Tratamientos extra',
  type: 'MULTI_SELECT',
  options: ['Espejado', 'Degradado'],
  sortOrder: 1,
};
const BOOL_ATTR: FilterableAttributeDefinition = {
  id: 'def_bool',
  key: 'graduable',
  label: 'Graduable',
  type: 'BOOLEAN',
  options: null,
  sortOrder: 2,
};
const RANGE_ATTR: FilterableAttributeDefinition = {
  id: 'def_range',
  key: 'peso',
  label: 'Peso (g)',
  type: 'RANGE',
  options: null,
  sortOrder: 3,
};

describe('components/catalog/CatalogFilters — filtros dinámicos (Fase 12)', () => {
  it('no renderiza ninguna sección dinámica cuando la categoría no tiene atributos filtrables', () => {
    render(<CatalogFilters basePath="/catalogo/lentes-opticos" brands={[]} attributes={[]} />);
    expect(screen.queryByText('Certificación')).toBeNull();
  });

  it('renderiza el label de cada atributo filtrable activo', () => {
    render(<CatalogFilters basePath="/catalogo/lentes-de-sol" brands={[]} attributes={[SELECT_ATTR, MULTI_ATTR, BOOL_ATTR, RANGE_ATTR]} />);
    expect(screen.getByText('Certificación')).toBeTruthy();
    expect(screen.getByText('Tratamientos extra')).toBeTruthy();
    expect(screen.getByText('Graduable')).toBeTruthy();
    expect(screen.getByText('Peso (g)')).toBeTruthy();
  });

  it('SELECT: cada opción es un link real con aria-current, navegable por teclado', () => {
    render(<CatalogFilters basePath="/catalogo/lentes-de-sol" brands={[]} attributes={[SELECT_ATTR]} />);
    const option = screen.getByRole('link', { name: 'UV400' });
    expect(option.tagName).toBe('A');
    expect(option.getAttribute('href')).toContain('attr_certificacion=UV400');
  });

  it('SELECT: refleja el valor activo desde la URL actual con aria-current', () => {
    currentSearch = 'attr_certificacion=Polarizado';
    render(<CatalogFilters basePath="/catalogo/lentes-de-sol" brands={[]} attributes={[SELECT_ATTR]} />);
    const active = screen.getByRole('link', { name: 'Polarizado' });
    expect(active.getAttribute('aria-current')).toBe('true');
  });

  it('MULTI_SELECT: son checkboxes reales con label visible, no divs clickeables', () => {
    render(<CatalogFilters basePath="/catalogo/lentes-de-sol" brands={[]} attributes={[MULTI_ATTR]} />);
    const checkbox = screen.getByRole('checkbox', { name: 'Espejado' });
    expect(checkbox.tagName).toBe('INPUT');
    expect((checkbox as HTMLInputElement).type).toBe('checkbox');
  });

  it('MULTI_SELECT: marcar una opción navega con el valor agregado al array de la URL', () => {
    render(<CatalogFilters basePath="/catalogo/lentes-de-sol" brands={[]} attributes={[MULTI_ATTR]} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Espejado' }));
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('attr_extras=Espejado'));
  });

  it('MULTI_SELECT: dos opciones seleccionadas producen dos valores repetidos del mismo parámetro', () => {
    currentSearch = 'attr_extras=Espejado';
    render(<CatalogFilters basePath="/catalogo/lentes-de-sol" brands={[]} attributes={[MULTI_ATTR]} />);
    expect((screen.getByRole('checkbox', { name: 'Espejado' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Degradado' }));
    const call = pushMock.mock.calls[0][0] as string;
    const params = new URLSearchParams(call.split('?')[1]);
    expect(params.getAll('attr_extras').sort()).toEqual(['Degradado', 'Espejado']);
  });

  it('BOOLEAN: es un checkbox real con el label del atributo', () => {
    render(<CatalogFilters basePath="/catalogo/lentes-de-sol" brands={[]} attributes={[BOOL_ATTR]} />);
    const checkbox = screen.getByRole('checkbox', { name: 'Graduable' });
    fireEvent.click(checkbox);
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('attr_graduable=1'));
  });

  it('RANGE: dos inputs numéricos accesibles con label, no un slider', () => {
    render(<CatalogFilters basePath="/catalogo/lentes-de-sol" brands={[]} attributes={[RANGE_ATTR]} />);
    expect(screen.getByLabelText('Peso (g) mínimo')).toBeTruthy();
    expect(screen.getByLabelText('Peso (g) máximo')).toBeTruthy();
  });

  it('RANGE: "Aplicar" navega con ambos valores cuando min <= max', () => {
    render(<CatalogFilters basePath="/catalogo/lentes-de-sol" brands={[]} attributes={[RANGE_ATTR]} />);
    fireEvent.change(screen.getByLabelText('Peso (g) mínimo'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Peso (g) máximo'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    const call = pushMock.mock.calls[0][0] as string;
    expect(call).toContain('attr_peso_min=10');
    expect(call).toContain('attr_peso_max=30');
  });

  it('RANGE: muestra un error accesible y deshabilita "Aplicar" cuando el mínimo excede el máximo', () => {
    render(<CatalogFilters basePath="/catalogo/lentes-de-sol" brands={[]} attributes={[RANGE_ATTR]} />);
    fireEvent.change(screen.getByLabelText('Peso (g) mínimo'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Peso (g) máximo'), { target: { value: '10' } });
    expect(screen.getByRole('alert').textContent).toContain('mínimo no puede ser mayor');
    expect(screen.getByRole('button', { name: 'Aplicar' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('"Limpiar" sigue limpiando tanto filtros comunes como dinámicos (vuelve al basePath desnudo)', () => {
    currentSearch = 'gender=UNISEX&attr_certificacion=UV400';
    render(<CatalogFilters basePath="/catalogo/lentes-de-sol" brands={[]} attributes={[SELECT_ATTR]} />);
    const clearLink = screen.getByRole('link', { name: 'Limpiar' });
    expect(clearLink.getAttribute('href')).toBe('/catalogo/lentes-de-sol');
  });
});
