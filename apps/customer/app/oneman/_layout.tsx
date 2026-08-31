import { Stack } from 'expo-router';

import { colors } from '../../src/theme/tokens';

export default function OneManLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.textStrong,
        headerStyle: { backgroundColor: colors.canvas },
        contentStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="vehicle" options={{ title: 'Your vehicle' }} />
    </Stack>
  );
}
