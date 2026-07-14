import type { Page } from '@playwright/test';

/** Drives the real /admin login form (LoginCard) — never bypasses it via a direct cookie injection. */
export async function loginAsAdmin(page: Page, identifier: string, password: string) {
  await page.goto('/admin');
  await page.locator('#login-identifier').fill(identifier);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL('**/admin');
  await page.getByRole('navigation', { name: 'Navegación del panel' }).waitFor();
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.waitForURL('**/admin');
}
