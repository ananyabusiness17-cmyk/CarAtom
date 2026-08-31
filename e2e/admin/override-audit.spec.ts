import { expect, test } from './fixtures';

test('override writes an audit row', async ({ desk }) => {
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

  await desk.goto('/jobs/job-1042/override');
  await expect(desk.getByText('Omnipotent · reason required · audit log')).toBeVisible();
  await desk.getByRole('button', { name: 'Force status → invoiced' }).click();
  await desk.getByRole('button', { name: 'Apply override' }).click();
  await expect(desk.getByText('Applied.')).toBeVisible();
  await desk.getByRole('link', { name: 'Open audit' }).click();
  await expect(desk).toHaveURL(/\/audit/);
  await expect(desk.getByRole('heading', { name: 'Audit log' })).toBeVisible();
  await expect(desk.getByText('override.FORCE_STATUS')).toBeVisible();
});
