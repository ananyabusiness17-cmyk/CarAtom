import { ApiError } from '@caratom/api-client';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DispatchMapPlaceholder } from '../../src/components/DispatchMapPlaceholder';
import { InlineBanner } from '../../src/components/InlineBanner';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Screen } from '../../src/components/Screen';
import { SecondaryButton } from '../../src/components/SecondaryButton';
import { TechDutyCard } from '../../src/components/TechDutyCard';
import { useAdminDispatch } from '../../src/hooks/useAdminDispatch';
import { useAssignJob } from '../../src/hooks/useAssignJob';
import { track } from '../../src/lib/analytics';
import { apiClient } from '../../src/lib/api';
import { parseUuidParam } from '../../src/lib/parseUuid';
import { colors, radius, type } from '../../src/theme/tokens';

export default function DispatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ jobCardId?: string; technicianId?: string }>();
  const jobCardId = parseUuidParam(params.jobCardId);
  const technicianId = parseUuidParam(params.technicianId);
  const malformed = Boolean(params.jobCardId || params.technicianId) && !jobCardId && !technicianId;
  const dispatch = useAdminDispatch();
  const assign = useAssignJob();
  const jobQuery = useQuery({
    queryKey: ['admin', 'job-card', jobCardId],
    queryFn: () => apiClient.getAdminJobLite(jobCardId!),
    enabled: Boolean(jobCardId),
  });
  const [pendingTechId, setPendingTechId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    track('admin_mobile_dispatch_opened', { has_job_context: Boolean(jobCardId) });
  }, [jobCardId]);

  const techs = useMemo(() => dispatch.data?.technicians ?? [], [dispatch.data]);
  const pendingTech = techs.find((row) => row.id === pendingTechId);
  const job = jobQuery.data;
  const jobRef = job?.ref;

  useEffect(() => {
    if (!technicianId || !dispatch.data) return;
    const index = techs.findIndex((row) => row.id === technicianId);
    if (index >= 0) {
      scrollRef.current?.scrollTo({ y: Math.max(0, index * 120), animated: true });
    }
  }, [dispatch.data, technicianId, techs]);

  const assignError =
    assign.error instanceof ApiError
      ? assign.error.problem?.code === 'TECH_OFF_DUTY'
        ? assign.error.message
        : assign.error.message
      : assign.error instanceof Error
        ? assign.error.message
        : null;

  const confirmBody = useMemo(() => {
    if (!job || !pendingTech) return '';
    const window = job.visit_window_label ?? 'the selected window';
    const extra =
      pendingTech.active_jobs_count > 0
        ? ` ${pendingTech.name} currently has ${pendingTech.active_jobs_count} jobs today.`
        : '';
    return `${job.ref} · ${job.vehicle_label} · ${window} will move to ${pendingTech.name}'s queue.${extra}`;
  }, [job, pendingTech]);

  return (
    <Screen>
      {malformed && !jobCardId && params.jobCardId ? (
        <InlineBanner message="This job link is invalid." />
      ) : null}
      {malformed && !technicianId && params.technicianId ? (
        <InlineBanner message="This technician link is invalid." />
      ) : null}
      {dispatch.isError ? (
        <InlineBanner
          message="Could not load dispatch."
          actionLabel="Retry"
          onAction={() => void dispatch.refetch()}
        />
      ) : null}
      {toast ? (
        <View style={styles.toast} accessibilityLiveRegion="polite">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
      {jobRef ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Assigning {jobRef}</Text>
        </View>
      ) : (
        <Text style={styles.hint}>Select a job from board</Text>
      )}
      {dispatch.isLoading ? (
        <View style={styles.skeletons}>
          <View style={styles.mapSkel} />
          <View style={styles.cardSkel} />
          <View style={styles.cardSkel} />
          <View style={styles.cardSkel} />
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={styles.list}>
          <DispatchMapPlaceholder />
          {techs.map((tech) => (
            <TechDutyCard
              key={tech.id}
              technician={tech}
              selectedJobRef={jobRef}
              onAssign={
                tech.duty_status === 'ON_DUTY'
                  ? () => {
                      if (!jobCardId) return;
                      setPendingTechId(tech.id);
                      assign.reset();
                    }
                  : undefined
              }
            />
          ))}
        </ScrollView>
      )}
      <Modal
        visible={Boolean(pendingTech)}
        transparent
        animationType="slide"
        onRequestClose={() => setPendingTechId(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPendingTechId(null)} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.sheetTitle}>Assign to {pendingTech?.name}?</Text>
          <Text style={styles.sheetBody}>{confirmBody}</Text>
          {assignError ? <InlineBanner message={assignError} /> : null}
          <PrimaryButton
            label="Confirm assign"
            loading={assign.isPending}
            disabled={assign.isPending || !jobCardId || !pendingTech}
            onPress={() => {
              if (!jobCardId || !pendingTech) return;
              assign.mutate(
                { jobCardId, technicianId: pendingTech.id },
                {
                  onSuccess: () => {
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    track('admin_mobile_assign_confirmed', {
                      job_card_ref: jobRef ?? jobCardId,
                      technician_id: pendingTech.id,
                    });
                    setToast(`Assigned to ${pendingTech.name}`);
                    setPendingTechId(null);
                    setTimeout(() => router.back(), 600);
                  },
                  onError: (err) => {
                    const code = err instanceof ApiError ? err.problem?.code : 'UNKNOWN';
                    track('admin_mobile_assign_failed', { error_code: code ?? 'UNKNOWN' });
                  },
                },
              );
            }}
          />
          <SecondaryButton label="Cancel" onPress={() => setPendingTechId(null)} />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10, paddingBottom: 24 },
  banner: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.card,
    padding: 12,
  },
  bannerText: { ...type.bodyMedium, color: colors.brandStrong },
  hint: { ...type.caption, color: colors.textMuted },
  toast: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.card,
    padding: 12,
  },
  toastText: { ...type.bodyMedium, color: colors.success },
  skeletons: { gap: 10 },
  mapSkel: { height: 160, borderRadius: 12, backgroundColor: colors.surfaceSubtle },
  cardSkel: { height: 88, borderRadius: radius.card, backgroundColor: colors.surfaceSubtle },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,37,50,0.35)' },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: 20,
    gap: 12,
  },
  sheetTitle: { ...type.sectionTitle, color: colors.textStrong },
  sheetBody: { ...type.body, color: colors.text },
});
