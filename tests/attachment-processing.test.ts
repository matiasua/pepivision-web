import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { sanitizeAttachmentFileName, verifyAttachmentContent } from '@/lib/attachment-processing';

const PDF_BYTES = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< >>\nendobj\n');

async function makeTestImage(): Promise<Buffer> {
  return sharp({ create: { width: 200, height: 150, channels: 3, background: { r: 10, g: 20, b: 30 } } })
    .jpeg()
    .toBuffer();
}

describe('lib/attachment-processing — sanitizeAttachmentFileName', () => {
  it('strips a Unix-style path, keeping only the base name', () => {
    expect(sanitizeAttachmentFileName('/etc/passwd/receta.pdf')).toBe('receta.pdf');
  });

  it('strips a Windows-style path', () => {
    expect(sanitizeAttachmentFileName('C:\\Users\\ana\\receta.pdf')).toBe('receta.pdf');
  });

  it('replaces control/special characters but keeps accented Spanish letters', () => {
    expect(sanitizeAttachmentFileName('receta óptica (final)?.pdf')).toBe('receta óptica _final__.pdf');
  });

  it('falls back to a generic name when nothing usable remains', () => {
    expect(sanitizeAttachmentFileName('***')).toBe('___');
    expect(sanitizeAttachmentFileName('')).toBe('archivo');
  });

  it('truncates an excessively long file name', () => {
    const long = `${'a'.repeat(200)}.pdf`;
    expect(sanitizeAttachmentFileName(long).length).toBeLessThanOrEqual(150);
  });
});

describe('lib/attachment-processing — verifyAttachmentContent', () => {
  it('accepts a genuine PDF (matching %PDF magic bytes)', async () => {
    expect(await verifyAttachmentContent(PDF_BYTES, 'application/pdf')).toBe(true);
  });

  it('rejects a file declared as PDF whose bytes are not a real PDF', async () => {
    expect(await verifyAttachmentContent(Buffer.from('esto no es un pdf'), 'application/pdf')).toBe(false);
  });

  it('accepts a genuine JPEG image', async () => {
    const bytes = await makeTestImage();
    expect(await verifyAttachmentContent(bytes, 'image/jpeg')).toBe(true);
  });

  it('rejects a corrupt/non-image buffer declared as an image', async () => {
    expect(await verifyAttachmentContent(Buffer.from('no soy una imagen'), 'image/jpeg')).toBe(false);
  });

  it('rejects any MIME type outside the allowed set (e.g. SVG or an executable)', async () => {
    expect(await verifyAttachmentContent(Buffer.from('<svg></svg>'), 'image/svg+xml')).toBe(false);
    expect(await verifyAttachmentContent(Buffer.from('MZ...'), 'application/x-msdownload')).toBe(false);
  });
});
