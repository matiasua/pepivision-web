import { readdirSync } from 'node:fs';
import path from 'node:path';

const BRANDS_DIR = path.join(process.cwd(), 'public', 'marcas');
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);

// Exact commercial spelling for brands where the generic algorithm below
// (strip extension, dash/underscore -> space, then title-case each word)
// would get it wrong — e.g. a French-style lowercase preposition. Keyed by
// the normalized (lowercased) filename stem from toAltText, so it's easy
// to see which file each override matches.
const ALT_TEXT_OVERRIDES: Record<string, string> = {
  'jean de paris': 'Jean de Paris',
};

function toAltText(fileStem: string): string {
  const normalized = fileStem
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  const override = ALT_TEXT_OVERRIDES[normalized.toLowerCase()];
  if (override) return override;

  return normalized
    .toLowerCase()
    .split(' ')
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export interface BrandLogo {
  src: string;
  alt: string;
}

/**
 * Reads public/marcas/ on the server and builds a typed, alphabetically
 * sorted logo manifest — adding a brand later only requires dropping its
 * file in that folder, no code change here. Hidden files (.DS_Store, etc.)
 * and anything that isn't a recognized image extension are skipped.
 *
 * `dir` defaults to the real public/marcas path; overridable only so
 * tests can point it at a controlled fixture directory.
 */
export function getBrandLogos(dir: string = BRANDS_DIR): BrandLogo[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }

  return entries
    .filter((name) => !name.startsWith('.'))
    .filter((name) => ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((name) => ({
      src: `/marcas/${encodeURIComponent(name)}`,
      alt: toAltText(path.parse(name).name),
    }));
}
