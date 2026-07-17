import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { processCategoryImage, processProductImage } from '@/lib/image-processing';

async function makeTestImage(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 100, g: 150, b: 200 } } })
    .png()
    .toBuffer();
}

describe('lib/image-processing — processProductImage', () => {
  it('re-encodes to JPEG regardless of input format', async () => {
    const input = await makeTestImage(400, 300);
    const result = await processProductImage(input);
    expect(result.contentType).toBe('image/jpeg');
    expect(result.extension).toBe('jpg');
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('does not upscale an image smaller than the max dimension', async () => {
    const input = await makeTestImage(400, 300);
    const result = await processProductImage(input);
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it('downscales an image larger than the max dimension, preserving aspect ratio', async () => {
    const input = await makeTestImage(2400, 1200);
    const result = await processProductImage(input);
    expect(result.width).toBeLessThanOrEqual(1200);
    expect(result.height).toBeLessThanOrEqual(1200);
    // 2400x1200 has a 2:1 ratio — fit:'inside' constrains the larger side (width) to 1200.
    expect(result.width).toBe(1200);
    expect(result.height).toBe(600);
  });

  it('rejects a corrupted/non-image buffer instead of returning a malformed result', async () => {
    const garbage = Buffer.from('this is definitely not an image file');
    await expect(processProductImage(garbage)).rejects.toThrow();
  });
});

// Fase 6 (redesign-extensible-catalog-v2, design.md → "Imágenes de
// categoría"): mismo pipeline (EXIF/resize/no-upscale), salida WebP en vez
// de JPEG — la única diferencia real, y la razón por la que existe como
// función separada en vez de reutilizar processProductImage tal cual.
describe('lib/image-processing — processCategoryImage', () => {
  it('re-encodes to WebP regardless of input format', async () => {
    const input = await makeTestImage(400, 300);
    const result = await processCategoryImage(input);
    expect(result.contentType).toBe('image/webp');
    expect(result.extension).toBe('webp');
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('does not upscale an image smaller than the max dimension', async () => {
    const input = await makeTestImage(400, 300);
    const result = await processCategoryImage(input);
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
  });

  it('downscales an image larger than the max dimension, preserving aspect ratio', async () => {
    const input = await makeTestImage(2400, 1200);
    const result = await processCategoryImage(input);
    expect(result.width).toBe(1200);
    expect(result.height).toBe(600);
  });

  it('accepts a real JPEG input and still outputs WebP', async () => {
    const jpegInput = await sharp({ create: { width: 500, height: 500, channels: 3, background: { r: 10, g: 20, b: 30 } } })
      .jpeg()
      .toBuffer();
    const result = await processCategoryImage(jpegInput);
    expect(result.contentType).toBe('image/webp');
  });

  it('rejects a corrupted/non-image buffer', async () => {
    const garbage = Buffer.from('not an image');
    await expect(processCategoryImage(garbage)).rejects.toThrow();
  });
});
