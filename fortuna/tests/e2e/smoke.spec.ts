import { expect, test } from '@playwright/test';

test('arranque, nueva partida, compra, catálogo y paso del tiempo', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Fortuna/ })).toBeVisible();
  await page.getByRole('button', { name: /Nueva partida/ }).click();
  await page.getByLabel('Nombre').fill('Prueba');
  await page.getByRole('button', { name: 'Empezar' }).click();

  await expect(page.locator('.console')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.nw-value')).toContainText('600,00');

  // El explorador del catálogo muestra miles de oportunidades.
  const total = Number((await page.locator('.class-total .mono').textContent())?.replace(/\D/g, ''));
  expect(total).toBeGreaterThanOrEqual(5000);
  await page.locator('.class-item', { hasText: 'Préstamos P2P' }).click();
  await page.locator('.catalog-table tbody tr').first().click();
  await expect(page.locator('.inst-title')).toBeVisible();
  await page.locator('.ticket-go').click();
  await expect(page.locator('.toast').first()).toBeVisible();

  // Compra una acción en la bolsa.
  await page.getByRole('button', { name: 'Acciones', exact: true }).click();
  await page.locator('table.data tbody tr').first().click();
  await page.locator('.ticket-go').click();

  // Avanza el tiempo a 1 semana/s y comprueba que el reloj corre y la cartera se llena.
  const before = await page.locator('.clock-date').textContent();
  await page.keyboard.press('4');
  await page.waitForTimeout(3000);
  await page.keyboard.press('Space');
  await expect(page.locator('.clock-date')).not.toHaveText(before ?? '');
  await expect(page.getByRole('button', { name: /^Cartera/ })).toContainText(/[12]/);

  expect(errors).toEqual([]);
});
