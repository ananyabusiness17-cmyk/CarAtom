import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CaptureEvidenceModal } from '../../../../src/components/CaptureEvidenceModal';
import { EvidencePhotoGrid } from '../../../../src/components/EvidencePhotoGrid';
import { InlineBanner } from '../../../../src/components/InlineBanner';
import { OfflineBanner } from '../../../../src/components/OfflineBanner';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { VisitScreen } from '../../../../src/components/VisitScreen';
import { useSignedUpload, writePlaceholderPhoto } from '../../../../src/hooks/useSignedUpload';
import { useVisitMutations } from '../../../../src/hooks/useVisitMutations';
import { useVisitDetail } from '../../../../src/hooks/useVisitQueries';
import { colors, radius, type } from '../../../../src/theme/tokens';

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

type DraftFinding = {
  key: string;
  title: string;
  severity: (typeof SEVERITIES)[number];
  customer_explanation: string;
  recommendation: string;
};

function emptyFinding(): DraftFinding {
  return {
    key: `finding-${Date.now()}`,
    title: '',
    severity: 'MEDIUM',
    customer_explanation: '',
    recommendation: '',
  };
}

export default function InspectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useVisitDetail(id);
  const mutations = useVisitMutations(id ?? '');
  const { uploadLocalPhoto } = useSignedUpload();
  const [uris, setUris] = useState<string[]>([]);
  const [assetIds, setAssetIds] = useState<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [findings, setFindings] = useState<DraftFinding[]>([emptyFinding()]);
  const started = useRef(false);
  const detail = query.data;
  const irInspection = detail?.visit_type === 'INSPECTION';

  useEffect(() => {
    if (!detail || started.current) return;
    if (detail.allowed_actions.includes('START_INSPECTION')) {
      started.current = true;
      void mutations.startInspection();
    }
  }, [detail, mutations]);

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

  const summaryOk = summary.trim().length >= 8;
  const findingsOk =
    !irInspection ||
    findings.some((row) => row.title.trim().length >= 3 && row.customer_explanation.trim().length >= 8);
  const canSubmit = summaryOk && findingsOk && !mutations.busy;

  async function submit() {
    if (!canSubmit) return;
    if (irInspection) {
      await mutations.inspectionFindings({
        summary: summary.trim(),
        recommendation: recommendation.trim() || undefined,
        media_asset_ids: assetIds,
        findings: findings
          .filter((row) => row.title.trim() && row.customer_explanation.trim())
          .map((row) => ({
            title: row.title.trim(),
            severity: row.severity,
            customer_explanation: row.customer_explanation.trim(),
            recommendation: row.recommendation.trim() || recommendation.trim() || null,
          })),
      });
      router.replace(`/visits/${id}`);
      return;
    }
    await mutations.inspectionFindings({
      summary: summary.trim(),
      recommendation: recommendation.trim() || undefined,
      media_asset_ids: assetIds,
    });
    router.replace(`/visits/${id}/qc`);
  }

  return (
    <View style={styles.flex}>
      <OfflineBanner />
      <VisitScreen step={4}>
        <View style={styles.card}>
          <Text style={styles.label}>Finding</Text>
          <TextInput
            value={summary}
            onChangeText={setSummary}
            placeholder="What did you observe on this car?"
            placeholderTextColor={colors.textMuted}
            multiline
            style={styles.input}
            accessibilityLabel="Inspection summary"
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Recommend</Text>
          <TextInput
            value={recommendation}
            onChangeText={setRecommendation}
            placeholder="Recommended next step (no selling price)"
            placeholderTextColor={colors.textMuted}
            multiline
            style={styles.input}
            accessibilityLabel="Recommendation"
          />
        </View>
        {irInspection
          ? findings.map((row) => (
              <View key={row.key} style={styles.card}>
                <Text style={styles.label}>Customer-facing finding</Text>
                <TextInput
                  value={row.title}
                  onChangeText={(title) =>
                    setFindings((current) => current.map((item) => (item.key === row.key ? { ...item, title } : item)))
                  }
                  placeholder="Title, e.g. Front brake pads worn"
                  placeholderTextColor={colors.textMuted}
                  style={styles.single}
                  accessibilityLabel="Finding title"
                />
                <View style={styles.severities}>
                  {SEVERITIES.map((severity) => {
                    const active = row.severity === severity;
                    return (
                      <Pressable
                        key={severity}
                        onPress={() =>
                          setFindings((current) =>
                            current.map((item) => (item.key === row.key ? { ...item, severity } : item)),
                          )
                        }
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${severity} severity`}
                        style={[styles.chip, active ? styles.chipActive : null]}
                      >
                        <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{severity}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  value={row.customer_explanation}
                  onChangeText={(customer_explanation) =>
                    setFindings((current) =>
                      current.map((item) => (item.key === row.key ? { ...item, customer_explanation } : item)),
                    )
                  }
                  placeholder="Explain this in customer language"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={styles.input}
                  accessibilityLabel="Customer explanation"
                />
                <TextInput
                  value={row.recommendation}
                  onChangeText={(next) =>
                    setFindings((current) =>
                      current.map((item) => (item.key === row.key ? { ...item, recommendation: next } : item)),
                    )
                  }
                  placeholder="Repair recommendation for this finding"
                  placeholderTextColor={colors.textMuted}
                  style={styles.single}
                  accessibilityLabel="Finding recommendation"
                />
              </View>
            ))
          : null}
        {irInspection ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setFindings((current) => [...current, emptyFinding()])}
            style={styles.addFinding}
          >
            <Text style={styles.addFindingText}>Add another finding</Text>
          </Pressable>
        ) : null}
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
          {irInspection
            ? 'Recommendations are catalogued without sell prices — pricing is applied on the server.'
            : 'Recommendations go to the sales advisor — you do not edit the customer estimate.'}
        </Text>
        {photoError ? <InlineBanner message={photoError} /> : null}
        {mutations.error ? <InlineBanner message={mutations.error} /> : null}
        <PrimaryButton
          label={irInspection ? 'Submit inspection findings' : 'Submit findings to advisor'}
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
  single: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    color: colors.text,
  },
  severities: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { borderColor: colors.selectionBorder, backgroundColor: colors.selectionBg },
  chipText: { ...type.caption, color: colors.textMuted, fontWeight: '700' },
  chipTextActive: { color: colors.brandStrong },
  addFinding: { minHeight: 44, justifyContent: 'center' },
  addFindingText: { ...type.bodyMedium, color: colors.brandStrong },
  disclaimer: { ...type.caption, color: colors.textMuted },
  devPhoto: { minHeight: 44, justifyContent: 'center' },
  devPhotoText: { ...type.caption, color: colors.textMuted },
});
