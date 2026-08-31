import { ApiError } from '@caratom/api-client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FlowScreen } from '../../src/components/FlowScreen';
import { InlineBanner } from '../../src/components/home/InlineBanner';
import { PrimaryButton } from '../../src/components/home/PrimaryButton';
import { UseMyLocationButton } from '../../src/components/location/UseMyLocationButton';
import { SosMap } from '../../src/components/sos/SosMap';
import { nextSosRoute } from '../../src/coordinators/sosCoordinator';
import { useLiveLocation } from '../../src/hooks/useLiveLocation';
import { apiClient } from '../../src/lib/api';
import { newIdempotencyKey } from '../../src/lib/formatMoney';
import { issueFromTile, SOS_ISSUES } from '../../src/lib/sosIssues';
import { useAuth } from '../../src/providers/AuthProvider';
import { useSosSessionStore } from '../../src/stores/sosSessionStore';
import { colors, radius, type } from '../../src/theme/tokens';

const PICK_ISSUES = SOS_ISSUES;

export default function SosPickScreen() {
  const router = useRouter();
  const { issue } = useLocalSearchParams<{ issue?: string }>();
  const { session } = useAuth();
  const location = useLiveLocation();
  const setActive = useSosSessionStore((s) => s.setActiveTicketId);
  const prefill = issueFromTile(issue);
  const [selected, setSelected] = useState(prefill?.code ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [userPinned, setUserPinned] = useState(false);
  const [pin, setPin] = useState({
    latitude: location.latitude,
    longitude: location.longitude,
    label: location.label,
  });
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chosen = useMemo(() => PICK_ISSUES.find((row) => row.code === selected), [selected]);
  const returnTo = selected ? `/sos/pick?issue=${selected}` : '/sos/pick';

  useEffect(() => {
    return () => {
      if (reverseTimer.current) clearTimeout(reverseTimer.current);
    };
  }, []);

  useEffect(() => {
    if (userPinned) return;
    setPin({
      latitude: location.latitude,
      longitude: location.longitude,
      label: location.label,
    });
  }, [location, userPinned]);

  function reverseSoon(lat: number, lng: number) {
    if (reverseTimer.current) clearTimeout(reverseTimer.current);
    reverseTimer.current = setTimeout(() => {
      void apiClient
        .reverseGeocode(lat, lng)
        .then((geo) => {
          setPin((prev) =>
            prev.latitude === lat && prev.longitude === lng
              ? { ...prev, label: geo.label }
              : prev,
          );
        })
        .catch(() => {
          /* keep last label */
        });
    }, 1000);
  }

  async function submit() {
    if (!chosen) return;
    if (!session) {
      router.push({ pathname: '/(auth)/phone', params: { returnTo } });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ticket = await apiClient.createSupportTicket(
        {
          ticket_type: 'ROADSIDE',
          issue_code: chosen.code,
          issue_label: chosen.label,
          latitude: pin.latitude,
          longitude: pin.longitude,
          location_label: pin.label,
        },
        newIdempotencyKey('sos'),
      );
      setActive(ticket.id);
      router.replace(nextSosRoute(ticket.status, ticket.id));
    } catch (err) {
      if (err instanceof ApiError && err.problem?.code === 'AUTH_REQUIRED') {
        router.push({ pathname: '/(auth)/phone', params: { returnTo } });
        return;
      }
      if (err instanceof ApiError && err.problem?.code === 'SOS_ALREADY_ACTIVE') {
        try {
          const list = await apiClient.listSupportTickets();
          const open = list.items.find((row) =>
            ['CREATED', 'OPS_NOTIFIED', 'DISPATCHED_STUB'].includes(row.status),
          );
          if (open) {
            setActive(open.id);
            router.replace(nextSosRoute(open.status, open.id));
            return;
          }
        } catch {
          /* keep banner */
        }
        setError('A roadside request is already open.');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Could not reach CARATOM ops.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <FlowScreen>
      {error ? <InlineBanner message={error} /> : null}
      <SosMap
        latitude={pin.latitude}
        longitude={pin.longitude}
        interactive
        height={220}
        onPinMove={(lat, lng) => {
          setUserPinned(true);
          setPin((prev) => ({ ...prev, latitude: lat, longitude: lng }));
          reverseSoon(lat, lng);
        }}
      />
      <Text style={styles.hint}>{pin.label}</Text>
      <Text style={styles.sub}>Drag the pin if this isn’t where you are</Text>
      {location.permissionDenied ? (
        <InlineBanner message="Location permission denied. Using Koramangala — drag the pin or use my location." />
      ) : null}
      <UseMyLocationButton
        onResolved={(place) => {
          setUserPinned(true);
          setPin({
            latitude: place.latitude,
            longitude: place.longitude,
            label: place.source === 'nominatim' ? `${place.label} · live GPS` : place.label,
          });
        }}
      />
      <Text style={styles.lead}>What’s wrong?</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {PICK_ISSUES.map((row) => {
          const active = row.code === selected;
          return (
            <Pressable
              key={row.code}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${row.label}. ${row.subtitle}`}
              onPress={() => setSelected(row.code)}
              style={[styles.row, active ? styles.rowActive : null]}
            >
              <View style={styles.copy}>
                <Text style={styles.label}>{row.label}</Text>
                <Text style={styles.sub}>{row.subtitle}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <PrimaryButton
        tone="sos"
        label="Call with this issue"
        disabled={!chosen}
        loading={busy}
        onPress={() => void submit()}
      />
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  hint: { ...type.bodyMedium, color: colors.textStrong },
  sub: { ...type.caption, color: colors.textMuted },
  lead: { ...type.sectionTitle, color: colors.textStrong },
  list: { gap: 10, paddingBottom: 16 },
  row: {
    minHeight: 64,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    justifyContent: 'center',
  },
  rowActive: { borderColor: colors.sosAccent, backgroundColor: colors.warningSoft },
  copy: { gap: 4 },
  label: { ...type.bodyMedium, color: colors.textStrong },
});
