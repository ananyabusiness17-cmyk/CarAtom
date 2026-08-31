import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { InlineBanner } from '../../../../src/components/InlineBanner';
import { OfflineBanner } from '../../../../src/components/OfflineBanner';
import { PartsEntryList, type PartRow } from '../../../../src/components/PartsEntryList';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { SecondaryButton } from '../../../../src/components/SecondaryButton';
import { VisitScreen } from '../../../../src/components/VisitScreen';
import { useVisitMutations } from '../../../../src/hooks/useVisitMutations';
import { useVisitDetail } from '../../../../src/hooks/useVisitQueries';
import { colors, radius, type } from '../../../../src/theme/tokens';

export default function PartsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mutations = useVisitMutations(id ?? '');
  const detail = useVisitDetail(id);
  const [parts, setParts] = useState<PartRow[]>([]);
  const [sku, setSku] = useState('');
  const [label, setLabel] = useState('');
  const [qty, setQty] = useState('1');
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const kit = detail.data?.kit;

  if (!id) return null;

  function addPart(row: PartRow) {
    setParts((current) => [...current, row]);
    setSku('');
    setLabel('');
    setQty('1');
    setAdding(false);
    setNotice(null);
  }

  function addFreeText() {
    const quantity = Number(qty);
    if (!sku.trim() || !label.trim() || !(quantity > 0)) {
      setNotice('Enter SKU, label, and a quantity. Selling price is not collected.');
      return;
    }
    addPart({ sku_code: sku.trim(), label: label.trim(), quantity, intent: 'FIT' });
  }

  async function save() {
    await mutations.parts({ lines: parts });
    router.back();
  }

  return (
    <View style={styles.flex}>
      <OfflineBanner />
      <VisitScreen step={6}>
        <Text style={styles.intro}>
          Trace what you fitted — SKU, qty, notes. No selling price on this screen.
        </Text>
        {(kit?.warnings ?? []).map((warn) => (
          <InlineBanner key={warn} tone="warning" message={warn} />
        ))}
        {(kit?.lines ?? []).filter((line) => line.line_kind === 'PART' && line.sku_code).length ? (
          <View style={styles.kit}>
            <Text style={styles.kitTitle}>Van kit for this visit</Text>
            {kit?.lines
              .filter((line) => line.line_kind === 'PART' && line.sku_code)
              .map((line) => (
                <Pressable
                  key={line.sku_code}
                  onPress={() =>
                    addPart({
                      sku_code: line.sku_code ?? '',
                      label: line.label,
                      quantity: line.quantity,
                      intent: 'FIT',
                    })
                  }
                  style={styles.kitRow}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${line.label}`}
                >
                  <Text style={styles.label}>{line.label}</Text>
                  <Text style={styles.meta}>
                    {line.sku_code} · van {line.van_qty ?? 0} · {line.availability.replace(/_/g, ' ').toLowerCase()}
                  </Text>
                </Pressable>
              ))}
          </View>
        ) : null}
        <PartsEntryList parts={parts} />
        {adding ? (
          <View style={styles.form}>
            <TextInput
              value={sku}
              onChangeText={setSku}
              placeholder="SKU"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              style={styles.input}
              accessibilityLabel="SKU code"
            />
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="Part label"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              accessibilityLabel="Part label"
            />
            <TextInput
              value={qty}
              onChangeText={setQty}
              keyboardType="number-pad"
              placeholder="Qty"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              accessibilityLabel="Quantity"
            />
            <PrimaryButton label="Add SKU" onPress={addFreeText} />
          </View>
        ) : null}
        {notice ? <InlineBanner tone="warning" message={notice} /> : null}
        {mutations.error ? <InlineBanner message={mutations.error} /> : null}
        <SecondaryButton
          label="Scan barcode"
          onPress={() => setNotice('Barcode scan ships with van hardware in a later phase.')}
        />
        <SecondaryButton
          label="+ Add part from van stock"
          onPress={() => {
            setAdding(true);
            setNotice(null);
          }}
        />
        <PrimaryButton
          label="Save parts for this visit"
          loading={mutations.busy}
          onPress={() => void save()}
        />
      </VisitScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  intro: { ...type.body, color: colors.text },
  kit: { gap: 6 },
  kitTitle: { ...type.label, color: colors.textStrong },
  kitRow: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  label: { ...type.bodyMedium, color: colors.text },
  meta: { ...type.caption, color: colors.textMuted },
  form: { gap: 8 },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    color: colors.text,
  },
});
