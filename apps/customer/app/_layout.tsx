import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { apiClient } from '../src/lib/api';
import { track } from '../src/lib/analytics';
import { handleCustomerDeepLink, useDeepLinkHandler } from '../src/linking/useDeepLinkHandler';
import { subscribeNotificationResponses } from '../src/notifications/handleNotificationResponse';
import { ForegroundPushBanner } from '../src/notifications/ForegroundBanner';
import { registerPush } from '../src/notifications/registerPush';
import { AuthProvider, useAuth } from '../src/providers/AuthProvider';
import { QueryProvider } from '../src/providers/QueryProvider';
import { OfflineBanner } from '../src/recovery/OfflineBanner';
import { recoverAuthSession } from '../src/recovery/AuthRecovery';
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
    void registerPush(apiClient, 'customer');
  }, [session]);

  useEffect(() => {
    return subscribeNotificationResponses(apiClient, router);
  }, [router]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void recoverAuthSession();
    });
    return () => sub.remove();
  }, []);

  return (
    <>
      <OfflineBanner />
      <ForegroundPushBanner
        onOpen={(path) => void handleCustomerDeepLink(path, router, apiClient)}
      />
    </>
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
            <StatusBar style="dark" />
            <Bootstrap />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(customer)" />
              <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
              <Stack.Screen name="services/[slug]" options={{ headerShown: true, title: 'Service' }} />
              <Stack.Screen name="inspection-repair" />
              <Stack.Screen name="oneman" />
              <Stack.Screen name="sos" />
              <Stack.Screen name="addresses" />
              <Stack.Screen name="vehicle" />
              <Stack.Screen name="job-card" />
              <Stack.Screen name="checkout" />
              <Stack.Screen name="booking/[id]" />
              <Stack.Screen name="invoice/[invoiceId]" options={{ headerShown: true, title: 'Invoice' }} />
              <Stack.Screen name="review/[bookingId]" options={{ headerShown: true, title: 'Rate your service' }} />
              <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
            </Stack>
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
