import type { Page } from '@playwright/test';

/**
 * Fase 10 (cotizador configurable): las opciones del wizard son
 * radio/checkbox reales dentro de un `<label>` — cada input declara
 * `aria-label={title}` explícitamente (el título visible, sin la
 * descripción) precisamente para que esto funcione sin ambigüedad, incluso
 * entre labels que se solapan (p. ej. "No" vs. "No estoy seguro").
 */
export async function clickWizardChoice(page: Page, titleText: string) {
  await page.getByRole('radio', { name: titleText, exact: true }).click();
}

/** Igual que clickWizardChoice pero para pasos de selección múltiple (tratamientos/opciones adicionales). */
export async function toggleWizardOption(page: Page, titleText: string) {
  await page.getByRole('checkbox', { name: titleText, exact: true }).click();
}
