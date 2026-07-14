import { describe, expect, it } from 'vitest';
import { buildPublicUrl, buildStorageKey } from '@/modules/storage/service';

describe('modules/storage/service — buildStorageKey', () => {
  // Gallery photos no longer have a fixed slot (MAIN/FRONT/SIDE) — every
  // upload uses the same generic label; uniqueness comes entirely from the
  // random suffix, which is what these tests actually exercise.
  it('namespaces the key under products/<productId>/', () => {
    const key = buildStorageKey('prod_123', 'photo', 'jpg');
    expect(key).toMatch(/^products\/prod_123\/photo-[0-9a-f]{16}\.jpg$/);
  });

  it('lowercases the label', () => {
    const key = buildStorageKey('prod_123', 'PHOTO', 'jpg');
    expect(key.startsWith('products/prod_123/photo-')).toBe(true);
  });

  it('generates a different key on every call (no collisions on replace)', () => {
    const a = buildStorageKey('prod_123', 'photo', 'jpg');
    const b = buildStorageKey('prod_123', 'photo', 'jpg');
    expect(a).not.toBe(b);
  });
});

describe('modules/storage/service — buildPublicUrl', () => {
  it('builds a URL under the configured public base and bucket', () => {
    const url = buildPublicUrl('products/prod_123/main-abc123.jpg');
    expect(url).toContain('/products/prod_123/main-abc123.jpg');
    expect(url.startsWith('http')).toBe(true);
  });
});
