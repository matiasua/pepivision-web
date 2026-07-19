// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const getOfferingAttributeContextAction = vi.fn();
const updateOfferingAttributeValuesAction = vi.fn();
vi.mock('@/app/admin/products/actions', () => ({
  getOfferingAttributeContextAction: (...args: unknown[]) => getOfferingAttributeContextAction(...args),
  updateOfferingAttributeValuesAction: (...args: unknown[]) => updateOfferingAttributeValuesAction(...args),
}));

const { OfferingAttributesEditor } = await import('@/components/admin/OfferingAttributesEditor');

function baseContext(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    offeringId: 'off_1',
    categoryId: 'cat_1',
    definitions: [
      { id: 'def_select', key: 'material', label: 'Material', type: 'SELECT', options: ['Acetato', 'Metal'], required: false, active: true },
      { id: 'def_multi', key: 'colores', label: 'Colores disponibles', type: 'MULTI_SELECT', options: ['Negro', 'Azul'], required: false, active: true },
      { id: 'def_bool', key: 'polarizado', label: 'Polarizado', type: 'BOOLEAN', options: null, required: false, active: true },
      { id: 'def_range', key: 'diametro', label: 'Diámetro', type: 'RANGE', options: null, required: false, active: true },
      { id: 'def_text', key: 'nota', label: 'Nota interna', type: 'TEXT', options: null, required: false, active: true },
    ],
    values: [
      { attributeDefinitionId: 'def_select', textValue: null, multiValues: null, numberValue: null, booleanValue: null },
      { attributeDefinitionId: 'def_multi', textValue: null, multiValues: null, numberValue: null, booleanValue: null },
      { attributeDefinitionId: 'def_bool', textValue: null, multiValues: null, numberValue: null, booleanValue: null },
      { attributeDefinitionId: 'def_range', textValue: null, multiValues: null, numberValue: null, booleanValue: null },
      { attributeDefinitionId: 'def_text', textValue: null, multiValues: null, numberValue: null, booleanValue: null },
    ],
    ...overrides,
  };
}

