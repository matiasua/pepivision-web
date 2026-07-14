export async function tinyPngBuffer(): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  return sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 40, g: 90, b: 200 } } })
    .png()
    .toBuffer();
}

export function tinyPdfBuffer(): Buffer {
  return Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
}
