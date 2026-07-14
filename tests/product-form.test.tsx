// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { ProductForm, type ProductFormValues } from '@/components/admin/ProductForm';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

afterEach(() => {
  cleanup();
  push.mockClear();
  refresh.mockClear();
});

const baseValues: ProductFormValues = {
  name: 'Aurora',
  code: 'PV-101',
  brandId: 'brand_1',
  priceFromClp: '39900',
  sizes: '',
  gender: 'UNISEX',
  shape: 'REDONDO',
  material: 'ACETATO',
  available: true,
  visible: true,
  badge: '',
  description: '',
  colors: [],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('components/admin/ProductForm — save button pending state', () => {
  it('reverts "Guardando…" back to "Guardar modelo" as soon as the submit resolves, before navigation settles', async () => {
    const { promise, resolve } = deferred<{ status: 'success'; productId: string }>();
    const onSubmit = vi.fn().mockReturnValue(promise);

    render(<ProductForm title="Editar modelo" onSubmit={onSubmit} initialValues={baseValues} productId="prod_1" brands={[]} />);

    const button = screen.getByRole('button', { name: /guardar modelo/i });
    fireEvent.click(button);

    // Pending: label + disabled while the submit promise hasn't settled yet.
    const pendingButton = screen.getByRole('button', { name: /guardando/i }) as HTMLButtonElement;
    expect(pendingButton.disabled).toBe(true);

    await act(async () => {
      resolve({ status: 'success', productId: 'prod_1' });
      // Let the resolved promise's .then/microtasks and the effect scheduled
      // off the resulting state update flush.
      await promise;
    });

    // The button must already be back to normal here — router.push/refresh
    // (mocked as no-ops that never themselves resolve to anything blocking)
    // must not be able to keep it stuck, which was the actual bug: they used
    // to run inside the same startTransition as the submit itself.
    const restoredButton = screen.getByRole('button', { name: /^guardar modelo$/i }) as HTMLButtonElement;
    expect(restoredButton.disabled).toBe(false);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/admin/products');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('reverts to normal (not stuck) when the submit fails, and shows the error', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ status: 'error', message: 'Ya existe un modelo con ese código.' });

    render(<ProductForm title="Nuevo modelo" onSubmit={onSubmit} initialValues={baseValues} brands={[]} />);

    const button = screen.getByRole('button', { name: /guardar modelo/i });
    await act(async () => {
      fireEvent.click(button);
    });

    const restoredButton = screen.getByRole('button', { name: /^guardar modelo$/i }) as HTMLButtonElement;
    expect(restoredButton.disabled).toBe(false);
    // Shown twice by design: the inline form error banner and the toast.
    expect(screen.getAllByText('Ya existe un modelo con ese código.').length).toBeGreaterThan(0);
    // A failed save must never navigate away.
    expect(push).not.toHaveBeenCalled();
  });

  it('ignores a second click while the first submit is still in flight', async () => {
    const { promise, resolve } = deferred<{ status: 'success'; productId: string }>();
    const onSubmit = vi.fn().mockReturnValue(promise);

    render(<ProductForm title="Nuevo modelo" onSubmit={onSubmit} initialValues={baseValues} brands={[]} />);

    const button = screen.getByRole('button', { name: /guardar modelo/i });
    fireEvent.click(button);
    fireEvent.click(button); // disabled by then — should not trigger a second call
    fireEvent.click(button);

    await act(async () => {
      resolve({ status: 'success', productId: 'prod_1' });
      await promise;
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
