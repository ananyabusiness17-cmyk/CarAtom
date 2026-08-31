import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { buildOsmMapHtml, OSM_WEBVIEW_ORIGINS } from '../../lib/osmMapHtml';
import { colors } from '../../theme/tokens';

export function MapLibreView({
  latitude,
  longitude,
  interactive = false,
  pinColor = '#E07A3D',
  onPinMove,
}: {
  latitude: number;
  longitude: number;
  interactive?: boolean;
  pinColor?: string;
  onPinMove?: (lat: number, lng: number) => void;
}) {
  const [failed, setFailed] = useState(false);
  const webRef = useRef<WebView>(null);
  const origin = useRef({ latitude, longitude });
  const html = useMemo(
    () =>
      buildOsmMapHtml({
        latitude: origin.current.latitude,
        longitude: origin.current.longitude,
        interactive,
        pinColor,
        styleUrl: process.env.EXPO_PUBLIC_MAP_STYLE_URL,
      }),
    [interactive, pinColor],
  );

  useEffect(() => {
    webRef.current?.injectJavaScript(
      `window.__setPin && window.__setPin(${Number(latitude)}, ${Number(longitude)}); true;`,
    );
  }, [latitude, longitude]);

  function onMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        lat?: number;
        lng?: number;
      };
      if (data.type === 'pin' && typeof data.lat === 'number' && typeof data.lng === 'number') {
        onPinMove?.(data.lat, data.lng);
      }
    } catch {
      /* ignore malformed messages */
    }
  }

  if (failed) {
    return <View style={styles.fallback} accessibilityLabel="Map unavailable" />;
  }

  return (
    <WebView
      ref={webRef}
      originWhitelist={[...OSM_WEBVIEW_ORIGINS]}
      source={{ html }}
      style={styles.map}
      onError={() => setFailed(true)}
      onHttpError={() => setFailed(true)}
      onMessage={onMessage}
      javaScriptEnabled
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: 'transparent' },
  fallback: { flex: 1, backgroundColor: colors.surfaceSubtle },
});
