import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { useFlowBack } from '../hooks/useFlowBack';
import { colors } from '../theme/tokens';

export function StackBackButton() {
  const onBack = useFlowBack();

  return (
    <Pressable
      onPress={onBack}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={12}
      style={styles.hit}
    >
      <Ionicons name="chevron-back" size={28} color={colors.textStrong} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
    zIndex: 2,
  },
});
