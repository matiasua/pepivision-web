// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ConfirmDeleteButton } from '@/components/admin/ConfirmDeleteButton';

afterEach(cleanup);

describe('components/admin/ConfirmDeleteButton', () => {
  it('shows only the trigger button first, no confirmation prompt yet', () => {
    render(<ConfirmDeleteButton action={vi.fn()} label="Eliminar producto" />);
    expect(screen.getByRole('button', { name: 'Eliminar producto' })).not.toBeNull();
    expect(screen.queryByText('¿Eliminar?')).toBeNull();
  });

  it('clicking the trigger swaps to the Sí/No confirmation prompt and moves focus onto "Sí" (never dropped to body)', async () => {
    render(<ConfirmDeleteButton action={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    const confirmButton = await screen.findByRole('button', { name: 'Sí' });
    expect(document.activeElement).toBe(confirmButton);
    expect(screen.getByRole('group', { name: 'Confirmar eliminación' })).not.toBeNull();
  });

  it('clicking "No" cancels and returns focus to the original trigger button (never dropped to body)', async () => {
    render(<ConfirmDeleteButton action={vi.fn()} label="Eliminar" />);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'No' }));

    const trigger = await screen.findByRole('button', { name: 'Eliminar' });
    expect(document.activeElement).toBe(trigger);
  });

  it('clicking "Sí" invokes the action exactly once and collapses back to the trigger', async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    render(<ConfirmDeleteButton action={action} />);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Sí' }));
    });

    expect(action).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Eliminar' })).not.toBeNull();
  });
});
