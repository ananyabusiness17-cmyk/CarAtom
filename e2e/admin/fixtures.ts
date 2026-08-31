import { test as base, type Page } from '@playwright/test';

const ME = {
  id: '00000000-0000-4000-8000-000000000001',
  role: 'admin',
  phone: '+919800000001',
  full_name: 'Priya',
  phone_verified: true,
  created_at: '2026-08-30T00:00:00.000Z',
};

async function json(page: Page, url: string, body: unknown, method?: string) {
  await page.route(url, async (route) => {
    if (method && route.request().method() !== method) {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}

export const test = base.extend<{ desk: Page }>({
  desk: async ({ page }, use) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('caratom_e2e_token', 'e2e-token');
    });
    await json(page, '**/v1/me', ME);
    await page.route('http://127.0.0.1:8000/v1/admin/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      });
    });
    await json(page, '**/v1/admin/inventory/skus**', {
      items: [
        {
          id: 'sku-r134',
          sku_code: 'R134A-250',
          name: 'R134a gas 250g',
          unit: 'each',
          stock_by_location: { WH: 4, VAN_A: 1 },
          total_quantity: 5,
          low_stock_threshold: 8,
          is_low_stock: true,
          is_active: true,
        },
      ],
      low_stock_count: 2,
    });
    await json(page, '**/v1/admin/catalog/overview', {
      offerings: [
        {
          slug: 'general-service-health-report',
          name: 'Health report',
          display_price_minor: 299900,
          display_label: '₹2,999',
          kind: 'GS',
          is_active: true,
          version: 1,
          duration_minutes: 120,
          flow_policy: 'GS',
        },
        {
          slug: 'one-man-ac-gas-topup',
          name: 'One-man',
          display_price_minor: 39900,
          display_label: '₹399',
          kind: 'ONE_MAN',
          is_active: true,
          version: 1,
        },
      ],
      parts_advance_percent: 50,
      second_vehicle_discount_percent: 10,
      note: 'Customer app reads these live. No hardcoded prices.',
    });
    await json(page, '**/v1/admin/people**', {
      items: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          kind: 'customer',
          display_name: 'Rajesh Kumar',
          masked_phone: '+91••••3210',
          subtitle: '3 jobs · City + Creta',
        },
      ],
    });
    await json(page, '**/v1/admin/customers/**', {
      id: '11111111-1111-4111-8111-111111111111',
      full_name: 'Rajesh Kumar',
      masked_phone: '+91••••3210',
      is_disabled: false,
      vehicles: [{ id: 'veh-1', label: 'City 2019' }],
      recent_jobs: [],
    });
    await json(page, '**/v1/admin/inventory/job-usage/**', {
      job_card_id: 'job-1045',
      job_card_ref: 'JC-1045',
      items: [],
    });
    await json(page, '**/v1/admin/job-cards**', {
      items: [
        {
          id: 'job-1042',
          public_ref: 'JC-1042',
          customer_name: 'Rajesh Kumar',
          status: 'INSPECTING',
          technician_name: 'Imran',
          locality: 'Koramangala',
          updated_at: '2026-08-30T06:00:00.000Z',
        },
      ],
    });
    await json(page, '**/v1/admin/notifications/outbox**', {
      items: [
        {
          id: 'obx-dead-1',
          channel: 'sms',
          event_type: 'slot_confirmed',
          status: 'DEAD_LETTER',
          attempt_count: 8,
          last_error_code: 'PROVIDER_TIMEOUT',
          last_error_message: 'Timed out',
          created_at: '2026-08-30T06:00:00.000Z',
          available_at: '2026-08-30T06:00:00.000Z',
          payload: { to_e164: '***3210' },
          notification_id: 'n-1',
        },
      ],
      next_cursor: null,
    });
    await json(page, '**/v1/admin/audit-logs**', {
      items: [
        {
          id: 'aud-1',
          created_at: '2026-08-30T06:10:00.000Z',
          actor_display_name: 'Priya',
          actor_role: 'admin',
          command: 'override.FORCE_STATUS',
          resource_type: 'job_card',
          resource_id: 'job-1042',
          reason: 'Agreed condenser on WhatsApp',
          request_id: 'req-1',
        },
      ],
    });
    await use(page);
  },
});

export { expect } from '@playwright/test';
