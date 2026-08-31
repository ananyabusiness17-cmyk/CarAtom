import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FlowScreen } from '../../src/components/FlowScreen';
import { InspectionFlowRail } from '../../src/components/InspectionFlowRail';
import { InlineBanner } from '../../src/components/home/InlineBanner';
import { PolicyNote } from '../../src/components/home/PolicyNote';
import { PrimaryButton } from '../../src/components/home/PrimaryButton';
import { apiClient } from '../../src/lib/api';
import { IR_OFFERING_SLUG } from '@caratom/contracts';
import { useJobCardFlowStore } from '../../src/stores/jobCardFlowStore';
import { colors, radius, type } from '../../src/theme/tokens';

const STEPS = [
  'Visit 1 — Technician inspects and documents findings',
  'You review estimate and approve repair scope',
  'We order parts · pay advance when required',
  'Visit 2 — We repair at your doorstep',
];

export default function IrOfferingScreen() {
  const router = useRouter();
  const setFlowKind = useJobCardFlowStore((s) => s.setFlowKind);
  const setOfferingSlug = useJobCardFlowStore((s) => s.setOfferingSlug);
  const setLastIrStep = useJobCardFlowStore((s) => s.setLastIrStep);
  const [sheet, setSheet] = useState(false);

  const offering = useQuery({
    queryKey: ['service', IR_OFFERING_SLUG],
    queryFn: () => apiClient.getService(IR_OFFERING_SLUG),
  });

  const inactive = offering.data && !offering.data.is_active;

  return (
    <FlowScreen>
      <InspectionFlowRail currentStep={1} />
      {offering.isError ? (
        <InlineBanner
          message="Could not load this offering."
          actionLabel="Retry"
          onAction={() => void offering.refetch()}
        />
      ) : null}
      {inactive ? (
        <InlineBanner message="Not available in your area. Contact support if you still need an inspection." />
      ) : null}
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.kicker}>Inspection + repair · 2 visits</Text>
        <Text style={styles.title}>{"We'll inspect first, then quote repair"}</Text>
        <View style={styles.hero} accessibilityElementsHidden>
          <Ionicons name="clipboard-outline" size={40} color={colors.brandStrong} />
        </View>
        <PolicyNote>Quote after inspection · separate repair visit</PolicyNote>
        <Pressable onPress={() => setSheet(true)} accessibilityRole="button">
          <Text style={styles.link}>How two visits work</Text>
        </Pressable>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How it works</Text>
          {STEPS.map((step, index) => (
            <Text key={step} style={styles.step}>
              {index + 1}. {step}
            </Text>
          ))}
        </View>
        <Text style={styles.price}>
          {offering.data?.inspection_fee_display ?? 'Inspection from ₹499 · repair price after inspection'}
        </Text>
        <Text style={styles.footer}>Not the same as adding a known repair to general service</Text>
      </ScrollView>
      <PrimaryButton
        label="Describe the problem"
        disabled={Boolean(inactive)}
        onPress={() => {
          setFlowKind('ir');
          setOfferingSlug(IR_OFFERING_SLUG);
          setLastIrStep('/inspection-repair/symptoms');
          router.push('/inspection-repair/symptoms');
        }}
      />
      <Modal visible={sheet} animationType="slide" transparent onRequestClose={() => setSheet(false)}>
        <Pressable style={styles.sheetScrim} onPress={() => setSheet(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.cardTitle}>How it works</Text>
            {STEPS.map((step) => (
              <Text key={step} style={styles.step}>
                {step}
              </Text>
            ))}
            <PrimaryButton label="Got it" onPress={() => setSheet(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingBottom: 16 },
  kicker: { ...type.caption, color: colors.brandStrong, fontWeight: '700' },
  title: { ...type.navTitle, fontSize: 22, color: colors.textStrong },
  hero: {
    height: 120,
    borderRadius: radius.card,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: { ...type.bodyMedium, color: colors.brandStrong },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { ...type.sectionTitle, color: colors.textStrong },
  step: { ...type.body, color: colors.text },
  price: { ...type.bodyMedium, color: colors.textStrong },
  footer: { ...type.caption, color: colors.textMuted },
  sheetScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(20,37,50,0.35)',
  },
  sheet: {
    backgroundColor: colors.canvas,
    padding: 20,
    gap: 10,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
});
