export async function tinyPngBuffer(): Promise<Buffer> {
  return tinySolidPngBuffer({ r: 40, g: 90, b: 200 });
}

/** Same shape as tinyPngBuffer, but with a caller-chosen solid color — used where a test needs two *visually distinct* real photos (e.g. confirming a gallery actually swapped the displayed image). */
export async function tinySolidPngBuffer(background: { r: number; g: number; b: number }): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  return sharp({ create: { width: 4, height: 4, channels: 3, background } }).png().toBuffer();
}

export function tinyPdfBuffer(): Buffer {
  return Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
}
