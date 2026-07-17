'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { uploadCategoryImageAction, deleteCategoryImageAction } from '@/app/admin/categories/actions';
import { MAX_IMAGE_BYTES } from '@/modules/storage/schemas';
import { ConfirmDeleteButton } from './ConfirmDeleteButton';
import { StatusToast, useStatusToast } from './StatusToast';

const MAX_MB = MAX_IMAGE_BYTES / (1024 * 1024);
// UX-facing accept list (sección 5 del cierre técnico): JPG/JPEG/PNG. El
// procesador (processCategoryImage) sigue validando el contenido real —
// esto solo guía el selector de archivos del navegador, nunca es la única
// verificación (ver saveCategoryImage, que reutiliza imageFileMetaSchema +
// Sharp real).
const ACCEPT_ATTR = '.jpg,.jpeg,.png,image/jpeg,image/png';

function validateFileClientSide(file: File): string | null {
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
    return 'Formato de imagen no permitido. Usa JPG o PNG.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `La imagen no puede superar ${MAX_MB} MB.`;
  }
  return null;
}

export function CategoryImageManager({
  categoryId,
  imagePath: initialImagePath,
  categoryName,
}: {
  categoryId: string;
  imagePath: string | null;
  categoryName: string;
}) {
  const [imagePath, setImagePath] = useState(initialImagePath);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const { toast, showSuccess, showError, dismiss } = useStatusToast();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileSelected(file: File) {
    if (isPending) return; // protección contra doble envío
    const clientError = validateFileClientSide(file);
    if (clientError) {
      setError(clientError);
      showError(clientError);
      return;
    }
    setError('');

    const formData = new FormData();
    formData.set('file', file);

    startTransition(async () => {
      const result = await uploadCategoryImageAction(categoryId, formData);
      if (result.status === 'error') {
        setError(result.message);
        showError(result.message);
        return;
      }
      setImagePath(result.imagePath);
      showSuccess(imagePath ? 'Imagen reemplazada correctamente.' : 'Imagen subida correctamente.');
      if (inputRef.current) inputRef.current.value = '';
    });
  }

  async function handleRemove() {
    const result = await deleteCategoryImageAction(categoryId);
    if (result.status === 'error') {
      showError(result.message);
      return;
    }
    setImagePath(null);
    showSuccess('Imagen eliminada.');
  }

  return (
    <div className="mt-5">
      <span id="category-image-label" className="text-[13px] font-semibold text-navy">
        Imagen de portada
      </span>
      <p className="mt-1 text-xs text-grafito">
        JPG o PNG, hasta {MAX_MB} MB. Se procesa automáticamente a un formato web optimizado (WebP).
      </p>

      <div className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="relative aspect-[16/9] w-full max-w-[220px] shrink-0 overflow-hidden rounded-input bg-gray">
          {imagePath ? (
            <Image src={imagePath} alt={`Imagen actual de la categoría ${categoryName}`} fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-grafito">Sin imagen</div>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <label htmlFor="category-image-input" className="sr-only">
            Subir imagen de portada
          </label>
          <input
            id="category-image-input"
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            aria-labelledby="category-image-label"
            aria-describedby={error ? 'category-image-error' : undefined}
            disabled={isPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelected(file);
            }}
            className="text-sm text-grafito file:mr-3 file:rounded-input file:border-0 file:bg-brand-gradient file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white disabled:opacity-60"
          />

          <div aria-live="polite" className="text-xs font-semibold text-navy">
            {isPending ? 'Subiendo…' : null}
          </div>

          {imagePath ? (
            <ConfirmDeleteButton action={handleRemove} label="Eliminar imagen" />
          ) : null}
        </div>
      </div>

      <div id="category-image-error" aria-live="polite">
        {error ? <div className="mt-2.5 rounded-input bg-error-bg px-3.5 py-2.5 text-[13px] font-semibold text-error">{error}</div> : null}
      </div>

      <StatusToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
