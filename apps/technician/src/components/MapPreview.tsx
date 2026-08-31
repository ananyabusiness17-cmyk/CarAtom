import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { buildOsmMapHtml, OSM_WEBVIEW_ORIGINS } from '../lib/osmMapHtml';
import { colors, type } from '../theme/tokens';

export function MapPreview({
  latitude,
  longitude,
  label = 'MAP PREVIEW',
  height = 180,
}: {
  latitude?: number | null;
  longitude?: number | null;
  label?: string;
  height?: number;
}) {
  const [failed, setFailed] = useState(false);
  const webRef = useRef<WebView>(null);
  const lat = latitude ?? 12.9352;
  const lng = longitude ?? 77.6245;
  const origin = useRef({ lat, lng });
  const html = useMemo(
    () =>
      buildOsmMapHtml({
        latitude: origin.current.lat,
        longitude: origin.current.lng,
        styleUrl: process.env.EXPO_PUBLIC_MAP_STYLE_URL,
      }),
    [],
  );

  useEffect(() => {
    if (latitude == null || longitude == null) return;
    webRef.current?.injectJavaScript(
      `window.__setPin && window.__setPin(${Number(latitude)}, ${Number(longitude)}); true;`,
    );
  }, [latitude, longitude]);

  if (failed || latitude == null || longitude == null) {
    return (
      <View style={[styles.fallback, { height }]} accessibilityLabel={label}>
        <Text style={styles.caption}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]} accessibilityLabel="OpenStreetMap">
      <WebView
        ref={webRef}
        originWhitelist={[...OSM_WEBVIEW_ORIGINS]}
        source={{ html }}
        style={styles.map}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
        javaScriptEnabled
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 180, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surfaceSubtle },
  map: { flex: 1, backgroundColor: 'transparent' },
  fallback: {
    height: 180,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { ...type.caption, color: colors.textMuted },
});
