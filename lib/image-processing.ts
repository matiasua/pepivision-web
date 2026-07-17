import sharp from 'sharp';

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 82; // Matches the quality the mockup used for its own (client-side) canvas resize.
const WEBP_QUALITY = 82; // Same target quality, WebP encoder.

export interface ProcessedImage {
  buffer: Buffer;
  contentType: string;
  extension: string;
  width: number;
  height: number;
}

type OutputFormat = 'jpeg' | 'webp';

/**
 * Shared resize/re-encode pipeline (EXIF-corrected, metadata-stripped,
 * bounded to MAX_DIMENSION, never upscaled/deformed — `fit: 'inside'`
 * preserves aspect ratio). `processProductImage`/`processCategoryImage`
 * below are the only public entry points — each fixes its own output
 * format so callers never pass an ad hoc format string.
 */
async function processImage(input: Buffer, format: OutputFormat): Promise<ProcessedImage> {
  let pipeline = sharp(input)
    .rotate() // apply EXIF orientation before resizing, then drop the tag
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true });

  pipeline = format === 'webp' ? pipeline.webp({ quality: WEBP_QUALITY }) : pipeline.jpeg({ quality: JPEG_QUALITY });

  const output = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    buffer: output.data,
    contentType: format === 'webp' ? 'image/webp' : 'image/jpeg',
    extension: format === 'webp' ? 'webp' : 'jpg',
    width: output.info.width,
    height: output.info.height,
  };
}

/**
 * Resizes/re-encodes an uploaded product photo server-side to a
 * standardized resolution and format — replacing the mockup's browser-side
 * `<canvas>` resize (see design.md → "Estrategia de almacenamiento de
 * imágenes"). Always outputs JPEG so every stored product photo is a known,
 * predictable format regardless of what was uploaded. Unchanged behavior —
 * only extracted into the shared `processImage()` above.
 */
export async function processProductImage(input: Buffer): Promise<ProcessedImage> {
  return processImage(input, 'jpeg');
}

/**
 * Category cover images (redesign-extensible-catalog-v2, Fase 6 — ver
 * design.md → "Imágenes de categoría"): same pipeline as product photos,
 * but WebP output — a genuinely new processing capability, since nothing
 * in this codebase generated WebP before. The original JPG/PNG upload is
 * NEVER stored; only this processed WebP variant is persisted.
 */
export async function processCategoryImage(input: Buffer): Promise<ProcessedImage> {
  return processImage(input, 'webp');
}
