import { expect, test } from './fixtures';

test('inventory receive posts a movement and returns to the grid', async ({ desk }) => {
  await desk.route('**/v1/admin/inventory/movements', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        movement_id: 'mov-1',
        sku_id: 'sku-r134',
        stock_by_location: { WH: 14, VAN_A: 1 },
        total_quantity: 15,
        audit_id: 'aud-recv',
      }),
    });
  });

  await desk.goto('/inventory');
  await expect(desk.getByRole('heading', { name: 'Inventory' })).toBeVisible();
  await expect(desk.getByText('2 low stock')).toBeVisible();
  await desk.getByRole('link', { name: 'Receive stock' }).click();
  await expect(desk).toHaveURL(/\/inventory\/receive/);
  await expect(desk.getByRole('heading', { name: 'Receive stock' })).toBeVisible();
  await desk.locator('select').first().selectOption('sku-r134');
  await desk.getByRole('button', { name: 'Receive stock' }).click();
  await expect(desk.getByRole('heading', { name: 'Inventory' })).toBeVisible();
});
