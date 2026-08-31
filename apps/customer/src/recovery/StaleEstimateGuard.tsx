import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/home/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { colors, type } from '../theme/tokens';

export { isStaleEstimate } from './staleGuards';

export function StaleEstimateGuard({
  visible,
  onReview,
  onEdit,
}: {
  visible: boolean;
  onReview: () => void;
  onEdit: () => void;
}) {
  if (!visible) return null;
  return (
    <View accessibilityRole="alert" style={styles.box}>
      <Text style={styles.title}>Estimate updated</Text>
      <Text style={styles.body}>The price changed. Review the new estimate before you continue.</Text>
      <PrimaryButton label="Review new estimate" onPress={onReview} />
      <SecondaryButton label="Edit job card" onPress={onEdit} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10, paddingVertical: 8 },
  title: { ...type.sectionTitle, color: colors.textStrong },
  body: { ...type.body, color: colors.text },
});
