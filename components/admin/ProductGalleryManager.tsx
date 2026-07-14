'use client';

import { useMemo, useRef, useState, useTransition, type Dispatch, type SetStateAction } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  changeProductImageColorAction,
  deleteProductImageAction,
  reorderProductImagesAction,
  replaceProductImageAction,
  setCoverImageAction,
  uploadProductImageAction,
  type ProductImageView,
} from '@/app/admin/products/actions';
import { MAX_PRODUCT_IMAGES } from '@/modules/catalog/admin-schemas';
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from '@/modules/storage/schemas';
import { GalleryLightbox } from '@/components/catalog/GalleryLightbox';
import { ConfirmDeleteButton } from './ConfirmDeleteButton';
import { StatusToast, useStatusToast } from './StatusToast';

interface ColorOption {
  id: string;
  name: string;
  hex: string;
}

interface PendingUpload {
  key: string;
  file: File;
  previewUrl: string;
  status: 'uploading' | 'success' | 'error';
  message?: string;
}

const MAX_MB = MAX_IMAGE_BYTES / (1024 * 1024);
const ACCEPT_ATTR = ALLOWED_IMAGE_MIME_TYPES.join(',');

function bySortOrder(images: ProductImageView[]) {
  return [...images].sort((a, b) => a.sortOrder - b.sortOrder);
}

function validateFileClientSide(file: File): string | null {
  if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'Formato de imagen no permitido. Usa JPG, PNG o WEBP.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `La imagen no puede superar ${MAX_MB} MB.`;
  }
  return null;
}

