import { Stack } from 'expo-router';

import { colors } from '../../src/theme/tokens';

export default function InspectionRepairLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.textStrong,
        headerStyle: { backgroundColor: colors.canvas },
        contentStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="offering" options={{ title: 'Inspection + repair' }} />
      <Stack.Screen name="symptoms" options={{ title: 'Symptoms' }} />
      <Stack.Screen name="photos" options={{ title: 'Photos' }} />
    </Stack>
  );
}
