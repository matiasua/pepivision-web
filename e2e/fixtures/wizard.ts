import type { Page } from '@playwright/test';

/**
 * QuoteWizard's choice buttons render a title + subtitle as two separate
 * `<div>`s inside one `<button>` — their combined text becomes the
 * button's accessible name (e.g. "MonofocalUna sola distancia"), so a
 * plain `getByRole('button', { name: 'Monofocal', exact: true })` never
 * matches. Locating by the exact text of just the title `<div>` (which the
 * subtitle never shares, even for overlapping labels like "No" vs. "No
 * estoy seguro") and clicking its ancestor `<button>` is what actually
 * works, and works consistently for every step's choice buttons.
 */
export async function clickWizardChoice(page: Page, titleText: string) {
  await page.getByText(titleText, { exact: true }).locator('xpath=ancestor::button[1]').click();
}
