import { Stack } from 'expo-router';

import { flowStackScreenOptions } from '../../src/components/flowStackOptions';

export const unstable_settings = {
  initialRouteName: 'make',
};

export default function VehicleLayout() {
  return (
    <Stack screenOptions={flowStackScreenOptions}>
      <Stack.Screen name="make" options={{ title: 'Select make' }} />
      <Stack.Screen name="model" options={{ title: 'Select model' }} />
      <Stack.Screen name="year" options={{ title: 'Select year' }} />
      <Stack.Screen name="fuel" options={{ title: 'Fuel & transmission' }} />
    </Stack>
  );
}
