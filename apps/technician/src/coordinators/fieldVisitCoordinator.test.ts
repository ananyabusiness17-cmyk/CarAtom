import type { TechnicianVisitDetail } from '@caratom/contracts';

import { nextRouteForVisit, primaryAction } from './fieldVisitCoordinator';

const inspectionVisit: TechnicianVisitDetail = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  public_ref: 'V-1042-A',
  job_card_ref: 'JC-1042',
  visit_type: 'INSPECTION',
  status: 'ON_SITE',
  scheduled_label: 'Wed 11:00 – 13:00',
  distance_km: 4.2,
  vehicle_label: 'Honda City',
  address_short: 'Koramangala',
  allowed_actions: ['VIEW', 'START_INSPECTION'],
  concerns: null,
  scope_lines: [],
  advisor_note: null,
  customer_name: 'Rajesh',
  customer_phone_masked: '',
  address_full: '',
  parking_notes: null,
  map_preview_url: null,
  tags: [],
};

const serviceVisit: TechnicianVisitDetail = {
  ...inspectionVisit,
  visit_type: 'SERVICE',
  allowed_actions: ['VIEW', 'START_SERVICE'],
};

const repairVisit: TechnicianVisitDetail = {
  ...inspectionVisit,
  visit_type: 'REPAIR',
  allowed_actions: ['VIEW', 'START_SERVICE'],
};

if (!nextRouteForVisit(inspectionVisit).endsWith('/inspection')) {
  throw new Error('Inspection visits must route to the inspection screen');
}
if (!nextRouteForVisit(serviceVisit).endsWith('/service')) {
  throw new Error('Service visits must route to the service screen');
}
if (!nextRouteForVisit(repairVisit).endsWith('/service')) {
  throw new Error('Repair visits must route to the service screen');
}
if (primaryAction({ allowed_actions: ['VIEW', 'COMPLETE', 'CHECK_IN'] }) !== 'CHECK_IN') {
  throw new Error('CHECK_IN must win CTA priority');
}
console.log('fieldVisitCoordinator OK');
