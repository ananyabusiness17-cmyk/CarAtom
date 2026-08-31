import { Stack } from 'expo-router';

import { colors } from '../../src/theme/tokens';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.brandStrong,
        headerStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Screen name="phone" options={{ title: 'Log in' }} />
      <Stack.Screen name="otp" options={{ title: 'Enter code' }} />
    </Stack>
  );
}
