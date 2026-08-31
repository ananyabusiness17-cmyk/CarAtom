import { expect, test } from './fixtures';

test('undelivered queue loads and retry requires a reason', async ({ desk }) => {
  await desk.route('**/v1/admin/notifications/outbox/obx-dead-1/retry', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'obx-dead-1', status: 'PENDING' }),
    });
  });

  await desk.goto('/notifications/undelivered');
  await expect(desk.getByRole('heading', { name: 'Undelivered notifications' })).toBeVisible();
  await expect(desk.getByRole('cell', { name: 'slot_confirmed' })).toBeVisible();
  await desk.getByRole('cell', { name: 'slot_confirmed' }).click();
  await desk.getByRole('button', { name: 'Retry' }).click();
  await expect(desk.getByRole('dialog')).toBeVisible();
  const confirm = desk.getByRole('button', { name: 'Retry delivery' });
  await expect(confirm).toBeDisabled();
  await desk.getByLabel('Reason').fill('short');
  await expect(confirm).toBeDisabled();
  await desk.getByLabel('Reason').fill('Customer asked us to resend the SMS.');
  await expect(confirm).toBeEnabled();
});
