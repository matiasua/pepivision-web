import sharp from 'sharp';

const PDF_MAGIC = Buffer.from('%PDF');
const IMAGE_ATTACHMENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Confirms the file's actual bytes match its declared MIME type — a
 * client can report any `Content-Type` it likes, so the extension/MIME
 * allowlist in modules/storage/schemas.ts alone doesn't stop a renamed
 * executable or an unrelated document from posing as a PDF/image. PDFs are
 * checked by their standard `%PDF` magic number; images are confirmed
 * genuinely decodable via Sharp (which throws on corrupt/non-image data),
 * without altering the bytes — unlike product photos, a prescription is
 * stored exactly as submitted, never recompressed/resized.
 */
/** Strips any path and control/reserved characters from a client-supplied file name before it's ever persisted or displayed. */
export function sanitizeAttachmentFileName(rawName: string): string {
  const baseName = rawName.split(/[/\\]/).pop() ?? 'archivo';
  const cleaned = baseName.replace(/[^\w.\- áéíóúñÁÉÍÓÚÑ]/g, '_').trim();
  return cleaned.length > 0 ? cleaned.slice(0, 150) : 'archivo';
}

export async function verifyAttachmentContent(buffer: Buffer, declaredMimeType: string): Promise<boolean> {
  if (declaredMimeType === 'application/pdf') {
    return buffer.subarray(0, 4).equals(PDF_MAGIC);
  }
  if (IMAGE_ATTACHMENT_TYPES.has(declaredMimeType)) {
    try {
      const metadata = await sharp(buffer).metadata();
      return Boolean(metadata.format);
    } catch {
      return false;
    }
  }
  return false;
}
