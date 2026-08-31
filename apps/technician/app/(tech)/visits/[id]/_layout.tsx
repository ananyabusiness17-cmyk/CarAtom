import { Stack } from 'expo-router';

import { colors } from '../../../../src/theme/tokens';

export default function VisitLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.textStrong,
        headerStyle: { backgroundColor: colors.canvas },
        contentStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Job' }} />
      <Stack.Screen name="navigate" options={{ title: 'Navigate', headerBackTitle: 'Job' }} />
      <Stack.Screen name="inspection" options={{ title: 'Inspection' }} />
      <Stack.Screen name="service" options={{ title: 'Service visit' }} />
      <Stack.Screen name="parts" options={{ title: 'Parts fitted' }} />
      <Stack.Screen name="exception" options={{ title: 'Raise exception' }} />
      <Stack.Screen name="qc" options={{ title: 'QC' }} />
    </Stack>
  );
}