function ColorSwatch({ hex, size = 22 }: { hex: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full border-2 border-white shadow-[0_0_0_1px_#d7dceb]"
      style={{ backgroundColor: hex, width: size, height: size }}
    />
  );
}

export function ProductGalleryManager({
  productId,
  productName,
  images: images_,
  onImagesChange,
  colors,
}: {
  productId: string;
  productName: string;
  images: ProductImageView[];
  onImagesChange: Dispatch<SetStateAction<ProductImageView[]>>;
  colors: ColorOption[];
}) {
  // `images` is owned by the parent (ProductForm) — the single shared
  // source of state a color reassignment there needs to be able to update
  // without this component going stale. Every mutation below reads the
  // current list via the updater-function form (never a stale closure)
  // and writes back through onImagesChange, never a local setState.
  const images = bySortOrder(images_);
  const [activeColorId, setActiveColorId] = useState(colors[0]?.id ?? '');
  const [busyImageId, setBusyImageId] = useState<string | null>(null);
  const [colorMenuImageId, setColorMenuImageId] = useState<string | null>(null);
  const [menuImageId, setMenuImageId] = useState<string | null>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast, showSuccess, showError, dismiss } = useStatusToast();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const uploadKeyRef = useRef(0);
  const router = useRouter();

  const colorsById = new Map(colors.map((c) => [c.id, c]));
  const atMax = images.length >= MAX_PRODUCT_IMAGES;
  const remainingSlots = Math.max(0, MAX_PRODUCT_IMAGES - images.length);

  const imagesByColor = useMemo(() => {
    const map = new Map<string, ProductImageView[]>();
    for (const color of colors) map.set(color.id, []);
    for (const image of images) {
      const bucket = map.get(image.productColorId);
      if (bucket) bucket.push(image);
      else map.set(image.productColorId, [image]);
    }
    return map;
  }, [images, colors]);

  const activeColor = colorsById.get(activeColorId);

  async function uploadOneFile(colorId: string, file: File, key: string) {
    const formData = new FormData();
    formData.set('file', file);
    const result = await uploadProductImageAction(productId, colorId, formData);
    if (result.status === 'error') {
      setPendingUploads((current) => current.map((u) => (u.key === key ? { ...u, status: 'error', message: result.message } : u)));
      return { ok: false as const };
    }
    onImagesChange((current) => bySortOrder([...current, result.image]));
    setPendingUploads((current) => current.map((u) => (u.key === key ? { ...u, status: 'success' } : u)));
    return { ok: true as const };
  }

  function handleFilesSelected(fileList: FileList | Array<File> | null) {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;
    if (!activeColorId) {
      showError('Selecciona un color antes de subir fotografías.');
      return;
    }

    const room = Math.max(0, MAX_PRODUCT_IMAGES - images.length - pendingUploads.filter((u) => u.status !== 'error').length);
    const accepted = files.slice(0, room);
    const overflow = files.length - accepted.length;

    const batch: PendingUpload[] = accepted.map((file) => {
      uploadKeyRef.current += 1;
      const clientError = validateFileClientSide(file);
      return {
        key: `up_${uploadKeyRef.current}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: clientError ? 'error' : 'uploading',
        message: clientError ?? undefined,
      };
    });
    setPendingUploads((current) => [...current, ...batch]);
    if (uploadInputRef.current) uploadInputRef.current.value = '';

    const colorName = activeColor?.name ?? '';
    const toUpload = batch.filter((u) => u.status === 'uploading');

    startTransition(async () => {
      let succeeded = 0;
      for (const entry of toUpload) {
        const outcome = await uploadOneFile(activeColorId, entry.file, entry.key);
        if (outcome.ok) succeeded += 1;
      }
      const failed = toUpload.length - succeeded;

      if (succeeded > 0 && failed === 0) {
        showSuccess(
          succeeded === 1
            ? `Se agregó 1 fotografía al color ${colorName}.`
            : `Se agregaron ${succeeded} fotografías al color ${colorName}.`
        );
      } else if (succeeded > 0 && failed > 0) {
        showError(`No fue posible subir ${failed} de las ${toUpload.length} fotografías.`);
      } else if (failed > 0) {
        showError(failed === 1 ? 'No fue posible subir la fotografía.' : `No fue posible subir ninguna de las ${failed} fotografías.`);
      }
      if (overflow > 0) {
        showError(`Se omitieron ${overflow} archivo(s): se alcanzó el máximo de ${MAX_PRODUCT_IMAGES} fotografías.`);
      }
      if (succeeded > 0) router.refresh();

      // Clear successful entries from the pending strip; keep failures
      // visible (with their individual error) until the admin dismisses
      // them or retries, per "no perder las cargas exitosas".
      setPendingUploads((current) => current.filter((u) => u.status !== 'success'));
    });
  }

  function dismissPendingUpload(key: string) {
    setPendingUploads((current) => {
      const target = current.find((u) => u.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((u) => u.key !== key);
    });
  }

  function handleReplace(imageId: string, fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    const clientError = validateFileClientSide(file);
    if (clientError) {
      showError(clientError);
      return;
    }
    setBusyImageId(imageId);
    setMenuImageId(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('file', file);
      const result = await replaceProductImageAction(imageId, formData);
      const inputEl = replaceInputRefs.current[imageId];
      if (inputEl) inputEl.value = '';
      setBusyImageId(null);
      if (result.status === 'error') {
        showError(result.message);
        return;
      }
      onImagesChange((current) => bySortOrder(current.map((img) => (img.id === imageId ? result.image : img))));
      showSuccess('La fotografía se reemplazó correctamente.');
      router.refresh();
    });
  }

  async function handleDelete(imageId: string) {
    setBusyImageId(imageId);
    const result = await deleteProductImageAction(imageId);
    setBusyImageId(null);
    if (result.status === 'error') {
      showError(result.message);
      return;
    }
    onImagesChange((current) => {
      const removed = current.find((img) => img.id === imageId);
      const remaining = current.filter((img) => img.id !== imageId);
      if (removed?.isCover && remaining.length > 0) {
        const sorted = bySortOrder(remaining);
        sorted[0] = { ...sorted[0], isCover: true };
        return sorted;
      }
      return remaining;
    });
    showSuccess('La fotografía se eliminó correctamente.');
    router.refresh();
  }

  function handleSetCover(imageId: string) {
    setBusyImageId(imageId);
    setMenuImageId(null);
    startTransition(async () => {
      const result = await setCoverImageAction(imageId);
      setBusyImageId(null);
      if (result.status === 'error') {
        showError(result.message);
        return;
      }
      onImagesChange((current) => current.map((img) => ({ ...img, isCover: img.id === imageId })));
      showSuccess('La fotografía se estableció como portada.');
      router.refresh();
    });
  }

  function handleChangeColor(imageId: string, productColorId: string) {
    setBusyImageId(imageId);
    setColorMenuImageId(null);
    setMenuImageId(null);
    const colorName = colorsById.get(productColorId)?.name ?? '';
    startTransition(async () => {
      const result = await changeProductImageColorAction(imageId, productColorId);
      setBusyImageId(null);
      if (result.status === 'error') {
        showError(result.message);
        return;
      }
      onImagesChange((current) => current.map((img) => (img.id === imageId ? { ...img, productColorId } : img)));
      showSuccess(`La fotografía ahora está asociada al color ${colorName}.`);
      router.refresh();
    });
  }

  function move(imageId: string, direction: -1 | 1) {
    const index = images.findIndex((img) => img.id === imageId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= images.length) return;

    const reordered = [...images];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const orderedImageIds = reordered.map((img) => img.id);
    const previous = images;

    onImagesChange(reordered.map((img, i) => ({ ...img, sortOrder: i })));
    setBusyImageId(imageId);
    startTransition(async () => {
      const result = await reorderProductImagesAction(productId, orderedImageIds);
      setBusyImageId(null);
      if (result.status === 'error') {
        onImagesChange(previous);
        showError(result.message);
        return;
      }
      showSuccess('El orden de la galería se actualizó correctamente.');
      router.refresh();
    });
  }

  const lightboxImages = images.map((img) => ({
    id: img.id,
    url: img.url,
    colorName: colorsById.get(img.productColorId)?.name ?? '',
  }));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <label className="text-[13px] font-semibold text-navy">Fotografías del producto</label>
        <span className="text-xs text-[#5b6b85]">
          {images.length}/{MAX_PRODUCT_IMAGES}
        </span>
      </div>

      {colors.length === 0 ? (
        <div className="rounded-input bg-gray px-3.5 py-3 text-xs text-grafito">
          Primero agrega al menos un color al modelo para poder subir fotografías.
        </div>
      ) : (
        <>
          {/* 1.1 — visual color selector: chips, not a <select>. */}
          <div
            role="group"
            aria-label="Selecciona un color para agregar fotografías"
            className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible"
          >
            {colors.map((color) => {
              const count = imagesByColor.get(color.id)?.length ?? 0;
              const active = activeColorId === color.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setActiveColorId(color.id)}
                  aria-pressed={active}
                  className={`flex shrink-0 snap-start items-center gap-2 rounded-2xl border-2 px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fucsia ${
                    active ? 'border-fucsia bg-brand-gradient-soft' : 'border-line bg-white hover:border-[#c7d2e8]'
                  }`}
                >
                  <ColorSwatch hex={color.hex} />
                  <span>
                    <span className={`block text-[13px] font-semibold ${active ? 'text-fucsia' : 'text-navy'}`}>{color.name}</span>
                    <span className="block text-[11px] text-[#5b6b85]">
                      {count === 1 ? '1 foto' : `${count} fotos`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* 1.2 — upload area scoped to the selected color. */}
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDraggingOver(false);
              handleFilesSelected(event.dataTransfer.files);
            }}
            className={`mt-3 rounded-2xl border-2 border-dashed p-4 text-center transition-colors ${
              isDraggingOver ? 'border-fucsia bg-brand-gradient-soft' : 'border-[#c7d2e8] bg-gray'
            }`}
          >
            <div className="flex flex-wrap items-center justify-center gap-2 text-[13.5px] font-semibold text-navy">
              <ColorSwatch hex={activeColor?.hex ?? '#cccccc'} size={16} />
              Agregar fotografías para: {activeColor?.name ?? 'selecciona un color'}
            </div>
            <p className="mx-auto mt-1.5 max-w-md text-xs text-grafito">
              Arrastra tus fotografías aquí o selecciónalas desde tu equipo. Puedes elegir varias a la vez.
            </p>
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              disabled={atMax || !activeColorId || isPending}
              className="mt-3 rounded-input bg-navy px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Seleccionar fotografías
            </button>
            <input
              ref={uploadInputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={(event) => handleFilesSelected(event.target.files)}
            />
            <p className="mt-2 text-[11px] text-[#5b6b85]">
              JPG, PNG o WEBP · máximo {MAX_MB} MB por archivo · {remainingSlots} de {MAX_PRODUCT_IMAGES} espacios disponibles
            </p>
            {atMax ? (
              <p className="mt-1 text-[11px] font-semibold text-[#b45309]">
                Alcanzaste el máximo de {MAX_PRODUCT_IMAGES} fotografías para este producto.
              </p>
            ) : null}
          </div>

          {pendingUploads.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2.5" aria-live="polite">
              {pendingUploads.map((upload) => (
                <div key={upload.key} className="relative w-20 rounded-xl border border-line bg-white p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, next/image can't optimize it and doesn't need to */}
                  <img src={upload.previewUrl} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  <div className="mt-1 text-center text-[10px] font-semibold">
                    {upload.status === 'uploading' ? <span className="text-grafito">Subiendo…</span> : null}
                    {upload.status === 'error' ? <span className="text-error">Error</span> : null}
                  </div>
                  {upload.status === 'error' ? (
                    <>
                      <p className="mt-0.5 text-center text-[9.5px] leading-tight text-error">{upload.message}</p>
                      <button
                        type="button"
                        onClick={() => dismissPendingUpload(upload.key)}
                        aria-label="Descartar este archivo fallido"
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white"
                      >
                        ×
                      </button>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}

      {/* 1.3 — photos grouped by color, never hiding an empty color. */}
      {colors.length > 0 ? (
        <div className="mt-5 flex flex-col gap-5">
          {colors.map((color) => {
            const colorImages = bySortOrder(imagesByColor.get(color.id) ?? []);
            return (
              <div key={color.id}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ColorSwatch hex={color.hex} />
                    <span className="text-[13.5px] font-bold uppercase tracking-wide text-navy">{color.name}</span>
                    <span className="text-xs text-[#5b6b85]">
                      {colorImages.length === 1 ? '1 fotografía' : `${colorImages.length} fotografías`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveColorId(color.id);
                      uploadInputRef.current?.click();
                    }}
                    disabled={atMax}
                    className="rounded-lg bg-gray px-3 py-1.5 text-xs font-semibold text-navy disabled:opacity-40"
                  >
                    + Agregar fotografías a este color
                  </button>
                </div>

                {colorImages.length === 0 ? (
                  <div className="rounded-input bg-gray px-3.5 py-4 text-center text-xs text-grafito">
                    Aún no has agregado fotografías para este color.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {colorImages.map((image) => {
                      const globalIndex = images.findIndex((img) => img.id === image.id);
                      const busy = busyImageId === image.id;
                      const isFirst = globalIndex === 0;
                      const isLast = globalIndex === images.length - 1;
                      const menuOpen = menuImageId === image.id;
                      const colorMenuOpen = colorMenuImageId === image.id;

                      return (
                        <div key={image.id} className="rounded-2xl border border-line bg-white p-2.5">
                          <div className="relative aspect-square overflow-hidden rounded-xl bg-gray">
                            <button
                              type="button"
                              onClick={() => setLightboxIndex(globalIndex)}
                              aria-label={`Ver en grande, posición ${globalIndex + 1} de ${images.length}`}
                              className="absolute inset-0"
                            >
                              <Image src={image.url} alt={color.name} fill className="object-cover" unoptimized />
                            </button>
                            {image.isCover ? (
                              <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-lg bg-fucsia px-2 py-0.5 text-[10px] font-semibold text-white">
                                Portada
                              </span>
                            ) : null}
                            <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded-md bg-navy/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {globalIndex + 1}/{images.length}
                            </span>
                            {busy ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-[11px] font-semibold text-navy">
                                Procesando…
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-2 flex items-center gap-1">
                            <button
                              type="button"
                              disabled={busy || isFirst}
                              onClick={() => move(image.id, -1)}
                              aria-label="Mover fotografía antes"
                              title="Mover antes"
                              className="flex h-8 w-8 items-center justify-center rounded-md bg-gray text-xs font-bold text-navy disabled:opacity-30"
                            >
                              ◀
                            </button>
                            <button
                              type="button"
                              disabled={busy || isLast}
                              onClick={() => move(image.id, 1)}
                              aria-label="Mover fotografía después"
                              title="Mover después"
                              className="flex h-8 w-8 items-center justify-center rounded-md bg-gray text-xs font-bold text-navy disabled:opacity-30"
                            >
                              ▶
                            </button>
                            <button
                              type="button"
                              disabled={busy || image.isCover}
                              onClick={() => handleSetCover(image.id)}
                              title="Definir como portada"
                              className="h-8 flex-1 truncate rounded-md bg-gray px-1.5 text-[11px] font-semibold text-navy disabled:opacity-30"
                            >
                              {image.isCover ? '★ Portada' : '☆ Hacer portada'}
                            </button>
                            <div className="relative">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setMenuImageId(menuOpen ? null : image.id);
                                  setColorMenuImageId(null);
                                }}
                                aria-haspopup="true"
                                aria-expanded={menuOpen}
                                aria-label="Más acciones para esta fotografía"
                                className="flex h-8 w-8 items-center justify-center rounded-md bg-gray text-sm font-bold text-navy disabled:opacity-30"
                              >
                                ⋯
                              </button>
                              {menuOpen ? (
                                <div
                                  role="menu"
                                  className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-line bg-white p-1.5 shadow-brand"
                                >
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => replaceInputRefs.current[image.id]?.click()}
                                    className="block w-full rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold text-navy hover:bg-gray"
                                  >
                                    Reemplazar fotografía
                                  </button>
                                  <input
                                    ref={(el) => {
                                      replaceInputRefs.current[image.id] = el;
                                    }}
                                    type="file"
                                    accept={ACCEPT_ATTR}
                                    className="hidden"
                                    onChange={(event) => handleReplace(image.id, event.target.files)}
                                  />
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => setColorMenuImageId(colorMenuOpen ? null : image.id)}
                                    aria-haspopup="true"
                                    aria-expanded={colorMenuOpen}
                                    className="block w-full rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold text-navy hover:bg-gray"
                                  >
                                    Cambiar color
                                  </button>
                                  {colorMenuOpen ? (
                                    <div className="mt-1 flex flex-wrap gap-1.5 border-t border-line px-1 pt-1.5">
                                      {colors.map((c) => (
                                        <button
                                          key={c.id}
                                          type="button"
                                          onClick={() => handleChangeColor(image.id, c.id)}
                                          aria-pressed={c.id === image.productColorId}
                                          aria-label={`Cambiar color a ${c.name}`}
                                          title={c.name}
                                          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                                            c.id === image.productColorId ? 'border-fucsia' : 'border-transparent'
                                          }`}
                                        >
                                          <ColorSwatch hex={c.hex} size={18} />
                                        </button>
                                      ))}
                                    </div>
                                  ) : null}
                                  <div className="mt-1 border-t border-line pt-1.5">
                                    <ConfirmDeleteButton
                                      label="Eliminar fotografía"
                                      action={async () => {
                                        setMenuImageId(null);
                                        await handleDelete(image.id);
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {lightboxIndex !== null ? (
        <GalleryLightbox
          images={lightboxImages}
          index={lightboxIndex}
          productName={productName}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      ) : null}

      <StatusToast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
