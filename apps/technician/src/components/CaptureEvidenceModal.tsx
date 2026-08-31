import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, type } from '../theme/tokens';

export function CaptureEvidenceModal({
  visible,
  onClose,
  onCaptured,
}: {
  visible: boolean;
  onClose: () => void;
  onCaptured: (uri: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function capture() {
    setError(null);
    if (!permission?.granted) {
      const next = await requestPermission();
      if (!next.granted) {
        setError('Camera permission is required to attach evidence.');
        return;
      }
    }
    setBusy(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
      if (!photo?.uri) {
        setError('Could not capture a photo. Try again.');
        return;
      }
      onCaptured(photo.uri);
      onClose();
    } catch {
      setError('Could not capture a photo. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.fill}>
        {permission?.granted ? (
          <CameraView ref={cameraRef} style={styles.preview} facing="back" />
        ) : (
          <View style={styles.preview}>
            <Text style={styles.hint}>Allow camera access to photograph evidence.</Text>
          </View>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.bar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel camera" onPress={onClose} style={styles.side}>
            <Text style={styles.sideText}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            onPress={() => void capture()}
            disabled={busy}
            style={styles.shutter}
          />
          <View style={styles.side} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.textStrong },
  preview: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.textStrong },
  hint: { ...type.body, color: colors.surface, textAlign: 'center', paddingHorizontal: 24 },
  error: { ...type.caption, color: colors.dangerSoft, textAlign: 'center', padding: 8 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  shutter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: colors.brand,
  },
  side: { minWidth: 72, minHeight: 44, justifyContent: 'center' },
  sideText: { ...type.bodyMedium, color: colors.surface },
});
