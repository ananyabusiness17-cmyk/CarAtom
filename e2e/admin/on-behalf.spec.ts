import { expect, test } from './fixtures';

test('on-behalf booking wizard creates a job', async ({ desk }) => {
  await desk.route('**/v1/admin/bookings/on-behalf', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        job_card_id: 'job-1045',
        public_ref: 'JC-1045',
        booking_id: 'bk-1',
        audit_id: 'aud-book',
      }),
    });
  });
  await desk.route('**/v1/admin/job-cards/job-1045', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        job_card: {
          id: 'job-1045',
          public_ref: 'JC-1045',
          status: 'BOOKED',
          flow_policy: 'ONE_MAN',
          vehicle_context: {
            make: 'Honda',
            model: 'City',
            year: 2019,
            fuel_type: 'PETROL',
            transmission: 'MANUAL',
          },
          items: [],
          concerns: [],
        },
        customer_name: 'Rajesh Kumar',
        flow_decision: {
          policy: 'ONE_MAN',
          advisor_requirement: 'NONE',
          estimate_requirement: 'NONE',
          required_next_action: 'WAIT',
          allowed_actions: [],
        },
      }),
    });
  });

  await desk.goto('/book');
  await expect(desk.getByRole('heading', { name: 'Book for customer' })).toBeVisible();
  await desk.getByRole('button', { name: /Rajesh Kumar/ }).click();
  await desk.getByRole('button', { name: 'Continue' }).click();
  await desk.getByRole('button', { name: 'Continue' }).click();
  await desk.getByRole('button', { name: 'Continue' }).click();
  await desk.getByRole('button', { name: '09:00' }).click();
  await desk.getByRole('button', { name: 'Continue' }).click();
  await desk.getByRole('button', { name: 'Create JC-1045' }).click();
  await expect(desk.getByText('Created JC-1045 · audit aud-book')).toBeVisible();
});
