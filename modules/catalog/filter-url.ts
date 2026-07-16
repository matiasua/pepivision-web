/** Builds the `basePath` href for toggling a single filter param, preserving the others — `basePath` is category-scoped (`/catalogo/[categorySlug]`), never hardcoded per component. */
export function buildFilterHref(basePath: string, currentParams: URLSearchParams, key: string, value: string | null): string {
  const next = new URLSearchParams(currentParams);
  if (value === null) {
    next.delete(key);
  } else {
    next.set(key, value);
  }
  const query = next.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** Toggles a single-value filter: clicking the already-active option clears it. */
export function buildToggleHref(basePath: string, currentParams: URLSearchParams, key: string, value: string): string {
  const isActive = currentParams.get(key) === value;
  return buildFilterHref(basePath, currentParams, key, isActive ? null : value);
}
