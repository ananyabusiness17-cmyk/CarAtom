import { StyleSheet, View } from 'react-native';

import { FIELD_VISIT_RAIL_LENGTH, FIELD_VISIT_STEPS } from '../coordinators/fieldVisitCoordinator';
import { colors } from '../theme/tokens';

export function FlowRail({ currentStep }: { currentStep: number }) {
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${currentStep} of ${FIELD_VISIT_RAIL_LENGTH}, ${FIELD_VISIT_STEPS[currentStep - 1] ?? ''}`}
    >
      {FIELD_VISIT_STEPS.map((label, index) => {
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
