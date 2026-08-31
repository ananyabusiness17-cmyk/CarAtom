import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Notification, NotificationList } from '@caratom/contracts';

import { HomeSkeleton } from '../src/components/home/HomeSkeleton';
import { InlineBanner } from '../src/components/home/InlineBanner';
import { PrimaryButton } from '../src/components/home/PrimaryButton';
import { track } from '../src/lib/analytics';
import { apiClient } from '../src/lib/api';
import { customerRouteForUrl } from '../src/linking/useDeepLinkHandler';
import { registerPush, requestPushPermission } from '../src/notifications/registerPush';
import { colors, type } from '../src/theme/tokens';

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const delta = Date.now() - then;
  const hours = Math.round(delta / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const [permissionHint, setPermissionHint] = useState(false);
  const query = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam }) => apiClient.listNotifications(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta.next_cursor ?? undefined,
    staleTime: 30_000,
  });

  useEffect(() => {
    track('notifications_viewed');
  }, []);

  const mark = useMutation({
    mutationFn: (id: string) => apiClient.markNotificationRead(id),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: ['notifications'] });
      const previous = client.getQueryData<{ pages: NotificationList[]; pageParams: unknown[] }>([
        'notifications',
      ]);
      client.setQueryData<{ pages: NotificationList[]; pageParams: unknown[] }>(
        ['notifications'],
        (current) => {
          if (!current) return current;
          const readAt = new Date().toISOString();
          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              data: page.data.map((item) => (item.id === id ? { ...item, read_at: readAt } : item)),
            })),
          };
        },
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) client.setQueryData(['notifications'], ctx.previous);
    },
    onSettled: () => void client.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items = query.data?.pages.flatMap((page) => page.data) ?? [];

  function open(item: Notification) {
    track('notification_opened', {
      intent: item.intent ?? item.kind,
      entity_type: item.entity_type ?? item.resource_type ?? 'unknown',
    });
    if (!item.read_at) mark.mutate(item.id);
    const href = customerRouteForUrl(item.deep_link_path || item.deep_link || '');
    if (href) router.push(href as never);
  }

  async function enablePush() {
    const granted = await requestPushPermission();
    if (granted) {
      await registerPush(apiClient, 'customer');
      setPermissionHint(false);
      return;
    }
    setPermissionHint(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Text style={styles.title}>Notifications</Text>
      <PrimaryButton label="Get visit updates" onPress={() => void enablePush()} />
      {permissionHint ? (
        <Text style={styles.body}>Notifications are off. Enable them in system settings.</Text>
      ) : null}
      {query.isLoading ? <HomeSkeleton /> : null}
      {query.isError ? (
        <InlineBanner
          message="Could not load notifications."
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {query.isSuccess && items.length === 0 ? (
        <>
          <Text style={styles.empty}>No updates yet</Text>
          <Text style={styles.body}>Visit updates, advisor callbacks, and payment receipts will appear here.</Text>
        </>
      ) : null}
      <FlashList
        data={items}
        keyExtractor={(item) => item.id}
        estimatedItemSize={72}
        style={styles.list}
        onEndReached={() => {
          if (query.hasNextPage) void query.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />
        }
        renderItem={({ item }) => {
          const unread = !item.read_at;
          const time = relativeTime(item.created_at);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${unread ? 'Unread. ' : 'Read. '}${item.title}. ${time}`}
              onPress={() => open(item)}
              style={styles.row}
            >
              {unread ? <View style={styles.dot} /> : <View style={styles.dotOff} />}
              <View style={styles.col}>
                <Text style={[styles.rowTitle, unread ? styles.unread : null]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.body} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={styles.time}>{time}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: 24, paddingTop: 8 },
  list: { flex: 1 },
  title: { ...type.navTitle, color: colors.textStrong, marginBottom: 12 },
  empty: { ...type.bodyMedium, color: colors.textStrong, marginTop: 16 },
  body: { ...type.body, color: colors.textMuted },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 14, minHeight: 44 },
  col: { flex: 1, gap: 4 },
  rowTitle: { ...type.body, color: colors.text },
  unread: { ...type.bodyMedium, color: colors.textStrong },
  time: { ...type.caption, color: colors.textMuted },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
    marginTop: 8,
  },
  dotOff: { width: 8, height: 8, marginTop: 8 },
});
