import { expect, test } from '@playwright/test';

import { API_BASE, authHeaders, requireApi } from './helpers';

test.describe('one-man om-01…om-06 and SOS sos-01…sos-04', () => {
  test.beforeAll(async ({ request }) => {
    await requireApi(request);
  });

  test('om catalog home is reachable', async ({ request }) => {
    const response = await request.get(`${API_BASE}/v1/catalog/home`);
    expect([200, 503]).toContain(response.status());
  });

  test('om booking when E2E_TOKEN is set', async ({ request }) => {
    const headers = authHeaders();
    test.skip(!headers, 'Set E2E_TOKEN for authenticated one-man walkthrough');
    const created = await request.post(`${API_BASE}/v1/job-cards`, {
      headers,
      data: {
        service_offering_slug: 'bulb-headlight',
        vehicle_context: {
          make: 'Honda',
          model: 'City',
          year: 2019,
          fuel_type: 'PETROL',
          transmission: 'MANUAL',
        },
      },
    });
    expect(created.status()).toBe(201);
    const flow = (await created.json()).flow_decision;
    expect(flow.advisor_requirement).toBe('NOT_REQUIRED');
  });

  test('sos ticket does not create a job card when E2E_TOKEN is set', async ({ request }) => {
    const headers = authHeaders();
    test.skip(!headers, 'Set E2E_TOKEN for authenticated SOS walkthrough');
    const created = await request.post(`${API_BASE}/v1/support-tickets`, {
      headers: { ...headers, 'Idempotency-Key': `wt-sos-${Date.now()}` },
      data: {
        ticket_type: 'ROADSIDE',
        issue_code: 'FLAT_TYRE',
        issue_label: 'Flat tyre',
        latitude: 12.9352,
        longitude: 77.6245,
        location_label: 'Koramangala',
      },
    });
    expect(created.status()).toBe(201);
    const body = await created.json();
    expect(body.job_card_id ?? body.ticket?.job_card_id ?? null).toBeFalsy();
  });
});
