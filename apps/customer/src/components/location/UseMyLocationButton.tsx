import type { ReverseGeocode } from '@caratom/contracts';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LocationDeniedError, resolveCurrentPlace } from '../../lib/resolveCurrentPlace';
import { colors, type } from '../../theme/tokens';
import { SecondaryButton } from '../SecondaryButton';

export function UseMyLocationButton({
  onResolved,
  disabled,
}: {
  onResolved: (place: ReverseGeocode) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fill() {
    setBusy(true);
    setError(null);
    try {
      onResolved(await resolveCurrentPlace());
    } catch (err) {
      if (err instanceof LocationDeniedError) {
        setError('Location permission denied. Enter the address, or allow location and try again.');
        return;
      }
      setError('Could not read this location. Check the pin or type the address.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <SecondaryButton
        label={busy ? 'Finding you…' : 'Use my location'}
        disabled={disabled || busy}
        onPress={() => void fill()}
      />
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  err: { ...type.caption, color: colors.danger },
});
