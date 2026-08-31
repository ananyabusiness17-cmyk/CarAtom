import { PrimaryButton } from '../components/home/PrimaryButton';
import { colors, type } from '../theme/tokens';
import { StyleSheet, Text, View } from 'react-native';

export function existingBookingIdFromError(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const id = record.booking_id ?? record.existing_booking_id;
  return typeof id === 'string' ? id : null;
}

export function DuplicateBookingRecovery({
  bookingId: _bookingId,
  onOpen,
}: {
  bookingId: string;
  onOpen: () => void;
}) {
  return (
    <View accessibilityRole="alert" style={styles.box}>
      <Text style={styles.title}>This visit is already booked</Text>
      <Text style={styles.body}>Open the existing booking instead of creating another.</Text>
      <PrimaryButton label="Open existing booking" onPress={onOpen} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10, paddingVertical: 8 },
  title: { ...type.sectionTitle, color: colors.textStrong },
  body: { ...type.body, color: colors.text },
});
