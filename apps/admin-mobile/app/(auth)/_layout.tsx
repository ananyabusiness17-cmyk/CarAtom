import { Stack } from 'expo-router';

import { colors } from '../../src/theme/tokens';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.textStrong,
        headerStyle: { backgroundColor: colors.canvas },
        contentStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="phone" options={{ title: 'Advisor sign in' }} />
      <Stack.Screen name="otp" options={{ title: 'Enter code' }} />
    </Stack>
  );
}
