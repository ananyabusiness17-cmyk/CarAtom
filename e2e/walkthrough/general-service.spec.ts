import { expect, test } from '@playwright/test';

import { API_BASE, authHeaders, requireApi } from './helpers';

const VEHICLE = {
  make: 'Honda',
  model: 'City',
  year: 2019,
  fuel_type: 'PETROL',
  transmission: 'MANUAL',
};

test.describe('general service gs-01…gs-10', () => {
  test.beforeAll(async ({ request }) => {
    await requireApi(request);
  });

  test('gs-01 catalog home lists general service', async ({ request }) => {
    const response = await request.get(`${API_BASE}/v1/catalog/home`);
    expect([200, 503]).toContain(response.status());
    if (response.status() !== 200) return;
    const body = await response.json();
    expect(body.sections?.general_service || body.hero).toBeTruthy();
  });

  test('gs booking contract when E2E_TOKEN is set', async ({ request }) => {
    const headers = authHeaders();
    test.skip(!headers, 'Set E2E_TOKEN for authenticated gs-02…gs-10');
    const created = await request.post(`${API_BASE}/v1/job-cards`, {
      headers,
      data: {
        service_offering_slug: 'general-service-health-report',
        vehicle_context: VEHICLE,
        concerns: [{ text: 'Want full service and a health report.' }],
      },
    });
    expect(created.status()).toBe(201);
    const jobId = (await created.json()).job_card.id;
    const priced = await request.post(`${API_BASE}/v1/job-cards/${jobId}/price`, { headers });
    expect(priced.ok()).toBeTruthy();
    const price = await priced.json();
    expect(price.flow_decision.advisor_requirement).toBe('NOT_REQUIRED');
    const estimateId = price.estimate.id;
    const accepted = await request.post(
      `${API_BASE}/v1/job-cards/${jobId}/estimates/${estimateId}/accept`,
      {
        headers: { ...headers, 'Idempotency-Key': `wt-gs-accept-${jobId}` },
        data: {
          expected_total_minor: price.estimate.total.amount_minor,
          expected_content_hash: price.estimate.content_hash,
        },
      },
    );
    expect(accepted.ok()).toBeTruthy();
  });
});
