import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { RefreshControl, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OrderCard } from '../../../src/components/account/OrderCard';
import { HomeSkeleton } from '../../../src/components/home/HomeSkeleton';
import { InlineBanner } from '../../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../../src/components/home/PrimaryButton';
import { track } from '../../../src/lib/analytics';
import { apiClient } from '../../../src/lib/api';
import { useAuth } from '../../../src/providers/AuthProvider';
import { colors, type } from '../../../src/theme/tokens';

const RETURN_TO = '/(customer)/(tabs)/orders';

export default function OrdersScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const query = useInfiniteQuery({
    queryKey: ['bookings'],
    queryFn: ({ pageParam }) => apiClient.listBookings(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: Boolean(session),
  });

  useEffect(() => {
    track('orders_viewed');
  }, []);

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Text style={styles.title}>Orders</Text>
      {authLoading ? <HomeSkeleton /> : null}
      {!authLoading && !session ? (
        <>
          <Text style={styles.body}>Sign in to view orders.</Text>
          <PrimaryButton
            label="Log in"
            onPress={() => router.push({ pathname: '/(auth)/phone', params: { returnTo: RETURN_TO } })}
          />
        </>
      ) : null}
      {session && query.isLoading ? <HomeSkeleton /> : null}
      {session && query.isError ? (
        <InlineBanner
          message="Could not load orders."
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {session && query.isSuccess && items.length === 0 ? (
        <>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.body}>When you book a service, it will show up here.</Text>
          <PrimaryButton label="Browse services" onPress={() => router.push('/(customer)/(tabs)/home')} />
        </>
      ) : null}
      {session && items.length ? (
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          estimatedItemSize={96}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
          }
          onEndReached={() => {
            if (query.hasNextPage) void query.fetchNextPage();
          }}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => {
                track('booking_opened', {
                  booking_id: item.id,
                  customer_progress: item.customer_progress,
                });
                router.push({ pathname: '/booking/[id]', params: { id: item.id } });
              }}
            />
          )}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: 24, paddingTop: 8 },
  title: { ...type.navTitle, color: colors.textStrong, marginBottom: 12 },
  body: { ...type.body, color: colors.textMuted, marginBottom: 12 },
  emptyTitle: { ...type.bodyMedium, color: colors.textStrong, marginTop: 12 },
  list: { gap: 10, paddingBottom: 32 },
});
