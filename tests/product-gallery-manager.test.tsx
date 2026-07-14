// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { ProductGalleryManager } from '@/components/admin/ProductGalleryManager';
import {
  changeProductImageColorAction,
  deleteProductImageAction,
  reorderProductImagesAction,
  setCoverImageAction,
  uploadProductImageAction,
} from '@/app/admin/products/actions';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/app/admin/products/actions', () => ({
  uploadProductImageAction: vi.fn(),
  replaceProductImageAction: vi.fn(),
  deleteProductImageAction: vi.fn(),
  changeProductImageColorAction: vi.fn(),
  setCoverImageAction: vi.fn(),
  reorderProductImagesAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const colors = [
  { id: 'clr_negro', name: 'Negro', hex: '#1c1c22' },
  { id: 'clr_cafe', name: 'Café', hex: '#5a3a24' },
  { id: 'clr_azulito', name: 'Azulito', hex: '#274b8f' },
];

const images = [
  { id: 'img_1', url: '/img1.jpg', productColorId: 'clr_negro', sortOrder: 0, isCover: true },
  { id: 'img_2', url: '/img2.jpg', productColorId: 'clr_negro', sortOrder: 1, isCover: false },
  { id: 'img_3', url: '/img3.jpg', productColorId: 'clr_cafe', sortOrder: 2, isCover: false },
];

function makeFile(name: string, type = 'image/jpeg') {
  return new File(['x'.repeat(100)], name, { type });
}

