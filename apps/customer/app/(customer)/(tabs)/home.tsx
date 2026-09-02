import { ApiError } from '@caratom/api-client';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { HomeMasthead } from '../../../src/components/home/HomeMasthead';
import { HomeSkeleton } from '../../../src/components/home/HomeSkeleton';
import { IncludedList } from '../../../src/components/home/IncludedList';
import { InlineBanner } from '../../../src/components/home/InlineBanner';
import { ModeTabs } from '../../../src/components/home/ModeTabs';
import { OneManGrid } from '../../../src/components/home/OneManGrid';
import { PackageCard } from '../../../src/components/home/PackageCard';
import { PolicyNote } from '../../../src/components/home/PolicyNote';
import { PrimaryButton } from '../../../src/components/home/PrimaryButton';
import { RepairCarChoices } from '../../../src/components/home/RepairCarChoices';
import { SosPanel } from '../../../src/components/home/SosPanel';
import { TrustStrip } from '../../../src/components/home/TrustStrip';
import { SecondaryButton } from '../../../src/components/SecondaryButton';
import { SosMap } from '../../../src/components/sos/SosMap';
import { useLiveLocation } from '../../../src/hooks/useLiveLocation';
import { track } from '../../../src/lib/analytics';
import { apiClient } from '../../../src/lib/api';
import { presentationForTab } from '../../../src/lib/homeContent';
import { assertGlossary, type ModeTabId } from '../../../src/lib/modeTabs';
import { vehicleLabel, pickVehicleDraft } from '../../../src/lib/vehicleDraft';
import { gprVehicleParams, nextVehicleGate, savedVehicleParams } from '../../../src/lib/presentVehicle';
import { useJobCardFlowStore } from '../../../src/stores/jobCardFlowStore';
import { useVehicleDraftStore } from '../../../src/stores/vehicleDraftStore';
import { colors, layout, radius, shadow, type } from '../../../src/theme/tokens';

assertGlossary();

