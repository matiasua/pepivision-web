import { describe, expect, it } from 'vitest';
import { attachmentFileMetaSchema, imageFileMetaSchema, MAX_ATTACHMENT_BYTES, MAX_IMAGE_BYTES } from '@/modules/storage/schemas';

describe('modules/storage/schemas — imageFileMetaSchema', () => {
  it('accepts a valid JPEG within the size limit', () => {
    expect(imageFileMetaSchema.safeParse({ type: 'image/jpeg', size: 1024 }).success).toBe(true);
  });

  it('accepts PNG and WEBP', () => {
    expect(imageFileMetaSchema.safeParse({ type: 'image/png', size: 1024 }).success).toBe(true);
    expect(imageFileMetaSchema.safeParse({ type: 'image/webp', size: 1024 }).success).toBe(true);
  });

  it('rejects a disallowed MIME type', () => {
    expect(imageFileMetaSchema.safeParse({ type: 'application/pdf', size: 1024 }).success).toBe(false);
    expect(imageFileMetaSchema.safeParse({ type: 'image/gif', size: 1024 }).success).toBe(false);
  });

  it('rejects a file exceeding the max size', () => {
    expect(imageFileMetaSchema.safeParse({ type: 'image/jpeg', size: MAX_IMAGE_BYTES + 1 }).success).toBe(false);
  });

  it('rejects an empty (zero-byte) file', () => {
    expect(imageFileMetaSchema.safeParse({ type: 'image/jpeg', size: 0 }).success).toBe(false);
  });

  it('accepts a file exactly at the max size', () => {
    expect(imageFileMetaSchema.safeParse({ type: 'image/jpeg', size: MAX_IMAGE_BYTES }).success).toBe(true);
  });
});

describe('modules/storage/schemas — attachmentFileMetaSchema (prescriptions)', () => {
  it('accepts a valid PDF, JPG, PNG and WEBP within the size limit', () => {
    for (const type of ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']) {
      expect(attachmentFileMetaSchema.safeParse({ type, size: 1024 }).success).toBe(true);
    }
  });

  it('rejects a disallowed MIME type (e.g. SVG or a generic document)', () => {
    expect(attachmentFileMetaSchema.safeParse({ type: 'image/svg+xml', size: 1024 }).success).toBe(false);
    expect(attachmentFileMetaSchema.safeParse({ type: 'application/msword', size: 1024 }).success).toBe(false);
    expect(attachmentFileMetaSchema.safeParse({ type: 'application/x-msdownload', size: 1024 }).success).toBe(false);
  });

  it('rejects a file exceeding the 10 MB limit', () => {
    expect(attachmentFileMetaSchema.safeParse({ type: 'application/pdf', size: MAX_ATTACHMENT_BYTES + 1 }).success).toBe(false);
  });

  it('accepts a file exactly at the 10 MB limit', () => {
    expect(attachmentFileMetaSchema.safeParse({ type: 'application/pdf', size: MAX_ATTACHMENT_BYTES }).success).toBe(true);
  });

  it('rejects an empty (zero-byte) file', () => {
    expect(attachmentFileMetaSchema.safeParse({ type: 'application/pdf', size: 0 }).success).toBe(false);
  });
});