describe('components/admin/ProductGalleryManager', () => {
  it('shows the "no colors yet" message and no upload area when the product has no colors', () => {
    render(<ProductGalleryManager productId="p1" productName="Aurora" images={[]} onImagesChange={vi.fn()} colors={[]} />);
    expect(
      screen.getByText('Primero agrega al menos un color al modelo para poder subir fotografías.')
    ).toBeTruthy();
    expect(screen.queryByText(/Seleccionar fotografías/)).toBeNull();
  });

  it('renders every color as a visual, keyboard-accessible chip with its photo count, and marks the selected one', () => {
    render(<ProductGalleryManager productId="p1" productName="Aurora" images={images} onImagesChange={vi.fn()} colors={colors} />);

    const negro = screen.getByRole('button', { name: /Negro/ });
    const cafe = screen.getByRole('button', { name: /Café/ });
    const azulito = screen.getByRole('button', { name: /Azulito/ });

    expect(within(negro).getByText('2 fotos')).toBeTruthy();
    expect(within(cafe).getByText('1 foto')).toBeTruthy();
    expect(within(azulito).getByText('0 fotos')).toBeTruthy();

    // First color selected by default.
    expect(negro.getAttribute('aria-pressed')).toBe('true');
    expect(cafe.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(cafe);
    expect(cafe.getAttribute('aria-pressed')).toBe('true');
    expect(negro.getAttribute('aria-pressed')).toBe('false');
  });

  it('groups photos by color, showing a friendly empty state for a color with none', () => {
    const { container } = render(
      <ProductGalleryManager productId="p1" productName="Aurora" images={images} onImagesChange={vi.fn()} colors={colors} />
    );

    // Group section headings specifically (distinct from the color-chip
    // selector above, which also renders each color's name) — identified
    // by their uppercase/tracking-wide styling class, unique to headings.
    // Rendered as "Negro"/"Café"/"Azulito" text content; visually
    // uppercased via CSS only (text-transform), which jsdom doesn't apply.
    const headings = container.querySelectorAll('span.uppercase');
    expect(Array.from(headings, (h) => h.textContent).sort()).toEqual(['Azulito', 'Café', 'Negro']);
    expect(screen.getByText('Aún no has agregado fotografías para este color.')).toBeTruthy();
  });

  it('uploads multiple files for the selected color and reports a combined success message', async () => {
    vi.mocked(uploadProductImageAction).mockImplementation(async (_productId, colorId) => ({
      status: 'success',
      image: { id: `new_${Math.random()}`, url: '/new.jpg', productColorId: colorId, sortOrder: 9, isCover: false },
    }));

    render(<ProductGalleryManager productId="p1" productName="Aurora" images={images} onImagesChange={vi.fn()} colors={colors} />);

    const inputs = document.querySelectorAll('input[type="file"]');
    const uploadInput = Array.from(inputs).find((el) => (el as HTMLInputElement).multiple) as HTMLInputElement;
    expect(uploadInput).toBeTruthy();

    const file1 = makeFile('a.jpg');
    const file2 = makeFile('b.jpg');

    await act(async () => {
      fireEvent.change(uploadInput, { target: { files: [file1, file2] } });
      // flush the sequential upload loop
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(uploadProductImageAction).toHaveBeenCalledTimes(2);
    expect(uploadProductImageAction).toHaveBeenCalledWith('p1', 'clr_negro', expect.any(FormData));
    expect(await screen.findByText('Se agregaron 2 fotografías al color Negro.')).toBeTruthy();
  });

  it('reports a partial-failure message without discarding the files that did succeed', async () => {
    let call = 0;
    vi.mocked(uploadProductImageAction).mockImplementation(async (_productId, colorId) => {
      call += 1;
      if (call === 1) {
        return { status: 'success', image: { id: 'ok_1', url: '/ok.jpg', productColorId: colorId, sortOrder: 9, isCover: false } };
      }
      return { status: 'error', message: 'La imagen no puede superar 8 MB.' };
    });

    render(<ProductGalleryManager productId="p1" productName="Aurora" images={images} onImagesChange={vi.fn()} colors={colors} />);
    const inputs = document.querySelectorAll('input[type="file"]');
    const uploadInput = Array.from(inputs).find((el) => (el as HTMLInputElement).multiple) as HTMLInputElement;

    await act(async () => {
      fireEvent.change(uploadInput, { target: { files: [makeFile('a.jpg'), makeFile('b.jpg')] } });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(await screen.findByText('No fue posible subir 1 de las 2 fotografías.')).toBeTruthy();
  });

  it('moves a photo and calls reorderProductImagesAction with the new order', async () => {
    vi.mocked(reorderProductImagesAction).mockResolvedValue({ status: 'success' });
    render(<ProductGalleryManager productId="p1" productName="Aurora" images={images} onImagesChange={vi.fn()} colors={colors} />);

    const moveAfterButtons = screen.getAllByRole('button', { name: 'Mover fotografía después' });
    await act(async () => {
      fireEvent.click(moveAfterButtons[0]); // move img_1 (position 1) after img_2
    });

    expect(reorderProductImagesAction).toHaveBeenCalledWith('p1', ['img_2', 'img_1', 'img_3']);
    expect(await screen.findByText('El orden de la galería se actualizó correctamente.')).toBeTruthy();
  });

  it('sets a new cover photo and shows the confirmation message', async () => {
    vi.mocked(setCoverImageAction).mockResolvedValue({ status: 'success' });
    render(<ProductGalleryManager productId="p1" productName="Aurora" images={images} onImagesChange={vi.fn()} colors={colors} />);

    const makeCoverButtons = screen.getAllByRole('button', { name: /Hacer portada/ });
    await act(async () => {
      fireEvent.click(makeCoverButtons[0]);
    });

    expect(setCoverImageAction).toHaveBeenCalledWith('img_2');
    expect(await screen.findByText('La fotografía se estableció como portada.')).toBeTruthy();
  });

  it('changes a photo\'s color via the visual picker in the "more actions" menu and confirms the new association', async () => {
    vi.mocked(changeProductImageColorAction).mockResolvedValue({ status: 'success' });
    render(<ProductGalleryManager productId="p1" productName="Aurora" images={images} onImagesChange={vi.fn()} colors={colors} />);

    const moreButtons = screen.getAllByRole('button', { name: 'Más acciones para esta fotografía' });
    fireEvent.click(moreButtons[0]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cambiar color' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar color a Café' }));

    expect(await screen.findByText('La fotografía ahora está asociada al color Café.')).toBeTruthy();
    expect(changeProductImageColorAction).toHaveBeenCalledWith('img_1', 'clr_cafe');
  });

  it('deletes a photo only after explicit confirmation', async () => {
    vi.mocked(deleteProductImageAction).mockResolvedValue({ status: 'success' });
    render(<ProductGalleryManager productId="p1" productName="Aurora" images={images} onImagesChange={vi.fn()} colors={colors} />);

    const moreButtons = screen.getAllByRole('button', { name: 'Más acciones para esta fotografía' });
    fireEvent.click(moreButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar fotografía' }));

    // Confirmation step — deleting must not have happened yet.
    expect(deleteProductImageAction).not.toHaveBeenCalled();
    expect(screen.getByText('¿Eliminar?')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sí' }));
    });

    expect(deleteProductImageAction).toHaveBeenCalledWith('img_1');
    expect(await screen.findByText('La fotografía se eliminó correctamente.')).toBeTruthy();
  });
});