describe('components/admin/OfferingAttributesEditor', () => {
  it('is collapsed by default and loads context only on expand', async () => {
    getOfferingAttributeContextAction.mockResolvedValue({ status: 'success', context: baseContext() });
    render(<OfferingAttributesEditor offeringId="off_1" categoryName="Lentes ópticos" />);

    expect(getOfferingAttributeContextAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /atributos de lentes ópticos/i }));

    await waitFor(() => expect(getOfferingAttributeContextAction).toHaveBeenCalledWith('off_1'));
    expect(await screen.findByText('Material')).toBeTruthy();
  });

  it('shows a load error accessibly and does not render controls', async () => {
    getOfferingAttributeContextAction.mockResolvedValue({ status: 'error', message: 'No se pudo cargar.' });
    render(<OfferingAttributesEditor offeringId="off_1" categoryName="Lentes ópticos" />);

    fireEvent.click(screen.getByRole('button', { name: /atributos de lentes ópticos/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('No se pudo cargar.');
  });

  it('renders a SELECT control with only the declared options', async () => {
    getOfferingAttributeContextAction.mockResolvedValue({ status: 'success', context: baseContext() });
    render(<OfferingAttributesEditor offeringId="off_1" categoryName="Lentes ópticos" />);
    fireEvent.click(screen.getByRole('button', { name: /atributos de lentes ópticos/i }));

    const select = (await screen.findByLabelText('Material')) as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual(['', 'Acetato', 'Metal']);
  });

  it('renders MULTI_SELECT as independently toggleable checkboxes', async () => {
    getOfferingAttributeContextAction.mockResolvedValue({ status: 'success', context: baseContext() });
    render(<OfferingAttributesEditor offeringId="off_1" categoryName="Lentes ópticos" />);
    fireEvent.click(screen.getByRole('button', { name: /atributos de lentes ópticos/i }));

    const negro = (await screen.findByLabelText('Negro')) as HTMLInputElement;
    const azul = screen.getByLabelText('Azul') as HTMLInputElement;
    expect(negro.checked).toBe(false);
    fireEvent.click(negro);
    expect(negro.checked).toBe(true);
    expect(azul.checked).toBe(false);
  });

  it('renders BOOLEAN as a tri-state control distinguishing false from undefined', async () => {
    getOfferingAttributeContextAction.mockResolvedValue({ status: 'success', context: baseContext() });
    render(<OfferingAttributesEditor offeringId="off_1" categoryName="Lentes ópticos" />);
    fireEvent.click(screen.getByRole('button', { name: /atributos de lentes ópticos/i }));

    const select = (await screen.findByLabelText('Polarizado')) as HTMLSelectElement;
    expect(select.value).toBe('');
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual(['', 'true', 'false']);
  });

  it('saves the full current draft and reflects the server response', async () => {
    getOfferingAttributeContextAction.mockResolvedValue({ status: 'success', context: baseContext() });
    const savedContext = baseContext({
      values: [
        { attributeDefinitionId: 'def_select', textValue: 'Acetato', multiValues: null, numberValue: null, booleanValue: null },
        { attributeDefinitionId: 'def_multi', textValue: null, multiValues: null, numberValue: null, booleanValue: null },
        { attributeDefinitionId: 'def_bool', textValue: null, multiValues: null, numberValue: null, booleanValue: null },
        { attributeDefinitionId: 'def_range', textValue: null, multiValues: null, numberValue: null, booleanValue: null },
        { attributeDefinitionId: 'def_text', textValue: null, multiValues: null, numberValue: null, booleanValue: null },
      ],
    });
    updateOfferingAttributeValuesAction.mockResolvedValue({ status: 'success', context: savedContext });

    render(<OfferingAttributesEditor offeringId="off_1" categoryName="Lentes ópticos" />);
    fireEvent.click(screen.getByRole('button', { name: /atributos de lentes ópticos/i }));

    const select = (await screen.findByLabelText('Material')) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Acetato' } });

    fireEvent.click(screen.getByRole('button', { name: /guardar atributos/i }));

    await waitFor(() => expect(updateOfferingAttributeValuesAction).toHaveBeenCalledTimes(1));
    const [payload] = updateOfferingAttributeValuesAction.mock.calls[0];
    expect(payload.offeringId).toBe('off_1');
    expect(payload.values).toHaveLength(5);
    expect(payload.values.find((v: { attributeDefinitionId: string }) => v.attributeDefinitionId === 'def_select')).toEqual(
      expect.objectContaining({ textValue: 'Acetato' })
    );

    expect(await screen.findByText('Atributos guardados.')).toBeTruthy();
  });

  it('surfaces a save error without discarding the current draft', async () => {
    getOfferingAttributeContextAction.mockResolvedValue({ status: 'success', context: baseContext() });
    updateOfferingAttributeValuesAction.mockResolvedValue({ status: 'error', message: 'Uno de los atributos indicados no pertenece a esta oferta.' });

    render(<OfferingAttributesEditor offeringId="off_1" categoryName="Lentes ópticos" />);
    fireEvent.click(screen.getByRole('button', { name: /atributos de lentes ópticos/i }));

    await screen.findByLabelText('Material');
    fireEvent.click(screen.getByRole('button', { name: /guardar atributos/i }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Uno de los atributos indicados no pertenece a esta oferta.');
  });

  it('shows an empty-state message when the category has no attribute definitions', async () => {
    getOfferingAttributeContextAction.mockResolvedValue({ status: 'success', context: baseContext({ definitions: [], values: [] }) });
    render(<OfferingAttributesEditor offeringId="off_1" categoryName="Lentes ópticos" />);
    fireEvent.click(screen.getByRole('button', { name: /atributos de lentes ópticos/i }));

    expect(await screen.findByText(/no tiene atributos configurados todavía/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /guardar atributos/i })).toBeNull();
  });

  it('collapses and re-expands without re-fetching (context is cached)', async () => {
    getOfferingAttributeContextAction.mockResolvedValue({ status: 'success', context: baseContext() });
    render(<OfferingAttributesEditor offeringId="off_1" categoryName="Lentes ópticos" />);

    const toggle = screen.getByRole('button', { name: /atributos de lentes ópticos/i });
    fireEvent.click(toggle);
    await screen.findByLabelText('Material');
    fireEvent.click(screen.getByRole('button', { name: /ocultar atributos/i }));
    fireEvent.click(screen.getByRole('button', { name: /atributos de lentes ópticos/i }));

    await screen.findByLabelText('Material');
    expect(getOfferingAttributeContextAction).toHaveBeenCalledTimes(1);
  });
});