export default function HomeScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<ModeTabId>('repair');
  const [error, setError] = useState<string | null>(null);
  const draft = useVehicleDraftStore();
  const setFlowKind = useJobCardFlowStore((s) => s.setFlowKind);
  const location = useLiveLocation(tab === 'sos');
  const carLabel = vehicleLabel(draft);
  const catalogQuery = useQuery({
    queryKey: ['catalog', 'home'],
    queryFn: () => apiClient.getCatalogHome(),
    staleTime: 5 * 60_000,
  });
  const catalog = catalogQuery.data ?? null;
  const loading = catalogQuery.isPending || catalogQuery.isFetching;
  const showCatalogBody = Boolean(catalog) && !catalogQuery.isError;

  const refetchCatalog = catalogQuery.refetch;
  const load = useCallback(async () => {
    setError(null);
    try {
      const next = await refetchCatalog();
      if (next.data) track('home_viewed', { area: next.data.service_area.slug });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not load services.';
      setError(message);
    }
  }, [refetchCatalog]);

  useEffect(() => {
    if (catalogQuery.data) track('home_viewed', { area: catalogQuery.data.service_area.slug });
  }, [catalogQuery.data]);

  useEffect(() => {
    if (catalogQuery.isError) {
      setError(
        catalogQuery.error instanceof ApiError ? catalogQuery.error.message : 'Could not load services.',
      );
    }
  }, [catalogQuery.error, catalogQuery.isError]);

  const ad = useMemo(() => {
    const blocks = catalog?.hero.blocks ?? [];
    return (
      blocks.find((block) => block.tab === 'repair') ??
      blocks[0] ?? {
        kicker: 'Doorstep · Koramangala',
        title: 'Service that comes to you',
      }
    );
  }, [catalog]);

  const presentation = catalog ? presentationForTab(tab, catalog) : null;
  const offering = catalog?.sections.general_service.offering;
  const locality = catalog?.service_area.name.split(',')[0] ?? 'Koramangala';

  return (
    <View style={styles.screen}>
      <HomeMasthead
        locality={locality}
        vehicleLabel={carLabel}
        kicker={ad.kicker}
        title={ad.title}
        onVehiclePress={() => {
          router.push({
            pathname: '/vehicle/make',
            params: savedVehicleParams(),
          });
        }}
        onLocationPress={() => router.push('/addresses')}
        onNotificationsPress={() => router.push('/notifications')}
      />
      <View style={styles.dock}>
        <View style={styles.dockInner}>
          <ModeTabs
            active={tab}
            onChange={(next) => {
              setTab(next);
              track('home_tab_changed', { tab: next });
            }}
          />
          <View style={styles.folderSheet}>
            {loading ? <HomeSkeleton /> : null}
            {error ? (
              <View style={styles.pad}>
                <InlineBanner message={error} actionLabel="Retry" onAction={() => void load()} />
              </View>
            ) : null}
            {!loading && catalog && !catalog.service_area.serviceable ? (
              <View style={styles.pad}>
                <InlineBanner message="Services unavailable in your area" />
              </View>
            ) : null}
            {!loading && !showCatalogBody && !error ? (
              <View style={styles.pad}>
                <InlineBanner
                  message="Could not load services. Check your connection and try again."
                  actionLabel="Retry"
                  onAction={() => void load()}
                />
              </View>
            ) : null}
            {showCatalogBody && catalog ? (
              <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
                {tab !== 'sos' && tab !== 'oneman' ? (
                  <View style={styles.searchRow}>
                    <Ionicons name="search" size={18} color={colors.textMuted} />
                    <TextInput
                      editable={false}
                      placeholder={catalog.search_placeholder}
                      placeholderTextColor={colors.textMuted}
                      style={styles.search}
                      accessibilityLabel={catalog.search_placeholder}
                    />
                  </View>
                ) : null}

                {tab === 'general' && offering && presentation ? (
                  <View style={styles.stack}>
                    {presentation.policyNote ? <PolicyNote>{presentation.policyNote}</PolicyNote> : null}
                    <PackageCard
                      title={offering.name}
                      subtitle="Usually 1 visit"
                      priceLabel={presentation.priceLabel ?? ''}
                    />
                    <RepairCarChoices offeringSlug={offering.slug} flow="gs" />
                    <PrimaryButton
                      label={presentation.ctaLabel ?? 'Start job card'}
                      onPress={() => {
                        setFlowKind('gs');
                        const gate = nextVehicleGate(pickVehicleDraft(useVehicleDraftStore.getState()));
                        if (gate === 'complete' || gate === 'fuel') {
                          router.push({
                            pathname: '/vehicle/fuel',
                            params: { offering: offering.slug },
                          });
                          return;
                        }
                        router.push({
                          pathname: '/vehicle/make',
                          params: { offering: offering.slug },
                        });
                      }}
                    />
                    <Text style={styles.section}>Included in service</Text>
                    <IncludedList items={offering.included_items} />
                    <Text style={styles.section}>Why CARATOM</Text>
                    <TrustStrip items={catalog.trust_strip} />
                    {catalog.sections.uncertain_repair ? (
                      <View style={styles.uncertain}>
                        <Text style={styles.section}>{catalog.sections.uncertain_repair.title}</Text>
                        <Text style={styles.uncertainSub}>{catalog.sections.uncertain_repair.subtitle}</Text>
                        <SecondaryButton
                          label={catalog.sections.uncertain_repair.cta}
                          onPress={() => {
                            setFlowKind('ir');
                            router.push('/inspection-repair/offering');
                          }}
                        />
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {tab === 'repair' && offering && presentation ? (
                  <View style={styles.stack}>
                    {presentation.policyNote ? (
                      <PolicyNote tone="warn">{presentation.policyNote}</PolicyNote>
                    ) : null}
                    <PackageCard
                      title={offering.name}
                      subtitle="Base package · same as General service tab"
                      priceLabel={presentation.priceLabel ?? ''}
                    />
                    <RepairCarChoices offeringSlug={offering.slug} />
                    <PrimaryButton
                      label={presentation.ctaLabel ?? catalog.sections.service_repair_entry.cta_label}
                      onPress={() => {
                        track('repair_tab_viewed');
                        setFlowKind('gpr');
                        const gate = nextVehicleGate(pickVehicleDraft(useVehicleDraftStore.getState()));
                        if (gate === 'make') {
                          router.push({
                            pathname: '/vehicle/make',
                            params: gprVehicleParams(),
                          });
                          return;
                        }
                        if (gate === 'fuel') {
                          router.push({
                            pathname: '/vehicle/fuel',
                            params: gprVehicleParams(),
                          });
                          return;
                        }
                        router.push('/job-card/repairs-cart');
                      }}
                    />
                    <Text style={styles.section}>Included in service</Text>
                    <IncludedList items={offering.included_items} />
                    <Text style={styles.section}>Why CARATOM</Text>
                    <TrustStrip items={catalog.trust_strip} />
                  </View>
                ) : null}

                {tab === 'oneman' && presentation ? (
                  <View style={styles.stack}>
                    {presentation.policyNote ? <PolicyNote>{presentation.policyNote}</PolicyNote> : null}
                    {catalog.sections.one_man_jobs.length ? (
                      <OneManGrid
                        jobs={catalog.sections.one_man_jobs}
                        onSelect={(slug) => router.push(`/services/${slug}`)}
                      />
                    ) : (
                      <InlineBanner message="No one-man jobs in this area yet." />
                    )}
                  </View>
                ) : null}

                {tab === 'sos' && presentation ? (
                  <View style={styles.stack}>
                    <SosPanel
                      headline={catalog.sections.sos.headline}
                      locality={location.label.split(' · ')[0] || locality}
                      liveLabel={
                        location.usingFallback ? `${locality} · approximate` : location.label
                      }
                      permissionMessage={
                        location.permissionDenied
                          ? 'Location permission denied. Using Koramangala as a fallback.'
                          : null
                      }
                      tiles={catalog.sections.sos.tiles}
                      onTilePress={(tileId) =>
                        router.push({ pathname: '/sos/pick', params: { issue: tileId } })
                      }
                      map={
                        <SosMap
                          latitude={location.latitude}
                          longitude={location.longitude}
                        />
                      }
                    />
                    <PrimaryButton
                      tone="sos"
                      label={presentation.ctaLabel ?? 'Get help now'}
                      accessibilityLabel="Get emergency help now"
                      onPress={() => router.push('/sos/pick')}
                    />
                  </View>
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.brandSoft },
  dock: {
    flex: 1,
    marginTop: -24,
    backgroundColor: colors.brandSoft,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    ...shadow.sheet,
  },
  dockInner: {
    flex: 1,
    overflow: 'hidden',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.brandSoft,
  },
  folderSheet: {
    flex: 1,
    backgroundColor: colors.surface,
    zIndex: 0,
  },
  pad: { paddingHorizontal: 16, paddingTop: 16 },
  body: {
    paddingHorizontal: layout.pagePad,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 16,
  },
  stack: { gap: 16 },
  section: { ...type.sectionTitle, color: colors.textStrong },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.canvas,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  search: {
    flex: 1,
    color: colors.text,
    minHeight: 48,
  },
  uncertain: { gap: 8, paddingTop: 8 },
  uncertainSub: { ...type.caption, color: colors.textMuted },
});
