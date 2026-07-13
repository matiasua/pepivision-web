/** Builds the /catalogo href for toggling a single filter param, preserving the others. */
export function buildFilterHref(currentParams: URLSearchParams, key: string, value: string | null): string {
  const next = new URLSearchParams(currentParams);
  if (value === null) {
    next.delete(key);
  } else {
    next.set(key, value);
  }
  const query = next.toString();
  return query ? `/catalogo?${query}` : '/catalogo';
}

/** Toggles a single-value filter: clicking the already-active option clears it. */
export function buildToggleHref(currentParams: URLSearchParams, key: string, value: string): string {
  const isActive = currentParams.get(key) === value;
  return buildFilterHref(currentParams, key, isActive ? null : value);
}
