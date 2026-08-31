import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CaptureEvidenceModal } from '../../../../src/components/CaptureEvidenceModal';
import { EvidencePhotoGrid } from '../../../../src/components/EvidencePhotoGrid';
import { InlineBanner } from '../../../../src/components/InlineBanner';
import { OfflineBanner } from '../../../../src/components/OfflineBanner';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { VisitScreen } from '../../../../src/components/VisitScreen';
import { useSignedUpload, writePlaceholderPhoto } from '../../../../src/hooks/useSignedUpload';
import { useVisitMutations } from '../../../../src/hooks/useVisitMutations';
import { colors, radius, type } from '../../../../src/theme/tokens';

export default function ExceptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mutations = useVisitMutations(id ?? '');
  const { uploadLocalPhoto } = useSignedUpload();
  const [uris, setUris] = useState<string[]>([]);
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [requestedAction, setRequestedAction] = useState('');

  if (!id) return null;

  async function attachUri(uri: string) {
    setUris((current) => [...current, uri]);
    setPhotoError(null);
    try {
      const assetId = await uploadLocalPhoto(id, uri);
      setAssetIds((current) => [...current, assetId]);
    } catch {
      setPhotoError('Photo saved locally. It will retry when you are back online.');
    }
  }

  const canSubmit = summary.trim().length >= 8 && requestedAction.trim().length >= 8 && !mutations.busy;

  async function submit() {
    if (!canSubmit) return;
    await mutations.exception({
      summary: summary.trim(),
      requested_action: requestedAction.trim(),
      media_asset_ids: assetIds,
    });
    router.replace(`/visits/${id}`);
  }

  return (
    <View style={styles.flex}>
      <OfflineBanner />
      <VisitScreen step={7}>
        <InlineBanner
          tone="warning"
          message="Something on site differs from the approved job card — do not change the bill yourself."
        />
        <View style={styles.card}>
          <Text style={styles.label}>What you found</Text>
          <TextInput
            value={summary}
            onChangeText={setSummary}
            placeholder="Describe the exception in the field"
            placeholderTextColor={colors.textMuted}
            multiline
            style={styles.input}
            accessibilityLabel="Exception summary"
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Requested action</Text>
          <TextInput
            value={requestedAction}
            onChangeText={setRequestedAction}
            placeholder="What should the advisor do next?"
            placeholderTextColor={colors.textMuted}
            multiline
            style={styles.input}
            accessibilityLabel="Requested action"
          />
        </View>
        <EvidencePhotoGrid uris={uris} onAdd={() => setCameraOpen(true)} />
        {__DEV__ ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add test photo"
            onPress={() => void writePlaceholderPhoto().then((uri) => attachUri(uri))}
            style={styles.devPhoto}
          >
            <Text style={styles.devPhotoText}>Add test photo (dev)</Text>
          </Pressable>
        ) : null}
        <Text style={styles.disclaimer}>
          Flags the sales advisor on admin. Visit may pause until scope is re-approved.
        </Text>
        {photoError ? <InlineBanner message={photoError} /> : null}
        {mutations.error ? <InlineBanner message={mutations.error} /> : null}
        <PrimaryButton
          label="Submit exception to advisor"
          loading={mutations.busy}
          disabled={!canSubmit}
          onPress={() => void submit()}
        />
      </VisitScreen>
      <CaptureEvidenceModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCaptured={(uri) => void attachUri(uri)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
    gap: 8,
  },
  label: { ...type.caption, color: colors.textMuted },
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
    textAlignVertical: 'top',
  },
  disclaimer: { ...type.caption, color: colors.textMuted },
  devPhoto: { minHeight: 44, justifyContent: 'center' },
  devPhotoText: { ...type.caption, color: colors.textMuted },
});
