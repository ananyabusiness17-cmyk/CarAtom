import { FLOW_RAIL_LENGTH } from './flowRailSteps';

if (FLOW_RAIL_LENGTH.gs !== 10) {
  throw new Error(`General service rail must stay at 10 dots, got ${FLOW_RAIL_LENGTH.gs}`);
}

if (FLOW_RAIL_LENGTH.gpr !== 12) {
  throw new Error(`Service + repair rail must be 12 dots, got ${FLOW_RAIL_LENGTH.gpr}`);
}

if (FLOW_RAIL_LENGTH.oneman !== 6) {
  throw new Error(`One-man rail must be 6 dots, got ${FLOW_RAIL_LENGTH.oneman}`);
}

if (FLOW_RAIL_LENGTH.ir !== 14) {
  throw new Error(`Inspection + repair rail must be 14 dots, got ${FLOW_RAIL_LENGTH.ir}`);
}

console.log('FlowRail variants OK');
