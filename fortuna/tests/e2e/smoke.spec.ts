import { expect, test } from '@playwright/test';

interface Stats {
  fps: number;
  drawCalls: number;
  district: string;
  position: { x: number; y: number; z: number };
}
declare global {
  interface Window {
    __fortuna?: { stats(): Stats };
  }
}

test.beforeEach(async ({ page }) => {
  // En CI sin GPU se fuerza WebGL2 (render por software); WebGPU se prueba a mano.
  await page.addInitScript(() =>
    localStorage.setItem('fortuna:settings', JSON.stringify({ forceWebGL: true, quality: 'bajo' })),
  );
});

test('arranque, nueva partida, compra, catálogo y paso del tiempo', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Fortuna/ })).toBeVisible();
  await page.getByRole('button', { name: /Nueva partida/ }).click();
  await page.getByLabel('Nombre').fill('Prueba');
  await page.getByRole('button', { name: 'Empezar' }).click();

  // Se aparece en la ciudad: el mundo 3D dibuja y el jugador puede caminar.
  await page.waitForFunction(() => window.__fortuna, null, { timeout: 60_000 });
  await expect(page.locator('.district-banner')).toContainText('Las Grúas');
  const start = await page.evaluate(() => window.__fortuna!.stats());
  expect(start.district).toBe('Las Grúas');
  await page.locator('.world-canvas').focus();
  // La cámara mira al portal: S aleja al jugador hacia la calle y W lo devuelve a la puerta.
  // (Se espera a la posición, no a un tiempo fijo: sin GPU el render va a pocos fps.)
  const walked = async () => {
    const p = (await page.evaluate(() => window.__fortuna!.stats())).position;
    return Math.hypot(p.x - start.position.x, p.z - start.position.z);
  };
  await page.keyboard.down('KeyS');
  await expect.poll(walked, { timeout: 20_000 }).toBeGreaterThan(0.8);
  await page.keyboard.up('KeyS');
  const moved = await page.evaluate(() => window.__fortuna!.stats());
  expect(moved.drawCalls).toBeGreaterThan(50);

  // Delante del portal aparece la acción "Entrar en casa": se entra y se vuelve a salir.
  await page.keyboard.down('KeyW');
  await expect(page.locator('.hud-prompt')).toContainText('Entrar en casa', { timeout: 20_000 });
  await page.keyboard.up('KeyW');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.hud-interior')).toHaveText('Tu piso', { timeout: 10_000 });
  await page.keyboard.down('KeyS');
  await expect(page.locator('.hud-prompt')).toContainText('Salir a la calle', { timeout: 20_000 });
  await page.keyboard.up('KeyS');
  await page.keyboard.press('KeyE');
  await expect(page.locator('.hud-interior')).toHaveCount(0, { timeout: 10_000 });

  // Tab abre la terminal del inversor.
  await page.keyboard.press('Tab');
  await expect(page.locator('.console')).toBeVisible();
  await expect(page.locator('.nw-value')).toContainText('600,00');

  // El explorador del catálogo muestra miles de oportunidades.
  const total = Number(
    (await page.locator('.class-total .mono').textContent())?.replace(/\D/g, ''),
  );
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
