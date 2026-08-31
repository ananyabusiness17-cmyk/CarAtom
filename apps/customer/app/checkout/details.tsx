import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { ApiError } from '@caratom/api-client';

import { FlowRail } from '../../src/components/FlowRail';
import { FlowScreen } from '../../src/components/FlowScreen';
import { InlineBanner } from '../../src/components/home/InlineBanner';
import { PolicyNote } from '../../src/components/home/PolicyNote';
import { PrimaryButton } from '../../src/components/home/PrimaryButton';
import { UseMyLocationButton } from '../../src/components/location/UseMyLocationButton';
import { MapLibreView } from '../../src/components/sos/MapLibreView';
import { nextIrRouteFromDecision } from '../../src/coordinators/inspectionRepairCoordinator';
import { nextOneManRouteFromDecision } from '../../src/coordinators/oneManCoordinator';
import { nextRouteForJob } from '../../src/coordinators/serviceRepairCoordinator';
import { useEscapeBack } from '../../src/hooks/useEscapeBack';
import { useFlowRail } from '../../src/hooks/useFlowRail';
import { track } from '../../src/lib/analytics';
import { apiClient } from '../../src/lib/api';
import { newIdempotencyKey } from '../../src/lib/formatMoney';
import { firstParam } from '../../src/lib/routeParam';
import { isDraftComplete } from '../../src/lib/vehicleDraft';
import { useAuth } from '../../src/providers/AuthProvider';
import { useJobCardFlowStore } from '../../src/stores/jobCardFlowStore';
import { useVehicleDraftStore } from '../../src/stores/vehicleDraftStore';
import { colors, radius, type } from '../../src/theme/tokens';

