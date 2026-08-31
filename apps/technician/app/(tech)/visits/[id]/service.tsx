import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { InlineBanner } from '../../../../src/components/InlineBanner';
import { OfflineBanner } from '../../../../src/components/OfflineBanner';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { ScopeChecklist } from '../../../../src/components/ScopeChecklist';
import { SecondaryButton } from '../../../../src/components/SecondaryButton';
import { VisitScreen } from '../../../../src/components/VisitScreen';
import { canRaiseException } from '../../../../src/coordinators/fieldVisitCoordinator';
import { useVisitMutations } from '../../../../src/hooks/useVisitMutations';
import { useVisitDetail } from '../../../../src/hooks/useVisitQueries';
import { colors, type } from '../../../../src/theme/tokens';

export default function ServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useVisitDetail(id);
  const mutations = useVisitMutations(id ?? '');
  const started = useRef(false);
  const detail = query.data;
  const allDone = (detail?.scope_lines ?? []).every((line) => line.status === 'DONE');

  useEffect(() => {
    if (!detail || started.current) return;
    if (detail.allowed_actions.includes('START_SERVICE')) {
      started.current = true;
      void mutations.startService();
    }
  }, [detail, mutations]);

  if (!id) return null;

  return (
    <View style={styles.flex}>
      <OfflineBanner />
      <VisitScreen step={5}>
        <Text style={styles.intro}>
          Work against approved job card lines · customer accepted on advisor call
        </Text>
        {detail ? (
          <ScopeChecklist
            lines={detail.scope_lines}
            interactive
            onCycle={(line) => void mutations.scopeProgress(line)}
          />
        ) : (
          <Text style={styles.muted}>Loading checklist…</Text>
        )}
        {mutations.error ? <InlineBanner message={mutations.error} /> : null}
        {detail && canRaiseException(detail) ? (
          <SecondaryButton label="Raise exception" onPress={() => router.push(`/visits/${id}/exception`)} />
        ) : null}
        <SecondaryButton label="Record parts used" onPress={() => router.push(`/visits/${id}/parts`)} />
        <PrimaryButton
          label="Go to QC"
          disabled={!allDone}
          onPress={() => router.push(`/visits/${id}/qc`)}
        />
      </VisitScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  intro: { ...type.body, color: colors.text },
  muted: { ...type.caption, color: colors.textMuted },
});
