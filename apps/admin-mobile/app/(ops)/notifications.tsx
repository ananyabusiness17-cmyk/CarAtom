import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { Notification } from '@caratom/contracts';

import { InlineBanner } from '../../src/components/InlineBanner';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Screen } from '../../src/components/Screen';
import { track } from '../../src/lib/analytics';
import { apiClient } from '../../src/lib/api';
import { adminMobileRouteForUrl } from '../../src/linking/useDeepLinkHandler';
import { registerPush, requestPushPermission } from '../../src/notifications/registerPush';
import { OfflineBanner } from '../../src/recovery/OfflineBanner';
import { colors, type } from '../../src/theme/tokens';

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const hours = Math.round((Date.now() - then) / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function AdminNotificationsScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const [hint, setHint] = useState(false);
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
    onSettled: () => void client.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items = query.data?.pages.flatMap((page) => page.data) ?? [];

  function open(item: Notification) {
    track('notification_opened', {
      intent: item.intent ?? item.kind,
      entity_type: item.entity_type ?? item.resource_type ?? 'unknown',
    });
    if (!item.read_at) mark.mutate(item.id);
    const href = adminMobileRouteForUrl(item.deep_link_path || item.deep_link || '');
    if (href) router.push(href as never);
  }

  return (
    <Screen>
      <OfflineBanner />
      <PrimaryButton
        label="Get case updates"
        onPress={() =>
          void requestPushPermission().then((granted) => {
            if (granted) void registerPush(apiClient, 'admin_mobile');
            else setHint(true);
          })
        }
      />
      {hint ? <Text style={styles.body}>Notifications are off. Enable them in system settings.</Text> : null}
      {query.isLoading ? <Text style={styles.body}>Loading updates…</Text> : null}
      {query.isError ? (
        <InlineBanner message="Could not load notifications." actionLabel="Retry" onAction={() => void query.refetch()} />
      ) : null}
      <FlashList
        data={items}
        keyExtractor={(item) => item.id}
        estimatedItemSize={72}
        style={styles.list}
        ListEmptyComponent={query.isSuccess ? <Text style={styles.empty}>No updates yet</Text> : null}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  empty: { ...type.bodyMedium, color: colors.textStrong, marginTop: 16 },
  body: { ...type.body, color: colors.textMuted },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 14, minHeight: 44 },
  col: { flex: 1, gap: 4 },
  rowTitle: { ...type.body, color: colors.text },
  unread: { ...type.bodyMedium, color: colors.textStrong },
  time: { ...type.caption, color: colors.textMuted },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, marginTop: 8 },
  dotOff: { width: 8, height: 8, marginTop: 8 },
});
