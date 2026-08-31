import { Stack } from 'expo-router';

import { flowStackScreenOptions } from '../../src/components/flowStackOptions';

export default function CheckoutLayout() {
  return (
    <Stack screenOptions={flowStackScreenOptions}>
      <Stack.Screen name="details" options={{ title: 'Your details' }} />
      <Stack.Screen name="slot" options={{ title: 'Pick a slot' }} />
      <Stack.Screen name="inspection-slot" options={{ title: 'Pick inspection slot' }} />
      <Stack.Screen name="repair-slot" options={{ title: 'Pick repair slot' }} />
    </Stack>
  );
}
