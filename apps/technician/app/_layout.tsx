import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';

import { apiClient } from '../src/lib/api';
import { track } from '../src/lib/analytics';
import { handleTechnicianDeepLink, useDeepLinkHandler } from '../src/linking/useDeepLinkHandler';
import { subscribeNotificationResponses } from '../src/notifications/handleNotificationResponse';
import { ForegroundPushBanner } from '../src/notifications/ForegroundBanner';
import { registerPush } from '../src/notifications/registerPush';
import { AuthProvider, useAuth } from '../src/providers/AuthProvider';
import { OfflineSyncProvider } from '../src/providers/OfflineSyncProvider';
import { QueryProvider } from '../src/providers/QueryProvider';
import { colors } from '../src/theme/tokens';

function Bootstrap() {
  const { session } = useAuth();
  const router = useRouter();
  useDeepLinkHandler(apiClient);

  useEffect(() => {
    track('app_opened');
  }, []);

  useEffect(() => {
    if (!session) return;
    track('session_restored');
    void registerPush(apiClient, 'technician');
  }, [session]);

  useEffect(() => {
    return subscribeNotificationResponses(apiClient, router);
  }, [router]);

  return (
    <ForegroundPushBanner onOpen={(path) => void handleTechnicianDeepLink(path, router, apiClient)} />
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    'DM Sans': DMSans_400Regular,
    'DM Sans Medium': DMSans_500Medium,
    'DM Sans Bold': DMSans_700Bold,
  });

  if (!loaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.brandStrong} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthProvider>
            <OfflineSyncProvider>
              <StatusBar style="dark" />
              <Bootstrap />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
                <Stack.Screen name="(tech)" />
              </Stack>
            </OfflineSyncProvider>
          </AuthProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
});
