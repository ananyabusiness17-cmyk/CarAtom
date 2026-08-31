import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InlineBanner } from '../../../src/components/InlineBanner';
import { JobBoardCard } from '../../../src/components/JobBoardCard';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { SecondaryButton } from '../../../src/components/SecondaryButton';
import { useAdminDispatch } from '../../../src/hooks/useAdminDispatch';
import { type JobBoardFilters, useAdminJobBoard } from '../../../src/hooks/useAdminJobBoard';
import { track } from '../../../src/lib/analytics';
import { colors, layout, radius, type } from '../../../src/theme/tokens';

const STATUS_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'inspecting', label: 'Inspecting' },
  { key: 'parts', label: 'Parts advance' },
] as const;

type Draft = {
  statusKey: (typeof STATUS_CHIPS)[number]['key'];
  technicianId: string | null;
  area: string | null;
};

const EMPTY_DRAFT: Draft = { statusKey: 'all', technicianId: null, area: null };

function toFilters(draft: Draft): JobBoardFilters {
  if (draft.statusKey === 'unassigned') return { needs_dispatch: true, technician_id: draft.technicianId ?? undefined, area_slug: draft.area ?? undefined };
  if (draft.statusKey === 'inspecting') {
    return { status: 'INSPECTING', technician_id: draft.technicianId ?? undefined, area_slug: draft.area ?? undefined };
  }
  if (draft.statusKey === 'parts') {
    return {
      status: 'PARTS_ADVANCE_DUE',
      technician_id: draft.technicianId ?? undefined,
      area_slug: draft.area ?? undefined,
    };
  }
  return { technician_id: draft.technicianId ?? undefined, area_slug: draft.area ?? undefined };
}

function filterCount(draft: Draft): number {
  return (draft.statusKey !== 'all' ? 1 : 0) + (draft.technicianId ? 1 : 0) + (draft.area ? 1 : 0);
}

export default function BoardScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [applied, setApplied] = useState<Draft>(EMPTY_DRAFT);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [sheet, setSheet] = useState(false);
  const filters = useMemo(() => toFilters(applied), [applied]);
  const query = useAdminJobBoard(filters);
  const dispatch = useAdminDispatch();

  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const activeCount = filterCount(applied);

  useEffect(() => {
    track('admin_mobile_board_viewed', { filter_count: activeCount });
  }, [activeCount]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => {
            setDraft(applied);
            setSheet(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Filter jobs"
          style={styles.headerBtn}
        >
          <Text style={styles.headerBtnText}>All{activeCount ? ` · ${activeCount}` : ''}</Text>
        </Pressable>
      ),
    });
  }, [activeCount, applied, navigation]);

  const onRefresh = useCallback(() => {
    void AccessibilityInfo.announceForAccessibility('Refreshing jobs');
    void query.refetch();
  }, [query]);

  const techs = dispatch.data?.technicians ?? [];

  return (
    <View style={styles.screen}>
      <Pressable
        onPress={() => {
          setDraft(applied);
          setSheet(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Filter status, tech, area"
        style={styles.search}
      >
        <Text style={styles.searchText}>Filter status, tech, area</Text>
      </Pressable>
      {query.isError ? (
        <InlineBanner
          message="Could not load jobs."
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      ) : null}
      {query.isPending ? (
        <View style={styles.skeletons}>
          <View style={styles.skeleton} />
          <View style={styles.skeleton} />
          <View style={styles.skeleton} />
        </View>
      ) : (
        <FlashList
          data={items}
          estimatedItemSize={88}
          style={{ flex: 1 }}
          keyExtractor={(item) => item.id}
          onRefresh={onRefresh}
          refreshing={query.isRefetching && !query.isPending}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            query.isSuccess ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No jobs match filters</Text>
                <SecondaryButton
                  label="Clear filters"
                  onPress={() => {
                    setApplied(EMPTY_DRAFT);
                    setDraft(EMPTY_DRAFT);
                  }}
                />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <JobBoardCard
              item={item}
              onPress={(id) => router.push(`/(ops)/mob-job/${id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheet(false)} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.sheetTitle}>Filter jobs</Text>
          <Text style={styles.section}>Status</Text>
          <View style={styles.chips}>
            {STATUS_CHIPS.map((chip) => (
              <Pressable
                key={chip.key}
                onPress={() => setDraft((prev) => ({ ...prev, statusKey: chip.key }))}
                accessibilityRole="button"
                accessibilityState={{ selected: draft.statusKey === chip.key }}
                style={[styles.chip, draft.statusKey === chip.key ? styles.chipOn : null]}
              >
                <Text style={[styles.chipText, draft.statusKey === chip.key ? styles.chipTextOn : null]}>
                  {chip.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.section}>Technician</Text>
          <View style={styles.chips}>
            <Pressable
              onPress={() => setDraft((prev) => ({ ...prev, technicianId: null }))}
              style={[styles.chip, !draft.technicianId ? styles.chipOn : null]}
            >
              <Text style={[styles.chipText, !draft.technicianId ? styles.chipTextOn : null]}>All</Text>
            </Pressable>
            {techs.map((tech) => (
              <Pressable
                key={tech.id}
                onPress={() => setDraft((prev) => ({ ...prev, technicianId: tech.id }))}
                style={[styles.chip, draft.technicianId === tech.id ? styles.chipOn : null]}
              >
                <Text style={[styles.chipText, draft.technicianId === tech.id ? styles.chipTextOn : null]}>
                  {tech.name}
                  {tech.duty_status === 'OFF_DUTY' ? ' · Off' : ''}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.section}>Area</Text>
          <TextInput
            value={draft.area ?? ''}
            onChangeText={(value) => setDraft((prev) => ({ ...prev, area: value.trim() ? value : null }))}
            placeholder="Koramangala"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            accessibilityLabel="Area"
          />
          <PrimaryButton
            label="Show jobs"
            onPress={() => {
              setApplied(draft);
              setSheet(false);
            }}
          />
          <SecondaryButton
            label="Clear filters"
            onPress={() => {
              setDraft(EMPTY_DRAFT);
              setApplied(EMPTY_DRAFT);
              setSheet(false);
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: layout.pagePad, paddingTop: 8, gap: 10 },
  search: {
    minHeight: layout.minTouch,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  searchText: { ...type.body, color: colors.textMuted },
  headerBtn: { minHeight: layout.minTouch, justifyContent: 'center', paddingHorizontal: 12 },
  headerBtnText: { ...type.bodyMedium, color: colors.brandStrong },
  list: { paddingBottom: 24 },
  skeletons: { gap: 10 },
  skeleton: { height: 88, borderRadius: radius.card, backgroundColor: colors.surfaceSubtle },
  empty: { paddingTop: 40, gap: 12 },
  emptyText: { ...type.body, color: colors.textMuted },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,37,50,0.35)' },
  sheet: {
    backgroundColor: colors.canvas,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: 20,
    gap: 12,
  },
  sheetTitle: { ...type.sectionTitle, color: colors.textStrong },
  section: { ...type.caption, color: colors.textMuted, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: layout.minTouch,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  chipText: { ...type.caption, color: colors.text },
  chipTextOn: { color: colors.brandStrong, fontWeight: '700' },
  input: {
    minHeight: layout.minTouch,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    color: colors.text,
  },
});
