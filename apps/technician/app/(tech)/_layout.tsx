import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { InlineBanner } from '../../src/components/InlineBanner';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Screen } from '../../src/components/Screen';
import { technicianGateMessage } from '../../src/lib/requireTechnicianRole';
import { useAuth } from '../../src/providers/AuthProvider';
import { colors } from '../../src/theme/tokens';

export default function TechLayout() {
  const { session, profile, loading, profileLoading, signOut } = useAuth();

  if (loading || profileLoading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.brandStrong} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href={{ pathname: '/(auth)/phone', params: { returnTo: '/(tech)/(tabs)/today' } }} />;
  }

  const gate = technicianGateMessage(profile?.role);
  if (gate) {
    return (
      <Screen>
        <InlineBanner message={gate} />
        <PrimaryButton label="Sign out" onPress={() => void signOut()} />
      </Screen>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.textStrong,
        headerStyle: { backgroundColor: colors.canvas },
        contentStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="visits/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="offline-queue" options={{ title: 'Offline queue' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
});
