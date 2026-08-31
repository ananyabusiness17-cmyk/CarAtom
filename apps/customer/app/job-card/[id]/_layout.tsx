import { Stack } from 'expo-router';

import { flowStackScreenOptions } from '../../../src/components/flowStackOptions';

export default function JobCardLayout() {
  return (
    <Stack screenOptions={flowStackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Job card' }} />
      <Stack.Screen name="estimate" options={{ title: 'Your estimate' }} />
      <Stack.Screen name="awaiting-findings" options={{ title: 'Inspection in progress' }} />
      <Stack.Screen name="findings" options={{ title: 'Inspection findings' }} />
      <Stack.Screen name="parts-advance" options={{ title: 'Parts advance' }} />
      <Stack.Screen name="parts-pending" options={{ title: 'Parts status' }} />
      <Stack.Screen name="repairs-cart" options={{ title: 'Repairs cart' }} />
      <Stack.Screen name="advisor-waiting" options={{ title: 'On call' }} />
      <Stack.Screen name="advisor-revised" options={{ title: 'Estimate on app' }} />
    </Stack>
  );
}
