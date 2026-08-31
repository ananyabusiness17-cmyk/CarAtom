import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { UseMyLocationButton } from '../location/UseMyLocationButton';
import { PrimaryButton } from '../home/PrimaryButton';
import { MapLibreView } from '../sos/MapLibreView';
import { colors, radius, type } from '../../theme/tokens';

const schema = z.object({
  line1: z.string().min(3, 'Enter your address'),
  locality: z.string().min(2, 'Enter locality'),
  city: z.string().min(2, 'Enter city'),
  postal_code: z.string().regex(/^\d{6}$/, 'Enter a 6-digit PIN'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type AddressFormValues = z.infer<typeof schema>;

export function AddressForm({
  defaultValues,
  submitting,
  onSubmit,
}: {
  defaultValues?: Partial<AddressFormValues>;
  submitting?: boolean;
  onSubmit: (values: AddressFormValues) => void;
}) {
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      line1: defaultValues?.line1 ?? '',
      locality: defaultValues?.locality ?? '',
      city: defaultValues?.city ?? 'Bengaluru',
      postal_code: defaultValues?.postal_code ?? '',
      latitude: defaultValues?.latitude,
      longitude: defaultValues?.longitude,
    },
  });
  const lat = form.watch('latitude');
  const lng = form.watch('longitude');

  return (
    <View style={styles.form}>
      <UseMyLocationButton
        disabled={submitting}
        onResolved={(place) => {
          form.setValue('line1', place.line1 || place.label, { shouldValidate: true });
          if (place.locality) form.setValue('locality', place.locality, { shouldValidate: true });
          if (place.city) form.setValue('city', place.city, { shouldValidate: true });
          if (place.postal_code && /^\d{6}$/.test(place.postal_code)) {
            form.setValue('postal_code', place.postal_code, { shouldValidate: true });
          }
          form.setValue('latitude', place.latitude);
          form.setValue('longitude', place.longitude);
        }}
      />
      {lat != null && lng != null ? (
        <View style={styles.map} accessibilityLabel="OpenStreetMap, saved address">
          <MapLibreView latitude={lat} longitude={lng} pinColor="#176B9E" />
        </View>
      ) : null}
      <Controller
        control={form.control}
        name="line1"
        render={({ field }) => (
          <TextInput
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Building, street, area"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            accessibilityLabel="Address line"
          />
        )}
      />
      <Controller
        control={form.control}
        name="locality"
        render={({ field }) => (
          <TextInput
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Locality"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            accessibilityLabel="Locality"
          />
        )}
      />
      <Controller
        control={form.control}
        name="city"
        render={({ field }) => (
          <TextInput
            value={field.value}
            onChangeText={field.onChange}
            placeholder="City"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            accessibilityLabel="City"
          />
        )}
      />
      <Controller
        control={form.control}
        name="postal_code"
        render={({ field }) => (
          <TextInput
            value={field.value}
            onChangeText={field.onChange}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="560034"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            accessibilityLabel="PIN code"
          />
        )}
      />
      {form.formState.errors.line1 ? (
        <Text style={styles.err}>{form.formState.errors.line1.message}</Text>
      ) : null}
      {form.formState.errors.postal_code ? (
        <Text style={styles.err}>{form.formState.errors.postal_code.message}</Text>
      ) : null}
      <PrimaryButton
        label="Save address"
        loading={submitting}
        onPress={form.handleSubmit(onSubmit)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 10 },
  map: {
    height: 140,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSubtle,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    color: colors.text,
    ...type.body,
  },
  err: { ...type.caption, color: colors.danger },
});
