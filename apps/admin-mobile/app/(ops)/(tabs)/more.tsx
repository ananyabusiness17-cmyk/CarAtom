import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { OpenInWebLink } from '../../../src/components/OpenInWebLink';
import { Screen } from '../../../src/components/Screen';
import { type WebOpsPathKey, webOpsUrl } from '../../../src/config/webOpsUrls';
import { colors, layout, type } from '../../../src/theme/tokens';

const ROWS: { key: WebOpsPathKey; label: string }[] = [
  { key: 'inventory', label: 'Inventory' },
  { key: 'technicians', label: 'Technician tracking' },
  { key: 'content', label: 'Landing photos / copy' },
  { key: 'reports', label: 'Reports' },
  { key: 'settings', label: 'Service hours & radius' },
  { key: 'audit', label: 'Audit log' },
  { key: 'catalog', label: 'Catalog & prices' },
  { key: 'payments', label: 'Payments & ledger' },
  { key: 'book', label: 'Book for customer' },
];

export default function MoreScreen() {
  const router = useRouter();
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.list}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => router.push('/(ops)/notifications')}
          style={styles.local}
        >
          <Text style={styles.localText}>Notifications</Text>
        </Pressable>
        {ROWS.map((row) => (
          <OpenInWebLink key={row.key} url={webOpsUrl(row.key)} label={row.label} pathKey={row.key} />
        ))}
        <Text style={styles.footer}>Full catalog, money, and job editor open in admin web.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4, paddingBottom: 24 },
  footer: { ...type.caption, color: colors.textMuted, marginTop: 16 },
  local: { minHeight: layout.minTouch, justifyContent: 'center' },
  localText: { ...type.body, color: colors.brandStrong },
});