const schema = z.object({
  full_name: z.string().min(1, 'Enter your name'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  line1: z.string().min(3, 'Enter your address'),
  locality: z.string().min(2, 'Enter locality'),
  city: z.string().min(2),
  postal_code: z.string().regex(/^\d{6}$/, 'Enter a 6-digit PIN'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type FormValues = z.infer<typeof schema>;

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return raw.startsWith('+') ? `+${digits}` : `+91${digits}`;
}

export default function DetailsScreen() {
  useEscapeBack();
  const router = useRouter();
  const params = useLocalSearchParams<{ jobCardId?: string }>();
  const jobCardId = firstParam(params.jobCardId) || undefined;
  const storedId = useJobCardFlowStore((s) => s.activeJobCardId);
  const detailsDraft = useJobCardFlowStore((s) => s.detailsDraft);
  const setDetailsDraft = useJobCardFlowStore((s) => s.setDetailsDraft);
  const rail = useFlowRail(8, 10, 4, 8);
  const draft = useVehicleDraftStore();
  const { session, profile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const id = jobCardId ?? storedId ?? '';
  const returnTo = rail.isOneman
    ? `/checkout/details?jobCardId=${id}&flow=oneman`
    : rail.isIr
      ? `/checkout/details?jobCardId=${id}&flow=ir`
      : `/checkout/details?jobCardId=${id}`;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: detailsDraft,
  });
  const latitude = form.watch('latitude');
  const longitude = form.watch('longitude');
  const hasPin = latitude != null && longitude != null;
  const mapLat = latitude ?? 12.9352;
  const mapLng = longitude ?? 77.6245;

  useEffect(() => {
    if (profile?.full_name) form.setValue('full_name', profile.full_name);
    if (profile?.phone) form.setValue('phone', profile.phone);
  }, [profile, form]);

  useEffect(() => {
    const sub = form.watch((value) => setDetailsDraft(value));
    return () => sub.unsubscribe();
  }, [form, setDetailsDraft]);

  const submit = useMutation({
    mutationFn: async (values: FormValues) => {
      setDetailsDraft(values);
      if (!session) {
        router.push({ pathname: '/(auth)/phone', params: { returnTo } });
        throw new Error('AUTH_REDIRECT');
      }
      if (!isDraftComplete(draft)) {
        throw new Error('Select your car before continuing.');
      }
      if (values.latitude == null || values.longitude == null) {
        throw new Error('Set your location on the map.');
      }
      return apiClient.finalizeJobCard(
        id,
        {
          customer: { full_name: values.full_name, phone_e164: toE164(values.phone) },
          address: {
            line1: values.line1,
            locality: values.locality,
            city: values.city,
            postal_code: values.postal_code,
            latitude: values.latitude,
            longitude: values.longitude,
          },
          vehicle: {
            make: draft.make as string,
            model: draft.model as string,
            year: draft.year as number,
            fuel_type: draft.fuelType as string,
            transmission: draft.transmission as string,
          },
          save_vehicle: true,
          save_address: true,
        },
        newIdempotencyKey(`finalize-${id}`),
      );
    },
    onSuccess: (result) => {
      track('customer_details_completed', { id });
      try {
        const href = rail.isIr
          ? nextIrRouteFromDecision(result.flow_decision, { jobCardId: id }) ??
            `/checkout/inspection-slot?jobCardId=${id}`
          : rail.isOneman
            ? nextOneManRouteFromDecision(result.flow_decision, { jobCardId: id })
            : nextRouteForJob(result.flow_decision, { jobCardId: id });
        if (href) router.push(href);
      } catch (navErr) {
        setError(navErr instanceof Error ? navErr.message : 'Could not continue to slot.');
      }
    },
    onError: (err) => {
      if (err instanceof Error && err.message === 'AUTH_REDIRECT') return;
      if (err instanceof ApiError && err.problem?.code === 'AUTH_REQUIRED') {
        router.push({ pathname: '/(auth)/phone', params: { returnTo } });
        return;
      }
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not save details.');
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
    >
      <FlowScreen>
        <FlowRail currentStep={rail.currentStep} variant={rail.variant} />
        {rail.isIr ? (
          <>
            <Text style={styles.irSub}>Visit 1 — inspection at your doorstep</Text>
            <PolicyNote>
              This books inspection visit 1. Repair is scheduled after you approve the estimate.
            </PolicyNote>
          </>
        ) : null}
        {error ? <InlineBanner message={error} /> : null}
        {!hasPin ? (
          <InlineBanner message="Use my location or drag the map pin so we know where to send the technician." />
        ) : null}
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Field label="Name">
            <Controller
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="Full name"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  accessibilityLabel="Name"
                />
              )}
            />
          </Field>
          <Field label="Phone">
            <Controller
              control={form.control}
              name="phone"
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  keyboardType="phone-pad"
                  placeholder="+91 98765 43210"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  accessibilityLabel="Phone"
                />
              )}
            />
          </Field>
          <Field label="Address">
            <Controller
              control={form.control}
              name="line1"
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  multiline
                  placeholder="Building, street, area"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, styles.multiline]}
                  accessibilityLabel="Address"
                />
              )}
            />
          </Field>
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
            name="postal_code"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                keyboardType="number-pad"
                placeholder="6-digit PIN"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                accessibilityLabel="PIN code"
                maxLength={6}
              />
            )}
          />
          <UseMyLocationButton
            onResolved={(place) => {
              form.setValue('line1', place.line1 || place.label, { shouldValidate: true });
              if (place.locality) form.setValue('locality', place.locality, { shouldValidate: true });
              if (place.city) form.setValue('city', place.city);
              if (place.postal_code && /^\d{6}$/.test(place.postal_code)) {
                form.setValue('postal_code', place.postal_code, { shouldValidate: true });
              }
              form.setValue('latitude', place.latitude);
              form.setValue('longitude', place.longitude);
            }}
          />
          <View style={styles.map} accessibilityLabel="OpenStreetMap, service address">
            <MapLibreView
              latitude={mapLat}
              longitude={mapLng}
              pinColor="#176B9E"
              interactive
              onPinMove={(lat, lng) => {
                form.setValue('latitude', lat, { shouldValidate: true });
                form.setValue('longitude', lng, { shouldValidate: true });
              }}
            />
          </View>
          {form.formState.errors.full_name ? (
            <Text style={styles.err}>{form.formState.errors.full_name.message}</Text>
          ) : null}
          {form.formState.errors.phone ? (
            <Text style={styles.err}>{form.formState.errors.phone.message}</Text>
          ) : null}
          {form.formState.errors.line1 ? (
            <Text style={styles.err}>{form.formState.errors.line1.message}</Text>
          ) : null}
          {form.formState.errors.postal_code ? (
            <Text style={styles.err}>{form.formState.errors.postal_code.message}</Text>
          ) : null}
        </ScrollView>
        <PrimaryButton
          label={
            rail.isIr
              ? 'Continue to inspection slot'
              : rail.isOneman
                ? 'Pick a slot'
                : 'Continue to slot'
          }
          loading={submit.isPending}
          disabled={submit.isPending || !hasPin || !isDraftComplete(draft)}
          onPress={form.handleSubmit((values) => void submit.mutate(values))}
        />
      </FlowScreen>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: 12, paddingBottom: 16 },
  field: { gap: 6 },
  label: { ...type.label, color: colors.textMuted },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    color: colors.text,
    ...type.body,
  },
  multiline: { minHeight: 72, paddingTop: 10 },
  map: {
    height: 140,
    borderRadius: radius.card,
    backgroundColor: colors.surfaceSubtle,
    overflow: 'hidden',
  },
  err: { ...type.caption, color: colors.danger },
  irSub: { ...type.body, color: colors.textMuted },
});
