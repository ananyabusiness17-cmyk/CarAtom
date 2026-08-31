import { useCallback } from 'react';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';

import { track } from '../lib/analytics';
import { colors, layout, type } from '../theme/tokens';

export function OpenInWebLink({
  url,
  label,
  pathKey,
}: {
  url: string | null;
  label: string;
  pathKey?: string;
}) {
  const open = useCallback(() => {
    if (!url) return;
    track('admin_mobile_web_deeplink', { path: pathKey ?? url.split('/').slice(-1)[0] ?? 'web' });
    void Linking.openURL(url);
  }, [pathKey, url]);

  if (!url) {
    return <Text style={styles.missing}>Admin web URL is not configured.</Text>;
  }

  return (
    <Pressable onPress={open} accessibilityRole="link" accessibilityLabel={label} style={styles.link}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: layout.minTouch, justifyContent: 'center' },
  text: { ...type.body, color: colors.brandStrong, textDecorationLine: 'underline' },
  missing: { ...type.caption, color: colors.textMuted },
});
