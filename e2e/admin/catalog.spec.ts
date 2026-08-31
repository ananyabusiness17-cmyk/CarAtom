import { expect, test } from './fixtures';

test('catalog price save patches the offering', async ({ desk }) => {
  await desk.route('**/v1/admin/catalog/offerings/general-service-health-report', async (route) => {
    if (route.request().method() !== 'PATCH') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        slug: 'general-service-health-report',
        display_price_minor: 319900,
        version: 2,
        effective_at: '2026-08-30T06:00:00.000Z',
        audit_id: 'aud-cat',
      }),
    });
  });

  await desk.goto('/catalog');
  await expect(desk.getByRole('heading', { name: 'Catalog' })).toBeVisible();
  await expect(desk.getByText('Health report')).toBeVisible();
  await desk.getByRole('link', { name: 'Health report' }).click();
  await desk.getByLabel('Display price (₹)').fill('3199');
  await desk.getByRole('button', { name: 'Save changes' }).click();
  await expect(desk.getByRole('heading', { name: 'Catalog' })).toBeVisible();
});
