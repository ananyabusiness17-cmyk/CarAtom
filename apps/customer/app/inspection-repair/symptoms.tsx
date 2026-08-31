import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FlowScreen } from '../../src/components/FlowScreen';
import { InspectionFlowRail } from '../../src/components/InspectionFlowRail';
import { PrimaryButton } from '../../src/components/home/PrimaryButton';
import { SecondaryButton } from '../../src/components/SecondaryButton';
import { useJobCardFlowStore } from '../../src/stores/jobCardFlowStore';
import { colors, radius, type } from '../../src/theme/tokens';

const DONT_KNOW = "I don't know — please inspect";

export default function IrSymptomsScreen() {
  const router = useRouter();
  const symptoms = useJobCardFlowStore((s) => s.symptoms);
  const setSymptoms = useJobCardFlowStore((s) => s.setSymptoms);
  const setLastIrStep = useJobCardFlowStore((s) => s.setLastIrStep);
  const [text, setText] = useState(symptoms);
  const valid = text.trim().length >= 10 || text.trim() === DONT_KNOW;

  function persist(next: string) {
    setText(next);
    setSymptoms(next);
  }

  return (
    <FlowScreen>
      <InspectionFlowRail currentStep={2} />
      <Text style={styles.title}>{"What's happening with the car?"}</Text>
      <Text style={styles.sub}>
        {"Describe symptoms, noises, or concerns. We'll investigate on visit 1."}
      </Text>
      <TextInput
        value={text}
        onChangeText={persist}
        placeholder="e.g. Brake noise, vibration, warning light, fluid leak…"
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={500}
        style={styles.input}
        accessibilityLabel="Symptoms"
      />
      <Text style={styles.count}>{text.length}/500</Text>
      <Pressable
        onPress={() => persist(DONT_KNOW)}
        accessibilityRole="button"
        style={styles.chip}
      >
        <Text style={styles.chipLabel}>{DONT_KNOW}</Text>
      </Pressable>
      <Text style={styles.helper}>Be specific — it helps the technician prepare.</Text>
      <View style={styles.grow} />
      <SecondaryButton
        label="Add photos (optional)"
        onPress={() => {
          setLastIrStep('/inspection-repair/photos');
          router.push('/inspection-repair/photos');
        }}
      />
      <PrimaryButton
        label="Continue"
        disabled={!valid}
        onPress={() => {
          setLastIrStep('/inspection-repair/photos');
          router.push('/inspection-repair/photos');
        }}
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.navTitle, color: colors.textStrong },
  sub: { ...type.body, color: colors.textMuted },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.surface,
    color: colors.text,
    ...type.body,
    textAlignVertical: 'top',
  },
  count: { ...type.caption, color: colors.textMuted, textAlign: 'right' },
  chip: {
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  chipLabel: { ...type.caption, color: colors.brandStrong },
  helper: { ...type.caption, color: colors.textMuted },
  grow: { flex: 1 },
});
