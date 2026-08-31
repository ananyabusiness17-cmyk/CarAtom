import { Stack } from 'expo-router';

import { colors } from '../../../../src/theme/tokens';

export default function CaseLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.textStrong,
        headerStyle: { backgroundColor: colors.canvas },
        contentStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'On call' }} />
      <Stack.Screen name="estimate" options={{ title: 'Edit on call' }} />
      <Stack.Screen name="send" options={{ title: 'Send to app' }} />
    </Stack>
  );
}
