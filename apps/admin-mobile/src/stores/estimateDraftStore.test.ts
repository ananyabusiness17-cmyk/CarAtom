import type { AdminJobCard } from '@caratom/contracts';

import { DEMO_PUBLISH_LINES, linesFromAdminJob } from './estimateDraftStore';

function job(partial: Partial<AdminJobCard['job_card']> & { items?: AdminJobCard['job_card']['items'] }): AdminJobCard {
  return {
    job_card: {
      id: 'jc-1',
      public_ref: 'JC-1',
      status: 'ADVISOR_REQUIRED',
      flow_policy: 'GENERAL_SERVICE',
      vehicle_context: { make: 'Hyundai', model: 'Creta', year: 2021, fuel_type: 'PETROL', transmission: 'MANUAL' },
      items: partial.items ?? [],
      concerns: [],
      ...partial,
    },
    customer_name: 'Ananya',
    flow_decision: {
      policy: 'GENERAL_SERVICE',
      advisor_requirement: 'REQUIRED_NOW',
      estimate_requirement: 'REQUIRED',
      required_next_action: 'WAIT_ADVISOR',
      allowed_actions: [],
      blocking_reasons: [],
    },
  };
}

const fromItems = linesFromAdminJob(
  job({
    items: [
      {
        id: 'item-1',
        kind: 'SERVICE',
        label: 'General service',
        unit_price_minor: 299900,
        currency: 'INR',
      },
      {
        id: 'item-2',
        kind: 'REPAIR',
        label: 'AC gas refill',
        unit_price_minor: 150000,
        currency: 'INR',
        repair_offering_slug: 'ac-gas-refill',
      },
    ],
  }),
);

if (fromItems.length !== 2) throw new Error('should map job items');
if (fromItems[1]?.repair_offering_slug !== 'ac-gas-refill') throw new Error('keep repair slug');
if (fromItems[1]?.amount_minor !== 150000) throw new Error('use unit_price_minor');
if (JSON.stringify(fromItems) === JSON.stringify(DEMO_PUBLISH_LINES)) {
  throw new Error('must not equal walkthrough demo lines');
}

const fromEstimate = linesFromAdminJob({
  ...job({
    items: [
      {
        id: 'ignored',
        kind: 'SERVICE',
        label: 'Should not win',
        unit_price_minor: 1,
        currency: 'INR',
      },
    ],
  }),
  submitted_estimate: {
    id: 'est-1',
    version: 1,
    status: 'READY',
    total: { amount_minor: 50000, currency: 'INR' },
    content_hash: 'abc',
    line_items: [
      { label: 'Labour', amount_minor: 50000, kind: 'LABOUR', is_included: false },
    ],
  },
});

if (fromEstimate.length !== 1 || fromEstimate[0]?.label !== 'Labour') {
  throw new Error('submitted estimate lines win over job items');
}

const empty = linesFromAdminJob(job({ items: [] }));
if (empty.length !== 0) throw new Error('empty job has no draft lines');

console.log('estimateDraftStore helpers OK');
