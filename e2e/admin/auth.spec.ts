import { test, expect } from '@playwright/test';
import { readE2eFixtures } from '../fixtures/test-data';
import { loginAsAdmin, logout } from '../fixtures/login';

// Flujos 18-23: login por correo, login por username, contraseña
// incorrecta, logout, acceso anónimo redirigido, restricción ADMIN/SUPERADMIN.
test('inicia sesión con correo', async ({ page }) => {
  const { superadmin } = await readE2eFixtures();
  await loginAsAdmin(page, superadmin.email, superadmin.password);
  await expect(page.getByRole('navigation', { name: 'Navegación del panel' })).toBeVisible();
});

test('inicia sesión con nombre de usuario', async ({ page }) => {
  const { superadmin } = await readE2eFixtures();
  await loginAsAdmin(page, superadmin.username, superadmin.password);
  await expect(page.getByRole('navigation', { name: 'Navegación del panel' })).toBeVisible();
});

test('rechaza una contraseña incorrecta con un mensaje genérico y accesible', async ({ page }) => {
  const { superadmin } = await readE2eFixtures();
  await page.goto('/admin');
  await page.locator('#login-identifier').fill(superadmin.email);
  await page.locator('#login-password').fill('contraseña-incorrecta-a-proposito');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page.getByText('Correo/usuario o contraseña incorrectos.')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegación del panel' })).not.toBeVisible();
});

test('cierra sesión y vuelve a exigir login', async ({ page }) => {
  const { admin } = await readE2eFixtures();
  await loginAsAdmin(page, admin.email, admin.password);
  await logout(page);

  await expect(page.locator('#login-identifier')).toBeVisible();
  await page.goto('/admin/products');
  await expect(page.locator('#login-identifier')).toBeVisible(); // no valid session left
});

test('el acceso anónimo a una ruta administrativa redirige al login (nunca expone datos)', async ({ page }) => {
  await page.goto('/admin/products');
  await expect(page.locator('#login-identifier')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navegación del panel' })).not.toBeVisible();
});

test('un ADMIN no puede acceder a /admin/users (restringido a SUPERADMIN)', async ({ page }) => {
  const { admin } = await readE2eFixtures();
  await loginAsAdmin(page, admin.email, admin.password);
  await expect(page.getByRole('link', { name: 'Usuarios' })).not.toBeVisible(); // nav hides it too, not just the route guard

  await page.goto('/admin/users');
  await expect(page.getByText('Acceso restringido')).toBeVisible();
});

test('un SUPERADMIN sí puede acceder a /admin/users', async ({ page }) => {
  const { superadmin } = await readE2eFixtures();
  await loginAsAdmin(page, superadmin.email, superadmin.password);
  await page.getByRole('link', { name: 'Usuarios' }).click();
  await expect(page.getByRole('heading', { name: 'Crear usuario administrador' })).toBeVisible();
});
