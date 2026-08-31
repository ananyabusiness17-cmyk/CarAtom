import { Stack } from 'expo-router';

import { colors } from '../../src/theme/tokens';

export default function SosLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.textStrong,
        headerStyle: { backgroundColor: colors.canvas },
        contentStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="pick" options={{ title: 'Roadside help' }} />
      <Stack.Screen name="active" options={{ title: 'Calling ops' }} />
      <Stack.Screen name="dispatched" options={{ title: 'Help dispatched' }} />
    </Stack>
  );
}
