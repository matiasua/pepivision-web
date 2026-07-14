import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getBrandLogos } from '@/lib/brands';

describe('lib/brands — getBrandLogos', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'pv360-brands-test-'));
    writeFileSync(path.join(dir, 'ANGELO FALCONI.png'), '');
    writeFileSync(path.join(dir, 'jean-de-paris.jpg'), '');
    writeFileSync(path.join(dir, 'linea_vigo.webp'), '');
    writeFileSync(path.join(dir, '.DS_Store'), '');
    writeFileSync(path.join(dir, 'readme.txt'), 'not an image');
    writeFileSync(path.join(dir, '.hidden-logo.png'), '');
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('excludes hidden files and non-image extensions', () => {
    const logos = getBrandLogos(dir);
    const files = logos.map((l) => l.src);
    expect(files.some((f) => f.includes('DS_Store'))).toBe(false);
    expect(files.some((f) => f.includes('readme'))).toBe(false);
    expect(files.some((f) => f.includes('hidden-logo'))).toBe(false);
    expect(logos).toHaveLength(3);
  });

  it('builds a public /marcas URL for each accepted file, URL-encoded', () => {
    const logos = getBrandLogos(dir);
    const angelo = logos.find((l) => l.alt === 'Angelo Falconi');
    expect(angelo?.src).toBe('/marcas/ANGELO%20FALCONI.png');
  });

  it('derives readable alt text: strips extension, dash/underscore -> space, title-cases', () => {
    const logos = getBrandLogos(dir);
    expect(logos.find((l) => l.src.includes('linea_vigo'))?.alt).toBe('Linea Vigo');
  });

  it('applies the exact-spelling override instead of naive title-casing', () => {
    const logos = getBrandLogos(dir);
    // Naive title-case would produce "Jean De Paris" (capital "De") — the
    // override exists specifically to correct that.
    expect(logos.find((l) => l.src.includes('jean-de-paris'))?.alt).toBe('Jean de Paris');
  });

  it('sorts logos alphabetically', () => {
    const logos = getBrandLogos(dir);
    const names = logos.map((l) => l.alt);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
  });

  it('returns an empty list instead of throwing when the directory does not exist', () => {
    expect(getBrandLogos(path.join(dir, 'does-not-exist'))).toEqual([]);
  });

  it('matches the real public/marcas inventory: only real image files, no hidden/system files', () => {
    const logos = getBrandLogos();
    expect(logos.length).toBeGreaterThan(0);
    expect(logos.every((l) => /\.(png|jpe?g|webp|svg)$/i.test(decodeURIComponent(l.src)))).toBe(true);
    expect(logos.some((l) => l.src.includes('DS_Store'))).toBe(false);
  });
});
