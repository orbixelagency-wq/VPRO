import { expect, test } from '@playwright/test';

test('arranque, nueva partida, compra y paso del tiempo', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Fortuna/ })).toBeVisible();
  await page.getByRole('button', { name: /Nueva partida/ }).click();
  await page.getByLabel('Nombre').fill('Prueba');
  await page.getByRole('button', { name: 'Empezar' }).click();

  await expect(page.locator('.console')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.nw-value')).toContainText('600,00');

  // Selecciona una empresa barata y compra una acción.
  await page.locator('table.data tbody tr').first().click();
  await page.locator('.ticket-go').click();
  await expect(page.locator('.toast').first()).toBeVisible();

  // Avanza el tiempo a 1 semana/s y comprueba que el reloj corre.
  const before = await page.locator('.clock-date').textContent();
  await page.keyboard.press('4');
  await page.waitForTimeout(2500);
  await page.keyboard.press('Space');
  await expect(page.locator('.clock-date')).not.toHaveText(before ?? '');
  await expect(page.getByRole('button', { name: /^Cartera/ })).toContainText('1');

  expect(errors).toEqual([]);
});
