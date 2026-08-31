import { expect, test } from '../admin/fixtures';

test('admin web ops: inventory → override → audit', async ({ desk }) => {
  await desk.route('**/v1/admin/inventory/movements', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        movement_id: 'mov-wt',
        sku_id: 'sku-r134',
        stock_by_location: { WH: 14, VAN_A: 1 },
        total_quantity: 15,
        audit_id: 'aud-recv',
      }),
    });
  });
  await desk.route('**/v1/admin/job-cards/job-1042/override', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        job_card: { id: 'job-1042', public_ref: 'JC-1042', status: 'COMPLETED' },
        audit_id: 'aud-over',
      }),
    });
  });

  await desk.goto('/inventory');
  await expect(desk.getByRole('heading', { name: 'Inventory' })).toBeVisible();
  await desk.getByRole('link', { name: 'Receive stock' }).click();
  await expect(desk.getByRole('heading', { name: 'Receive stock' })).toBeVisible();

  await desk.goto('/jobs/job-1042/override');
  await expect(desk.getByText('Omnipotent · reason required · audit log')).toBeVisible();
  await desk.getByRole('button', { name: 'Force status → invoiced' }).click();
  await desk.getByRole('button', { name: 'Apply override' }).click();
  await expect(desk.getByText('Applied.')).toBeVisible();
  await desk.getByRole('link', { name: 'Open audit' }).click();
  await expect(desk).toHaveURL(/\/audit/);
  await expect(desk.getByRole('heading', { name: 'Audit log' })).toBeVisible();
});
