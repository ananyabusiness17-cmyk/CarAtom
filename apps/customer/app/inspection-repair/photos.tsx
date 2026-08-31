import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '@caratom/api-client';

import { FlowScreen } from '../../src/components/FlowScreen';
import { InspectionFlowRail } from '../../src/components/InspectionFlowRail';
import { InlineBanner } from '../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../src/components/home/PrimaryButton';
import { apiClient } from '../../src/lib/api';
import { useAuth } from '../../src/providers/AuthProvider';
import { useJobCardFlowStore } from '../../src/stores/jobCardFlowStore';
import { colors, radius, type } from '../../src/theme/tokens';

export default function IrPhotosScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const ids = useJobCardFlowStore((s) => s.photoAssetIds);
  const setPhotoAssetIds = useJobCardFlowStore((s) => s.setPhotoAssetIds);
  const setLastIrStep = useJobCardFlowStore((s) => s.setLastIrStep);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function goVehicle() {
    setLastIrStep('/vehicle/make?flow=ir');
    router.push({ pathname: '/vehicle/make', params: { flow: 'ir', offering: 'inspection-and-repair' } });
  }

  async function addPhoto() {
    if (ids.length >= 6) return;
    if (!session) {
      setError('Sign in to attach photos, or skip and continue.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const signed = await apiClient.createSignedUpload({
        filename: `issue-${Date.now()}.jpg`,
        content_type: 'image/jpeg',
        byte_size: 256,
      });
      await apiClient.confirmMedia(signed.asset_id);
      setPhotoAssetIds([...ids, signed.asset_id]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add photo.');
    } finally {
      setBusy(false);
    }
  }

  function skip() {
    Alert.alert('Skip photos?', 'Photos help diagnosis but are optional', [
      { text: 'Keep adding', style: 'cancel' },
      { text: 'Skip photos', onPress: goVehicle },
    ]);
  }

  return (
    <FlowScreen>
      <InspectionFlowRail currentStep={3} />
      <Text style={styles.title}>Add photos (optional)</Text>
      <Text style={styles.sub}>Photos of the issue area help our technician diagnose faster.</Text>
      {error ? <InlineBanner message={error} /> : null}
      <View style={styles.strip}>
        {ids.map((id) => (
          <View key={id} style={styles.thumb} />
        ))}
        {ids.length < 6 ? (
          <Pressable
            onPress={() => void addPhoto()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Add photo"
            style={styles.add}
          >
            <Text style={styles.addLabel}>+ Add photo</Text>
          </Pressable>
        ) : null}
      </View>
      {ids.length === 0 ? <Text style={styles.empty}>No photos added</Text> : null}
      <Pressable onPress={skip} accessibilityRole="button" style={styles.skip}>
        <Text style={styles.skipLabel}>Skip photos</Text>
      </Pressable>
      <View style={styles.grow} />
      <PrimaryButton label="Continue" loading={busy} onPress={goVehicle} />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.navTitle, color: colors.textStrong },
  sub: { ...type.body, color: colors.textMuted },
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.control,
    backgroundColor: colors.surfaceSubtle,
  },
  add: {
    width: 72,
    height: 72,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: { ...type.caption, color: colors.brandStrong, textAlign: 'center' },
  empty: { ...type.caption, color: colors.textMuted },
  skip: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  skipLabel: { ...type.bodyMedium, color: colors.textMuted },
  grow: { flex: 1 },
});
