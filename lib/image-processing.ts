import sharp from 'sharp';

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 82; // Matches the quality the mockup used for its own (client-side) canvas resize.

export interface ProcessedImage {
  buffer: Buffer;
  contentType: string;
  extension: string;
  width: number;
  height: number;
}

/**
 * Resizes/re-encodes an uploaded image server-side to a standardized
 * resolution and format — replacing the mockup's browser-side `<canvas>`
 * resize (see design.md → "Estrategia de almacenamiento de imágenes").
 * Always outputs JPEG so every stored product photo is a known, predictable
 * format regardless of what was uploaded.
 */
export async function processProductImage(input: Buffer): Promise<ProcessedImage> {
  const output = await sharp(input)
    .rotate() // apply EXIF orientation before resizing, then drop the tag
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: output.data,
    contentType: 'image/jpeg',
    extension: 'jpg',
    width: output.info.width,
    height: output.info.height,
  };
}
