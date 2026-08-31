import { Stack } from 'expo-router';

import { colors } from '../../src/theme/tokens';

export default function AddressesLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.textStrong,
        headerStyle: { backgroundColor: colors.canvas },
        contentStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Addresses' }} />
    </Stack>
  );
}
