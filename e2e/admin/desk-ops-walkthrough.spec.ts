import { expect, test } from './fixtures';

test('desk ops path: inventory then override audit', async ({ desk }) => {
  await desk.goto('/inventory');
  await expect(desk.getByRole('heading', { name: 'Inventory' })).toBeVisible();
  await desk.goto('/jobs/job-1042/override');
  await expect(desk.getByText('Omnipotent · reason required · audit log')).toBeVisible();
});
