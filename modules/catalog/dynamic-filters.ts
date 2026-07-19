// Fase 12 (redesign-extensible-catalog-v2 — filtros dinámicos del
// catálogo): único constructor/parser de filtros por atributo de
// categoría (`CategoryAttributeDefinition`). La allowlist de query params
// aceptados se re-deriva en cada request exclusivamente desde las
// definiciones `active && filterable` de la categoría resuelta — nunca
// desde una lista declarada por el cliente ni cacheada entre requests.
// Ver specs/dynamic-catalog-filters/spec.md.
import type { CategoryAttributeType } from '@prisma/client';

/** Todo query param de un atributo dinámico usa este prefijo — evita que
 * una `key` administrable (p. ej. "color") choque con un filtro común ya
 * existente (`color`, `brand`, `q`, etc.). */
export const DYNAMIC_FILTER_PREFIX = 'attr_';

const MAX_MULTISELECT_VALUES = 20;
const MAX_VALUE_LENGTH = 120;
const MAX_RANGE_VALUE = 100_000_000;

export interface CategoryAttributeDefinitionLike {
  id: string;
  key: string;
  label: string;
  type: CategoryAttributeType;
  options: unknown;
  sortOrder: number;
  active: boolean;
  filterable: boolean;
}

export type FilterableAttributeDefinition = Pick<
  CategoryAttributeDefinitionLike,
  'id' | 'key' | 'label' | 'type' | 'options' | 'sortOrder'
>;

// Fase 12 (cierre operativo): TEXT/NUMBER se rechazan como `filterable`
// en el punto de escritura (category-attribute-schemas.ts), pero esta
// lista también los excluye aquí, fail-closed — una fila legada o
// escrita por otra vía nunca debe producir un filtro público sin control
// de UI ("filterable: true pero sin control público" nunca es un estado
// alcanzable de cara al catálogo).
const NEVER_FILTERABLE_TYPES: CategoryAttributeType[] = ['TEXT', 'NUMBER'];

/** Solo las definiciones activas y marcadas `filterable` participan del catálogo público — nunca las inactivas, las solo-informativas (`visibleInDetail` pero no `filterable`), ni TEXT/NUMBER. */
export function selectFilterableAttributes(definitions: CategoryAttributeDefinitionLike[]): FilterableAttributeDefinition[] {
  return definitions
    .filter((d) => d.active && d.filterable && !NEVER_FILTERABLE_TYPES.includes(d.type))
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ id, key, label, type, options, sortOrder }) => ({ id, key, label, type, options, sortOrder }));
}

export function parseAttributeOptionsList(options: unknown): string[] | null {
  if (!Array.isArray(options)) return null;
  return options.filter((o): o is string => typeof o === 'string');
}

export interface ResolvedAttributeFilter {
  attributeDefinitionId: string;
  key: string;
  type: CategoryAttributeType;
  /** SELECT (siempre 1) / MULTI_SELECT (1+, semántica OR) / TEXT (siempre 1, coincidencia exacta). */
  values?: string[];
  numberValue?: number;
  booleanValue?: boolean;
  rangeMin?: number;
  rangeMax?: number;
}

type SearchParamsInput = Record<string, string | string[] | undefined>;

function valuesOf(raw: string | string[] | undefined): string[] {
  if (raw === undefined) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function parseFiniteNonNegative(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > MAX_RANGE_VALUE) return undefined;
  return value;
}

/**
 * Único parser de filtros dinámicos (12.1/12.3). Tolerante por diseño,
 * igual que `parseCatalogFilters`: cualquier query param que no calce con
 * ninguna definición activa/filtrable de esta categoría, o cuyo valor no
 * calce con el tipo esperado, se descarta silenciosamente — nunca lanza,
 * nunca rompe la página. Devuelve filtros ya resueltos por
 * `attributeDefinitionId`, nunca por la `key` cruda del query param.
 */
export function parseDynamicFilters(
  definitions: FilterableAttributeDefinition[],
  searchParams: SearchParamsInput
): ResolvedAttributeFilter[] {
  const resolved: ResolvedAttributeFilter[] = [];

  for (const def of definitions) {
    const paramKey = `${DYNAMIC_FILTER_PREFIX}${def.key}`;

    if (def.type === 'RANGE') {
      const min = parseFiniteNonNegative(valuesOf(searchParams[`${paramKey}_min`])[0]);
      const max = parseFiniteNonNegative(valuesOf(searchParams[`${paramKey}_max`])[0]);
      if (min === undefined && max === undefined) continue;
      if (min !== undefined && max !== undefined && min > max) continue; // mínimo > máximo: se descarta el filtro completo, no rompe la página
      resolved.push({ attributeDefinitionId: def.id, key: def.key, type: def.type, rangeMin: min, rangeMax: max });
      continue;
    }

    const raw = searchParams[paramKey];
    if (raw === undefined) continue;

    if (def.type === 'BOOLEAN') {
      if (valuesOf(raw)[0] !== '1') continue; // solo "activado" es representable; ausencia = no filtra
      resolved.push({ attributeDefinitionId: def.id, key: def.key, type: def.type, booleanValue: true });
      continue;
    }

    if (def.type === 'NUMBER') {
      const value = parseFiniteNonNegative(valuesOf(raw)[0]);
      if (value === undefined) continue;
      resolved.push({ attributeDefinitionId: def.id, key: def.key, type: def.type, numberValue: value });
      continue;
    }

    // SELECT / MULTI_SELECT / TEXT: uno o varios valores string,
    // deduplicados, acotados en cantidad y longitud, y — cuando la
    // definición declara `options` — restringidos a esa lista cerrada.
    const allowedOptions = parseAttributeOptionsList(def.options);
    const deduped = Array.from(
      new Set(
        valuesOf(raw)
          .map((v) => v.trim())
          .filter((v) => v.length > 0 && v.length <= MAX_VALUE_LENGTH)
      )
    ).slice(0, MAX_MULTISELECT_VALUES);
    const filtered = allowedOptions ? deduped.filter((v) => allowedOptions.includes(v)) : deduped;

    if (def.type === 'SELECT' && filtered.length > 1) {
      // SELECT es de valor único — más de uno en la URL es una URL
      // corrupta/manipulada: se descarta el filtro completo en vez de
      // adivinar cuál de los valores usar.
      continue;
    }
    if (filtered.length === 0) continue;
    resolved.push({ attributeDefinitionId: def.id, key: def.key, type: def.type, values: filtered });
  }

  return resolved;
}
