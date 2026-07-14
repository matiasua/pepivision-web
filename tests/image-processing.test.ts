import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { processProductImage } from '@/lib/image-processing';

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
});
