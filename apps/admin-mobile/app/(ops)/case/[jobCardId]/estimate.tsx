import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { Screen } from '../../../../src/components/Screen';
import { SecondaryButton } from '../../../../src/components/SecondaryButton';
import { apiClient } from '../../../../src/lib/api';
import { formatInr } from '../../../../src/lib/formatMoney';
import { useEstimateDraftStore } from '../../../../src/stores/estimateDraftStore';
import { colors, radius, type } from '../../../../src/theme/tokens';

export default function EstimateEditorScreen() {
  const { jobCardId } = useLocalSearchParams<{ jobCardId: string }>();
  const router = useRouter();
  const lines = useEstimateDraftStore((s) => s.lines);
  const addLine = useEstimateDraftStore((s) => s.addLine);
  const removeLine = useEstimateDraftStore((s) => s.removeLine);
  const updateAmount = useEstimateDraftStore((s) => s.updateAmount);
  const [sheet, setSheet] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customAmount, setCustomAmount] = useState('450');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const catalog = useQuery({
    queryKey: ['repair-offerings'],
    queryFn: () => apiClient.getRepairOfferings(),
    enabled: sheet,
  });

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.amount_minor, 0),
    [lines],
  );

  return (
    <Screen>
      <View style={styles.chip}>
        <Text style={styles.chipText}>Sales advisor · live call</Text>
      </View>
      <Text style={styles.note}>
        Advisor adds or removes lines with customer. Technician app never gets this screen.
      </Text>
      <ScrollView contentContainerStyle={styles.list}>
        {lines.map((line) => {
          const active = selectedKey === line.key;
          return (
            <Pressable
              key={line.key}
              onPress={() => setSelectedKey(line.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.row, active ? styles.rowActive : null]}
            >
              <View style={styles.meta}>
                <Text style={styles.label} numberOfLines={2}>
                  {line.label}
                </Text>
                <TextInput
                  value={String(Math.round(line.amount_minor / 100))}
                  keyboardType="number-pad"
                  onChangeText={(value) => {
                    const rupees = Number(value.replace(/\D/g, ''));
                    updateAmount(line.key, Number.isFinite(rupees) ? rupees * 100 : 0);
                  }}
                  style={styles.amountInput}
                  accessibilityLabel={`${line.label} amount in rupees`}
                />
              </View>
              <Text style={styles.amount}>{formatInr(line.amount_minor)}</Text>
            </Pressable>
          );
        })}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total to send</Text>
          <Text style={styles.totalValue}>{formatInr(total)}</Text>
        </View>
      </ScrollView>
      <View style={styles.actions}>
        <View style={styles.half}>
          <SecondaryButton label="+ Add line" onPress={() => setSheet(true)} />
        </View>
        <View style={styles.half}>
          <SecondaryButton
            label="Remove line"
            disabled={!selectedKey}
            onPress={() => {
              if (selectedKey) removeLine(selectedKey);
              setSelectedKey(null);
            }}
          />
        </View>
      </View>
      <PrimaryButton
        label="Ready to send to app"
        onPress={() => router.push(`/(ops)/case/${jobCardId}/send`)}
      />
      <Modal visible={sheet} animationType="slide" transparent onRequestClose={() => setSheet(false)}>
        <Pressable style={styles.sheetScrim} onPress={() => setSheet(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>Add a line</Text>
            {catalog.isError ? (
              <Text style={styles.note}>Could not load the repair catalog. Add a custom line instead.</Text>
            ) : null}
            <ScrollView style={styles.catalog}>
              {(catalog.data?.items ?? []).map((item) => (
                <Pressable
                  key={item.slug}
                  style={styles.catalogRow}
                  onPress={() => {
                    addLine({
                      key: `${item.slug}-${Date.now()}`,
                      kind: 'REPAIR',
                      label: item.name,
                      repair_offering_slug: item.slug,
                      amount_minor: item.display_price.amount_minor,
                    });
                    setSheet(false);
                  }}
                >
                  <Text style={styles.label}>{item.name}</Text>
                  <Text style={styles.amount}>{formatInr(item.display_price.amount_minor)}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.note}>Or a custom label</Text>
            <TextInput
              value={customLabel}
              onChangeText={setCustomLabel}
              placeholder="Brake fluid flush"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              accessibilityLabel="Custom line label"
            />
            <TextInput
              value={customAmount}
              onChangeText={setCustomAmount}
              keyboardType="number-pad"
              placeholder="450"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              accessibilityLabel="Custom amount in rupees"
            />
            <PrimaryButton
              label="Add custom line"
              disabled={!customLabel.trim()}
              onPress={() => {
                const rupees = Number(customAmount.replace(/\D/g, '')) || 0;
                addLine({
                  key: `custom-${Date.now()}`,
                  kind: 'REPAIR',
                  label: customLabel.trim(),
                  amount_minor: rupees * 100,
                });
                setCustomLabel('');
                setSheet(false);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warningSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { ...type.caption, color: colors.warning, fontWeight: '700' },
  note: { ...type.body, color: colors.textMuted },
  list: { gap: 8, paddingBottom: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    gap: 12,
  },
  rowActive: { borderColor: colors.selectionBorder, backgroundColor: colors.selectionBg },
  meta: { flex: 1, gap: 6 },
  label: { ...type.body, color: colors.textStrong },
  amountInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    color: colors.text,
  },
  amount: { ...type.bodyMedium, color: colors.textStrong },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: { ...type.bodyMedium, color: colors.textStrong },
  totalValue: { ...type.price, color: colors.textStrong },
  actions: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  sheetScrim: {
    flex: 1,
    backgroundColor: 'rgba(20, 37, 50, 0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: 16,
    gap: 10,
    maxHeight: '80%',
  },
  sheetTitle: { ...type.sectionTitle, color: colors.textStrong },
  catalog: { maxHeight: 220 },
  catalogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    alignItems: 'center',
    paddingVertical: 8,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: colors.text,
  },
});
