import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { InlineBanner } from '../../../../src/components/InlineBanner';
import { OfflineBanner } from '../../../../src/components/OfflineBanner';
import { PartsEntryList, type PartRow } from '../../../../src/components/PartsEntryList';
import { PrimaryButton } from '../../../../src/components/PrimaryButton';
import { SecondaryButton } from '../../../../src/components/SecondaryButton';
import { VisitScreen } from '../../../../src/components/VisitScreen';
import { useVisitMutations } from '../../../../src/hooks/useVisitMutations';
import { colors, radius, type } from '../../../../src/theme/tokens';


export default function PartsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mutations = useVisitMutations(id ?? '');
  const [parts, setParts] = useState<PartRow[]>([]);
  const [sku, setSku] = useState('');
  const [label, setLabel] = useState('');
  const [qty, setQty] = useState('1');
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!id) return null;

  function addPart() {
    const quantity = Number(qty);
    if (!sku.trim() || !label.trim() || !(quantity > 0)) {
      setNotice('Enter SKU, label, and a quantity. Selling price is not collected.');
      return;
    }
    setParts((current) => [...current, { sku_code: sku.trim(), label: label.trim(), quantity }]);
    setSku('');
    setLabel('');
    setQty('1');
    setAdding(false);
    setNotice(null);
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
            <PrimaryButton label="Add SKU" onPress={addPart} />
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
