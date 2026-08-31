import { CatalogHomeResponseSchema, type CatalogHomeResponse } from '@caratom/contracts';

import { colors } from '../theme/tokens';

import { presentationForTab, priceLabelFromOffering, tabAccentColor } from './homeContent';
import { assertGlossary, MODE_TABS } from './modeTabs';

const catalogFixture: CatalogHomeResponse = CatalogHomeResponseSchema.parse({
  service_area: {
    slug: 'koramangala-bengaluru',
    name: 'Koramangala, Bengaluru',
    serviceable: true,
  },
  hero: {
    blocks: [
      { tab: 'general', kicker: 'General service · doorstep', title: 'Full service + health report' },
    ],
  },
  sections: {
    general_service: {
      offering: {
        slug: 'general-service-health-report',
        name: 'General servicing + health report',
        flow_policy: 'GENERAL_SERVICE',
        display_price: { amount_minor: 299900, currency: 'INR', label: 'From ₹2,999' },
        duration_minutes: 120,
        included_items: [
          'Engine oil & filter',
          'Air filter check',
          'Fluid top-up',
          '30-point health report',
        ],
        policy_note: 'Estimate before slot · no add-ons · no advisor call',
      },
    },
    service_repair_entry: {
      offering_slug: 'general-service-health-report',
      policy_note_warn: 'Add repairs → callback → accept on app before slot',
      cta_label: 'Select repairs / replacements',
    },
    one_man_jobs: [
      {
        slug: 'wiper-blades',
        name: 'Wiper blades',
        flow_policy: 'ONE_MAN',
        display_price: { amount_minor: 49900, currency: 'INR' },
        duration_minutes: 30,
      },
    ],
    sos: {
      headline: 'Emergency · not scheduled service',
      tiles: [
        { id: 'call_ops', label: 'Call ops' },
        { id: 'flat_tyre', label: 'Flat tyre' },
        { id: 'dead_battery', label: 'Dead battery' },
        { id: 'tow', label: 'Tow' },
      ],
    },
  },
  trust_strip: [{ icon_key: 'van', label: 'Van at your door' }],
  search_placeholder: 'Search make, model or plate (optional)',
});

assertGlossary();

if (MODE_TABS.length !== 4) {
  throw new Error('Home must render four mode tabs');
}

if (MODE_TABS[0]?.label !== 'General service + repair') {
  throw new Error('Expected General service + repair first');
}

const general = presentationForTab('general', catalogFixture);
const repair = presentationForTab('repair', catalogFixture);
const sos = presentationForTab('sos', catalogFixture);

if (priceLabelFromOffering(catalogFixture) !== 'From ₹2,999') {
  throw new Error('gs-01 package card must show mocked API price');
}

if (general.policyNote === repair.policyNote) {
  throw new Error('Switching tabs must show different policy notes');
}

if (repair.policyTone !== 'warn') {
  throw new Error('General service + repair uses the warn policy note');
}

if (tabAccentColor('sos') !== colors.sosAccent || sos.tabAccent !== colors.sosAccent) {
  throw new Error('SOS tab must use sosAccent, not brand');
}

if (tabAccentColor('general') !== colors.brand) {
  throw new Error('Non-SOS tabs use brand accent');
}

if ('flow_policy' in general) {
  throw new Error('Tab presentation must not expose or infer flow_policy');
}

if (JSON.stringify(MODE_TABS).toLowerCase().includes('inspect')) {
  throw new Error('Forbidden Inspect + repair label');
}

console.log('homeContent catalog + glossary OK');
