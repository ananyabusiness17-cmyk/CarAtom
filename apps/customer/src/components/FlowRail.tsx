import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/tokens';
import { FLOW_RAIL_LENGTH } from './flowRailSteps';

const GS_STEPS = [
  'Home',
  'Make',
  'Model',
  'Year',
  'Fuel',
  'Job card',
  'Estimate',
  'Details',
  'Slot',
  'Confirmed',
];

const GPR_STEPS = [
  'Home',
  'Repairs',
  'Make',
  'Model',
  'Year',
  'Fuel',
  'Job card',
  'Estimate',
  'Call',
  'Revised',
  'Slot',
  'Confirmed',
];

const ONEMAN_STEPS = ['Home', 'Detail', 'Vehicle', 'Details', 'Slot', 'Confirmed'];

const IR_STEPS = [
  'Offering',
  'Symptoms',
  'Photos',
  'Make',
  'Model',
  'Year',
  'Fuel',
  'Details',
  'Inspection slot',
  'Visit 1',
  'Findings',
  'Estimate',
  'Parts advance',
  'Repair slot',
];

export type FlowRailVariant = 'gs' | 'gpr' | 'oneman' | 'ir';

const STEPS: Record<FlowRailVariant, string[]> = {
  gs: GS_STEPS,
  gpr: GPR_STEPS,
  oneman: ONEMAN_STEPS,
  ir: IR_STEPS,
};

export function FlowRail({
  currentStep,
  variant = 'gs',
}: {
  currentStep: number;
  variant?: FlowRailVariant;
}) {
  const steps = STEPS[variant];
  const total = FLOW_RAIL_LENGTH[variant];
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${currentStep} of ${total}, ${steps[currentStep - 1] ?? ''}`}
    >
      {steps.map((label, index) => {
        const step = index + 1;
        const done = step < currentStep;
        const active = step === currentStep;
        return (
          <View
            key={label}
            style={[styles.dot, done ? styles.done : null, active ? styles.active : null]}
            accessibilityElementsHidden
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  done: { backgroundColor: colors.brandSoft },
  active: { backgroundColor: colors.brand, width: 9, height: 9, borderRadius: 5 },
});
