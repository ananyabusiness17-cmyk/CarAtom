import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { leaveStack, type BackCapableNav } from '../lib/stackBack';
import { colors } from '../theme/tokens';

export function StackBackButton({ navigation }: { navigation: BackCapableNav }) {
  const router = useRouter();
  const onBack = useCallback(() => {
    leaveStack(navigation, (href) => router.replace(href));
  }, [navigation, router]);

  return (
    <Pressable
      onPress={onBack}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={8}
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
  },
});
