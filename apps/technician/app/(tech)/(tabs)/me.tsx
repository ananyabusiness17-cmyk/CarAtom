import { useMutation, useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { FlowRail } from '../../../src/components/FlowRail';
import { InlineBanner } from '../../../src/components/InlineBanner';
import { OfflineBanner } from '../../../src/components/OfflineBanner';
import { Screen } from '../../../src/components/Screen';
import { SecondaryButton } from '../../../src/components/SecondaryButton';
import { technicianApi } from '../../../src/lib/api';
import { useTechnicianMe } from '../../../src/hooks/useVisitQueries';
import { useAuth } from '../../../src/providers/AuthProvider';
import { drainQueue } from '../../../src/providers/OfflineSyncProvider';
import { useOfflineQueueStore } from '../../../src/stores/offlineQueueStore';
import { colors, radius, type } from '../../../src/theme/tokens';

export default function MeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { signOut } = useAuth();
  const me = useTechnicianMe();
  const queryClient = useQueryClient();
  const pending = useOfflineQueueStore((s) => s.entries.filter((row) => row.status === 'pending').length);
  const failed = useOfflineQueueStore((s) => s.entries.some((row) => row.status === 'failed'));
  const [online, setOnline] = useState(true);

  useEffect(() => {
    return NetInfo.addEventListener((state) => setOnline(state.isConnected !== false));
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({ headerTitle: me.data?.display_name ?? 'Technician' });
  }, [navigation, me.data?.display_name]);

  const duty = useMutation({
    mutationFn: (onDuty: boolean) => technicianApi.patchDuty(onDuty),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['technician'] });
    },
  });

  const skills = me.data?.skills?.length ? me.data.skills.join(', ') : 'No skills listed';
  const jobs = me.data?.today_jobs ?? 0;
  const onDuty = me.data?.on_duty ?? true;

  return (
    <View style={styles.flex}>
      <OfflineBanner />
      <Screen>
        <FlowRail currentStep={9} />
        {me.isError ? (
          <InlineBanner message="Could not load your profile." actionLabel="Retry" onAction={() => void me.refetch()} />
        ) : null}
        <View style={styles.dutyCard}>
          <View style={[styles.dot, onDuty ? styles.dotOn : styles.dotOff]} />
          <View style={styles.dutyCopy}>
            <Text style={styles.dutyTitle}>{onDuty ? 'On duty' : 'Off duty'}</Text>
            <Text style={styles.skills}>Skills: {skills}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={onDuty ? 'Go off duty' : 'Go on duty'}
          onPress={() => duty.mutate(!onDuty)}
          style={styles.row}
        >
          <Text style={styles.rowLabel}>Duty</Text>
          <Text style={styles.rowValue}>{onDuty ? 'On duty' : 'Off duty'}</Text>
        </Pressable>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{"Today's jobs"}</Text>
          <Text style={styles.rowValue}>{jobs}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Sync</Text>
          <Text style={[styles.rowValue, online ? styles.ok : styles.warn]}>{online ? 'Online' : 'Offline'}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => router.push('/(tech)/notifications')}
          style={styles.row}
        >
          <Text style={styles.rowLabel}>Notifications</Text>
          <Text style={styles.rowValue}>›</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Offline queue, ${pending} pending`}
          onPress={() => router.push('/offline-queue')}
          style={styles.row}
        >
          <Text style={styles.rowLabel}>Offline queue</Text>
          <Text style={[styles.rowValue, failed ? styles.danger : null]}>
            {pending} pending{failed ? ' · failed' : ''}
          </Text>
        </Pressable>
        <View style={styles.explainer}>
          <Text style={styles.explainerText}>
            Queued events — Check-ins, photos, and parts sync when back online
          </Text>
        </View>
        <SecondaryButton
          label="Contact support"
          onPress={() => void Linking.openURL('mailto:support@caratom.in')}
        />
        <SecondaryButton
          label="Retry sync"
          onPress={() => void drainQueue()}
        />
        <SecondaryButton label="Sign out" onPress={() => void signOut()} />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  dutyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotOn: { backgroundColor: colors.success },
  dotOff: { backgroundColor: colors.textMuted },
  dutyCopy: { flex: 1, gap: 4 },
  dutyTitle: { ...type.bodyMedium, color: colors.textStrong },
  skills: { ...type.caption, color: colors.textMuted },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.control,
    paddingHorizontal: 12,
  },
  rowLabel: { ...type.body, color: colors.text },
  rowValue: { ...type.bodyMedium, color: colors.textStrong },
  ok: { color: colors.success },
  warn: { color: colors.warning },
  danger: { color: colors.danger },
  explainer: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.card,
    padding: 12,
  },
  explainerText: { ...type.caption, color: colors.textMuted },
});
