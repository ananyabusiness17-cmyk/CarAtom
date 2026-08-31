import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text } from 'react-native';

import { colors, type } from '../theme/tokens';

type Banner = { title: string; body: string; path?: string };

export function ForegroundPushBanner({ onOpen }: { onOpen: (path: string) => void }) {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    let remove: () => void = () => undefined;
    void import('expo-notifications')
      .then((Notifications) => {
        void Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
          }),
        });
        const sub = Notifications.addNotificationReceivedListener((incoming) => {
          const content = incoming.request.content;
          const data = content.data as Record<string, string>;
          setBanner({
            title: content.title ?? 'CARATOM',
            body: content.body ?? '',
            path: data.deep_link_path,
          });
        });
        remove = () => sub.remove();
      })
      .catch(() => undefined);
    return () => remove();
  }, []);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(timer);
  }, [banner]);

  if (!banner) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${banner.title}. ${banner.body}`}
      onPress={() => {
        if (banner.path) onOpen(banner.path);
        setBanner(null);
      }}
      style={[styles.banner, reduceMotion ? null : styles.motion]}
    >
      <Text style={styles.title}>{banner.title}</Text>
      <Text style={styles.body} numberOfLines={2}>
        {banner.body}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    zIndex: 40,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    minHeight: 44,
  },
  motion: { opacity: 1 },
  title: { ...type.bodyMedium, color: colors.textStrong },
  body: { ...type.caption, color: colors.textMuted },
});
