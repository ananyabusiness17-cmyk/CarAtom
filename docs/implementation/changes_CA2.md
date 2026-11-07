# changes_CA2.md — ModeTabs Premium Redesign (Swiggy-inspired, dependency-free)

> **Scope:** This document records only the changes made for the CA2 task
> (Premium Folder-Tab redesign).  Changes already recorded in `changes_CA1.md`
> are **excluded**.  The baseline for this document is the state of the
> repository *after* applying `changes_CA1.md` and *before* the CA2 session.

---

## 1. Source-State Metadata

| Field | Value |
|---|---|
| Repository | CarAtom |
| Branch | `main` |
| Baseline description | Repository state after CA1 changes applied (working tree with CA1 modifications, unchanged from HEAD except for CA1 edits) |
| Baseline HEAD commit SHA | `96fb0c4ee500b636c303a58423e9e376ef966ea1` |
| Baseline `ModeTabs.tsx` SHA-256 | `53cc7910fcbb65569317d1a795c644044e2f35d2f393984e5d6890e82d5dd42b` |
| Baseline `radius.ts` SHA-256 | `d5e5ef3165ec81ecfd97dc470d1ca3ac218b99e8ca9a0b7fef1e8b28f556db38` |
| Baseline `home.tsx` SHA-256 | `a50a3b16c3a31c10b728993f317d1d3588fd1747c7b9d21748a93e5e8902b9da` |
| Current HEAD commit SHA | `96fb0c4ee500b636c303a58423e9e376ef966ea1` (no new commits; changes remain in working tree) |
| Staged changes included | No |
| Unstaged changes included | Yes (all CA2 changes are uncommitted working-tree modifications) |
| Untracked files included | No |
| Generation timestamp | 2026-09-03T20:17:00Z |
| Files modified | 3 |
| Files added | 0 |
| Files deleted | 0 |
| Files renamed | 0 |

---

## 2. Complete File Inventory

| # | Path | Change Type | Orig Lines | Final Lines | Additions | Deletions | Orig SHA-256 | Final SHA-256 |
|---|---|---|---|---|---|---|---|---|
| 1 | `apps/customer/src/components/home/ModeTabs.tsx` | modified | 351 | 372 | 235 | 210 | `53cc7910fcbb65569317d1a795c644044e2f35d2f393984e5d6890e82d5dd42b` | `d1a3cfa59b1f09f25b99c583f224c701c86a18a71c44d9a2d1bc51a4b27c318f` |
| 2 | `packages/ui-tokens/src/radius.ts` | modified | 29 | 37 | 10 | 2 | `d5e5ef3165ec81ecfd97dc470d1ca3ac218b99e8ca9a0b7fef1e8b28f556db38` | `6707b828104c7fc3635a842852b03d99655a0c4a4374c1fc7eceffd3795c1b24` |
| 3 | `apps/customer/app/(customer)/(tabs)/home.tsx` | modified | 342 | 364 | 24 | 2 | `a50a3b16c3a31c10b728993f317d1d3588fd1747c7b9d21748a93e5e8902b9da` | `5b9bfa417d1b53d0d50d64d58867fad7b54228f86e1b614e826b3502e390941c` |

> **Note on `home.tsx` baseline:** CA1 did not modify `home.tsx`.  Its CA2
> baseline is therefore the verbatim HEAD version.

---

## 3. Exact Per-File Changes

---

### File 1 of 3 — `apps/customer/src/components/home/ModeTabs.tsx`

- **Change type:** modified
- **Original path:** same
- **File mode:** 100644 → 100644 (unchanged)
- **Line endings:** LF (unchanged)
- **Hunks:** 5

---

#### Hunk 1 — imports and layout constants

**Original range:** lines 1–24  
**Final range:** lines 1–29  
**Unified-diff header:** `@@ -1,24 +1,29 @@`

**Before:**
```typescript
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { MODE_TABS, type ModeTabId } from '../../lib/modeTabs';
import { colors, radius, shadow, type } from '../../theme/tokens';

// ─── constants ────────────────────────────────────────────────────────────────

/** Shoulder-curve radius — mirrors the `radius.folderScoop` token. */
const SCOOP = radius.folderScoop; // 14
const TROUGH_PAD = 8;
const ANIM_DURATION = 220;
/** Initial off-screen value so scoops don't flash at (0, 0). */
const OFF_SCREEN = -999;
```

**After:**
```typescript
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MODE_TABS, type ModeTabId } from '../../lib/modeTabs';
import { colors, radius, shadow, type } from '../../theme/tokens';

// ─── layout constants ─────────────────────────────────────────────────────────

/** Inactive tab height — sits lower in the trough to expose the active crest. */
const FOLDER_H_INACTIVE = 84;
/** Active tab height — crests 16 px above its inactive neighbours. */
const FOLDER_H_ACTIVE   = 100;
/**
 * Trough minimum height locks the row at a fixed size so it never shrinks
 * during the height transition, preventing layout jank in the content below.
 * 14 px of trough background is visible above the active crest.
 */
const TROUGH_MIN_H  = FOLDER_H_ACTIVE + 14; // 114 px
const TROUGH_PAD_H  = 6;
const ANIM_DURATION = 210;
```

---

#### Hunk 2 — types, GLYPH config, inactive colour constants

**Original range:** lines 26–46  
**Final range:** lines 31–58  
**Unified-diff header:** `@@ -26,21 +31,28 @@`

**Before:**
```typescript
// ─── types ────────────────────────────────────────────────────────────────────

type TabBox = { x: number; width: number };

type Props = {
  active: ModeTabId;
  onChange: (id: ModeTabId) => void;
};

// ─── per-tab glyph config ─────────────────────────────────────────────────────

const GLYPH: Record<
  ModeTabId,
  { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  repair:  { bg: colors.brandSoft,    fg: colors.brandStrong, icon: 'construct' },
  general: { bg: colors.brandSoft,    fg: colors.brandStrong, icon: 'car-sport' },
  oneman:  { bg: colors.successSoft,  fg: colors.success,     icon: 'flash'     },
  sos:     { bg: colors.warningSoft,  fg: colors.sosAccent,   icon: 'warning'   },
};
```

**After:**
```typescript
// ─── types ────────────────────────────────────────────────────────────────────

type Props = {
  active: ModeTabId;
  onChange: (id: ModeTabId) => void;
};

// ─── per-tab glyph config ─────────────────────────────────────────────────────

const GLYPH: Record<
  ModeTabId,
  { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  repair:  { bg: colors.brandSoft,   fg: colors.brandStrong, icon: 'construct'  },
  general: { bg: colors.brandSoft,   fg: colors.brandStrong, icon: 'car-sport'  },
  oneman:  { bg: colors.successSoft, fg: colors.success,     icon: 'flash'      },
  sos:     { bg: colors.warningSoft, fg: colors.sosAccent,   icon: 'warning'    },
};

/** Very faint brand tint — inactive glyph circle dissolves into the trough. */
const INACTIVE_BG = 'rgba(23,107,158,0.07)';
/**
 * Muted in-family brand tint for inactive labels and icons.
 * Keeps the whole cluster in the blue colour family instead of neutral grey.
 */
const INACTIVE_COLOR = 'rgba(23,107,158,0.52)';
```

---

#### Hunk 3 — component body: state removal, reduced-motion comment, animation driver change, scoop removal

**Original range:** lines 48–140  
**Final range:** lines 60–109  
**Unified-diff header:** `@@ -48,93 +60,50 @@`

**Before:**
```typescript
export function ModeTabs({ active, onChange }: Props) {
  const [boxes, setBoxes] = useState<Partial<Record<ModeTabId, TabBox>>>({});

  // ── accessibility: respect prefers-reduced-motion ──────────────────────────
  const reduceMotion = useRef(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { reduceMotion.current = v; })
      .catch(() => {}); // ignore — safe default is animate
  }, []);

  // ── per-tab open/close Animated.Values (0 = inactive, 1 = active) ─────────
  // Stable ref; initialised once so references never change.
  const tabAnims = useRef(
    MODE_TABS.reduce<Record<ModeTabId, Animated.Value>>(
      (acc, t) => ({
        ...acc,
        [t.id]: new Animated.Value(t.id === active ? 1 : 0),
      }),
      {} as Record<ModeTabId, Animated.Value>,
    ),
  ).current;

  // ── scoop position Animated.Values ────────────────────────────────────────
  const leftScoopX  = useRef(new Animated.Value(OFF_SCREEN)).current;
  const rightScoopX = useRef(new Animated.Value(OFF_SCREEN)).current;
  /** Tracks whether scoops have been placed at least once (first snap). */
  const hasPlaced = useRef(false);

  // ── animate tabs when active changes ──────────────────────────────────────
  const prevActive = useRef<ModeTabId>(active);
  useEffect(() => {
    const prev = prevActive.current;
    if (prev === active) return;
    prevActive.current = active;

    const dur = reduceMotion.current ? 0 : ANIM_DURATION;
    Animated.parallel([
      Animated.timing(tabAnims[prev], {
        toValue: 0,
        duration: dur,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(tabAnims[active], {
        toValue: 1,
        duration: dur,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [active, tabAnims]);

  // ── move scoops whenever the active tab or its measured box changes ────────
  useEffect(() => {
    const box = boxes[active];
    if (!box) return;

    // Snap on first placement; smooth transitions thereafter.
    const dur = !hasPlaced.current || reduceMotion.current ? 0 : ANIM_DURATION;
    hasPlaced.current = true;

    const targetLeft  = TROUGH_PAD + box.x - SCOOP;
    const targetRight = TROUGH_PAD + box.x + box.width;

    Animated.parallel([
      Animated.timing(leftScoopX, {
        toValue: targetLeft,
        duration: dur,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // 'left' is a layout prop — cannot use native driver
      }),
      Animated.timing(rightScoopX, {
        toValue: targetRight,
        duration: dur,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [active, boxes, leftScoopX, rightScoopX]);

  // ── layout handler ─────────────────────────────────────────────────────────
  function handleLayout(tabId: ModeTabId, event: LayoutChangeEvent) {
    const { x, width } = event.nativeEvent.layout;
    setBoxes((prev) => {
      const cur = prev[tabId];
      if (cur?.x === x && cur?.width === width) return prev; // no change
      return { ...prev, [tabId]: { x, width } };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
```

**After:**
```typescript
export function ModeTabs({ active, onChange }: Props) {
  // ── respect prefers-reduced-motion ────────────────────────────────────────
  const reduceMotion = useRef(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { reduceMotion.current = v; })
      .catch(() => {}); // safe default: animate
  }, []);

  // ── single JS-driven Animated.Value per tab: 0 = inactive, 1 = active ─────
  //
  // Every animated property — container height, flex-grow, background colour,
  // shadow, icon lift/scale, and halo — is derived from one interpolated value.
  // useNativeDriver:false is required for layout and colour properties.
  // For a 4-item row the JS-thread cost is negligible.
  const tabAnims = useRef(
    MODE_TABS.reduce<Record<ModeTabId, Animated.Value>>(
      (acc, t) => ({
        ...acc,
        [t.id]: new Animated.Value(t.id === active ? 1 : 0),
      }),
      {} as Record<ModeTabId, Animated.Value>,
    ),
  ).current;

  // ── animate the outgoing and incoming tabs simultaneously ─────────────────
  const prevActive = useRef<ModeTabId>(active);
  useEffect(() => {
    const prev = prevActive.current;
    if (prev === active) return;
    prevActive.current = active;

    const dur = reduceMotion.current ? 0 : ANIM_DURATION;
    Animated.parallel([
      Animated.timing(tabAnims[prev], {
        toValue: 0,
        duration: dur,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(tabAnims[active], {
        toValue: 1,
        duration: dur,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [active, tabAnims]);

  // ─────────────────────────────────────────────────────────────────────────────
```

---

#### Hunk 4 — JSX: trough wrapper, per-tab render (new interpolations, new Animated.View nesting, halo, new style refs, scoop removal)

**Original range:** lines 142–243  
**Final range:** lines 111–243  
**Unified-diff header:** `@@ -142,102 +111,133 @@`

**Before:**
```tsx
  return (
    <View style={styles.trough} accessibilityRole="tablist">
      {MODE_TABS.map((tab) => {
        const selected = tab.id === active;
        const glyph    = GLYPH[tab.id];
        const anim     = tabAnims[tab.id];

        // Icon lifts upward and scales slightly when active — native driver safe.
        const iconTranslateY = anim.interpolate({
          inputRange:  [0, 1],
          outputRange: [0, -3],
        });
        const iconScale = anim.interpolate({
          inputRange:  [0, 1],
          outputRange: [1, 1.08],
        });

        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            focusable
            onPress={() => { if (!selected) onChange(tab.id); }}
            onLayout={(e) => handleLayout(tab.id, e)}
            style={({ pressed }) => [
              styles.folder,
              selected ? styles.folderOpen : styles.folderClosed,
              pressed && !selected && styles.folderPressed,
            ]}
          >
            {/* Icon glyph */}
            <Animated.View
              style={[
                styles.glyph,
                { backgroundColor: selected ? glyph.bg : INACTIVE_GLYPH_BG },
                {
                  transform: [
                    { translateY: iconTranslateY },
                    { scale: iconScale },
                  ],
                },
              ]}
            >
              <Ionicons
                name={glyph.icon}
                size={26}
                color={selected ? glyph.fg : colors.textMuted}
              />
            </Animated.View>

            {/* Label lines */}
            {tab.folderLines.map((line) => (
              <Text
                key={line}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={[
                  styles.label,
                  selected && styles.labelOpen,
                  selected && tab.sos && styles.labelSos,
                ]}
              >
                {line}
              </Text>
            ))}
          </Pressable>
        );
      })}

      {/*
        Shoulder curves — concave quarter-circle connectors that visually join
        the active tab to the content panel below.

        Technique: each scoop is a SCOOP×SCOOP container (backgroundColor=surface)
        with an oversized circle (2×SCOOP, backgroundColor=brandSoft) positioned
        so only one quadrant is visible through the container's overflow:hidden.
        The brandSoft quarter-circle creates the concave "trough-coloured" curve
        while the white container area extends the folderSheet upward into the gap.

        They sit at bottom:-SCOOP (below the trough bounds) but remain inside
        dockInner's bounds (the folderSheet region), so dockInner's
        overflow:hidden does not clip them.  The trough's zIndex:2 ensures they
        render above the folderSheet.
      */}
      <Animated.View
        pointerEvents="none"
        style={[styles.scoop, { left: leftScoopX }]}
      >
        <View style={[styles.scoopFill, styles.scoopLeft]} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[styles.scoop, { left: rightScoopX }]}
      >
        <View style={[styles.scoopFill, styles.scoopRight]} />
      </Animated.View>
    </View>
  );
}
```

**After:**
```tsx
  return (
    <View
      // @ts-expect-error — experimental_backgroundImage is an RN 0.76 experimental prop
      style={styles.trough}
      accessibilityRole="tablist"
    >
      {MODE_TABS.map((tab) => {
        const selected = tab.id === active;
        const glyph    = GLYPH[tab.id];
        const anim     = tabAnims[tab.id];

        // ── all animated derivations read from a single Animated.Value ────────

        /** Container grows taller as the tab activates → dune-crest topography. */
        const containerH = anim.interpolate({
          inputRange:  [0, 1],
          outputRange: [FOLDER_H_INACTIVE, FOLDER_H_ACTIVE],
        });
        /**
         * Active tab slightly wider — 2-D crest.
         * With alignItems:'flex-end' the expansion spreads from the bottom up.
         */
        const containerFlex = anim.interpolate({
          inputRange:  [0, 1],
          outputRange: [1, 1.2],
        });
        /** White background fades in — the folder opening onto the content sheet. */
        const tabBg = anim.interpolate({
          inputRange:  [0, 1],
          outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,1)'],
        });
        /** Shadow opacity rises with the crest (iOS). */
        const tabShadowOpacity = anim.interpolate({
          inputRange:  [0, 1],
          outputRange: [0, 0.13],
        });
        /** Android elevation rises with the crest. */
        const tabElevation = anim.interpolate({
          inputRange:  [0, 1],
          outputRange: [0, 8],
        });
        /** Icon lifts upward when active — reinforces the raised-surface feel. */
        const iconTranslateY = anim.interpolate({
          inputRange:  [0, 1],
          outputRange: [0, -4],
        });
        /** Icon grows slightly when active. */
        const iconScale = anim.interpolate({
          inputRange:  [0, 1],
          outputRange: [1, 1.13],
        });
        /** Luminous brand halo fades in behind the active glyph. */
        const haloOpacity = anim.interpolate({
          inputRange:  [0, 1],
          outputRange: [0, 1],
        });

        return (
          <Animated.View
            key={tab.id}
            style={[
              styles.folderOuter,
              {
                minHeight:        containerH,
                flexGrow:         containerFlex,
                backgroundColor:  tabBg,
                shadowOpacity:    tabShadowOpacity,
                elevation:        tabElevation,
              },
            ]}
          >
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={tab.label}
              focusable
              onPress={() => { if (!selected) onChange(tab.id); }}
              style={({ pressed }) => [
                styles.folder,
                pressed && !selected && styles.folderPressed,
              ]}
            >
              {/* ── glyph + halo ─────────────────────────────────────────── */}
              <View style={styles.glyphWrapper}>
                {/* Soft brand glow — fades in with the active state */}
                <Animated.View
                  pointerEvents="none"
                  style={[styles.glyphHalo, { opacity: haloOpacity }]}
                />
                {/* Icon circle — squircle corners via borderCurve:'continuous' */}
                <Animated.View
                  style={[
                    styles.glyph,
                    { backgroundColor: selected ? glyph.bg : INACTIVE_BG },
                    {
                      transform: [
                        { translateY: iconTranslateY },
                        { scale: iconScale },
                      ],
                    },
                  ]}
                >
                  <Ionicons
                    name={glyph.icon}
                    size={26}
                    color={selected ? glyph.fg : INACTIVE_COLOR}
                  />
                </Animated.View>
              </View>

              {/* ── label lines ──────────────────────────────────────────── */}
              {tab.folderLines.map((line) => (
                <Text
                  key={line}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.80}
                  style={[
                    styles.label,
                    selected ? styles.labelOpen : styles.labelInactive,
                    selected && tab.sos && styles.labelSos,
                  ]}
                >
                  {line}
                </Text>
              ))}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}
```

---

#### Hunk 5 — styles: trough, folderOuter (new), folder, glyph system, labels, scoop removal

**Original range:** lines 245–351  
**Final range:** lines 245–372  
**Unified-diff header:** `@@ -245,107 +245,128 @@`

**Before:**
```typescript
// ─── style constants ──────────────────────────────────────────────────────────

/** Semi-transparent branded background for inactive glyph circles. */
const INACTIVE_GLYPH_BG = 'rgba(23,107,158,0.08)';

const styles = StyleSheet.create({
  trough: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.brandSoft,
    paddingHorizontal: TROUGH_PAD,
    paddingTop: 10,
    gap: 4,
    overflow: 'visible', // allow scoops to render below the trough boundary
    zIndex: 2,
  },

  // ── folder tabs ─────────────────────────────────────────────────────────────
  folder: {
    flex: 1,
    minWidth: 0, // prevent overflow on narrow viewports
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 92,
    paddingHorizontal: 2,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopLeftRadius: radius.folder,
    borderTopRightRadius: radius.folder,
  },
  folderClosed: {
    backgroundColor: 'rgba(23,107,158,0.14)',
    // Subtle top/side border separates adjacent inactive tabs from each other
    // and from the trough background without adding visual weight.
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 0,
    borderTopColor: 'rgba(23,107,158,0.10)',
    borderLeftColor: 'rgba(23,107,158,0.10)',
    borderRightColor: 'rgba(23,107,158,0.10)',
  },
  folderOpen: {
    backgroundColor: colors.surface,
    // Subtle elevation to reinforce "raised" metaphor.
    ...shadow.nav,
  },
  folderPressed: {
    opacity: 0.70,
  },

  // ── glyph icon circle ───────────────────────────────────────────────────────
  glyph: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },

  // ── labels ──────────────────────────────────────────────────────────────────
  label: {
    ...type.label,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    color: colors.textMuted,
    fontWeight: '500',
  },
  labelOpen: {
    color: colors.brandStrong,
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 14,
  },
  labelSos: {
    color: colors.sosAccent,
  },

  // ── shoulder curves ─────────────────────────────────────────────────────────
  scoop: {
    position: 'absolute',
    bottom: -SCOOP,   // positioned below the trough, above the folderSheet
    width: SCOOP,
    height: SCOOP,
    overflow: 'hidden',
    backgroundColor: colors.surface, // matches the folderSheet
  },
  scoopFill: {
    position: 'absolute',
    width: SCOOP * 2,
    height: SCOOP * 2,
    borderRadius: SCOOP,
    backgroundColor: colors.brandSoft, // matches the trough
  },
  /** Left scoop: brandSoft circle centred at the top-left corner of the box. */
  scoopLeft: {
    left: -SCOOP,
    top: -SCOOP,
  },
  /** Right scoop: brandSoft circle centred at the top-right corner of the box. */
  scoopRight: {
    left: 0,
    top: -SCOOP,
  },
});
```

**After:**
```typescript
// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── trough ──────────────────────────────────────────────────────────────────
  trough: {
    flexDirection:     'row',
    alignItems:        'flex-end',
    backgroundColor:   colors.brandSoft,
    paddingHorizontal: TROUGH_PAD_H,
    gap:               8,
    overflow:          'visible', // let the active-tab shadow escape below
    zIndex:            2,
    // Fixed minimum height locks the row during crest animation so the
    // content panel below never shifts.
    minHeight: TROUGH_MIN_H,
    // Subtle top-edge highlight gives the brandSoft surface visual dimension
    // (light catching the top of the trough plane).
    experimental_backgroundImage:
      'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 55%)',
  },

  // ── outer Animated.View ─────────────────────────────────────────────────────
  //
  // Carries all animated properties: height, flex-grow, background colour, and
  // shadow.  borderCurve:'continuous' gives iOS squircle curvature — the smooth,
  // app-icon–style corners that make rounded shapes look premium instead of
  // a plain circular arc.
  folderOuter: {
    flexBasis:  0,
    flexShrink: 1,
    minWidth:   0,
    borderTopLeftRadius:  radius.folder, // 28
    borderTopRightRadius: radius.folder,
    borderCurve: 'continuous',
    // Shadow base — opacity and elevation are overridden by animated inline values
    // so the crest's shadow only appears when the tab is active.
    shadowColor:  shadow.folder.shadowColor,
    shadowOffset: shadow.folder.shadowOffset,
    shadowRadius: shadow.folder.shadowRadius,
    overflow:     'visible', // icon lift and shadow extend beyond bounds
  },

  // ── inner Pressable ─────────────────────────────────────────────────────────
  // Fills the Animated.View, handles touch, keeps its own background transparent
  // so the animated white layer on the outer view shows through.
  folder: {
    flex:              1,
    minWidth:          0,
    alignItems:        'center',
    justifyContent:    'flex-end',
    paddingHorizontal: 6,
    paddingTop:        10,
    paddingBottom:     10,
    borderTopLeftRadius:  radius.folder,
    borderTopRightRadius: radius.folder,
    borderCurve: 'continuous',
  },

  folderPressed: {
    opacity: 0.68,
  },

  // ── glyph ────────────────────────────────────────────────────────────────────
  /**
   * Fixed-size anchor so the animated (scaling, translating) icon and its
   * oversized halo do not push label siblings.
   */
  glyphWrapper: {
    width:          46,
    height:         46,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   5,
    overflow:       'visible', // halo and scaled glyph extend beyond wrapper
  },

  /**
   * Soft brand-coloured halo rendered behind the icon circle.
   * opacity is driven by the per-tab Animated.Value.
   */
  glyphHalo: {
    position:        'absolute',
    width:           58,
    height:          58,
    borderRadius:    29,
    borderCurve:     'continuous',
    backgroundColor: 'rgba(93,183,232,0.18)',
    shadowColor:     colors.brand,
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.38,
    shadowRadius:    10,
  },

  /** Icon circle with squircle corners. */
  glyph: {
    width:          46,
    height:         46,
    borderRadius:   23,
    borderCurve:    'continuous',
    alignItems:     'center',
    justifyContent: 'center',
  },

  // ── labels ───────────────────────────────────────────────────────────────────
  label: {
    ...type.label,
    fontSize:  10,
    lineHeight: 13,
    textAlign: 'center',
  },

  /** Inactive: muted in-family blue — stays in the brand colour family. */
  labelInactive: {
    color:      INACTIVE_COLOR,
    fontWeight: '400',
  },

  labelOpen: {
    color:      colors.brandStrong,
    fontWeight: '700',
    fontSize:   11,
    lineHeight: 14,
  },

  labelSos: {
    color: colors.sosAccent,
  },
});
```

---

### File 2 of 3 — `packages/ui-tokens/src/radius.ts`

- **Change type:** modified
- **Original path:** same
- **File mode:** 100644 → 100644 (unchanged)
- **Line endings:** LF (unchanged)
- **Hunks:** 2

---

#### Hunk 1 — `radius` object: bump `folder`, remove `folderScoop`

**Original range:** lines 1–11  
**Final range:** lines 1–11  
**Unified-diff header:** `@@ -6,8 +6,8 @@`

**Before:**
```typescript
  card: 16,
  tile: 20,
  sheet: 32,
  folder: 22,
  folderScoop: 14,
  pill: 999,
} as const;
```

**After:**
```typescript
  card: 16,
  tile: 20,
  sheet: 32,
  /** Folder-tab top corners — generous archway shape. */
  folder: 28,
  pill: 999,
} as const;
```

---

#### Hunk 2 — `shadow` object: add `shadow.folder` entry between `shadow.nav` and `shadow.sheet`

**Original range:** lines 19–29  
**Final range:** lines 19–37  
**Unified-diff header:** `@@ -19,11 +19,19 @@`

**Before:**
```typescript
    shadowRadius: 2,
    elevation: 2,
  },
  sheet: {
    shadowColor: colors.textStrong,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
} as const;
```

**After:**
```typescript
    shadowRadius: 2,
    elevation: 2,
  },
  /** Raised elevation for the active folder-tab crest. */
  folder: {
    shadowColor: colors.textStrong,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 8,
  },
  sheet: {
    shadowColor: colors.textStrong,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
} as const;
```

---

### File 3 of 3 — `apps/customer/app/(customer)/(tabs)/home.tsx`

- **Change type:** modified
- **Original path:** same  
  *(Note: `home.tsx` was not modified by CA1. The baseline for this file is the verbatim HEAD version.)*
- **File mode:** 100644 → 100644 (unchanged)
- **Line endings:** LF (unchanged)
- **Hunks:** 5

---

#### Hunk 1 — imports: add `useRef`, add `Animated`

**Original range:** lines 4–5  
**Final range:** lines 4–5  
**Unified-diff header:** `@@ -4,2 +4,2 @@`

**Before:**
```typescript
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
```

**After:**
```typescript
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
```

---

#### Hunk 2 — `contentFade` ref declaration (inside component body, after `setError`)

**Original range:** lines 38–39  
**Final range:** lines 38–43  
**Unified-diff header:** `@@ -38,2 +38,7 @@`

**Before:**
```typescript
  const [error, setError] = useState<string | null>(null);
  const draft = useVehicleDraftStore();
```

**After:**
```typescript
  const [error, setError] = useState<string | null>(null);
  // Crossfade animation — briefly dips opacity when the active tab changes so
  // the content switch feels like one connected system instead of a hard cut.
  const contentFade = useRef(new Animated.Value(1)).current;
  const draft = useVehicleDraftStore();
```

---

#### Hunk 3 — `ModeTabs` `onChange` prop: add fade sequence after `track()`

**Original range:** lines 114–115  
**Final range:** lines 114–131  
**Unified-diff header:** `@@ -114,2 +114,19 @@`

**Before:**
```tsx
              track('home_tab_changed', { tab: next });
            }}
```

**After:**
```tsx
              track('home_tab_changed', { tab: next });
              // Quick fade-out → fade-in so tapping a tab and the content
              // updating feel like one transition, not a hard cut.
              Animated.sequence([
                Animated.timing(contentFade, {
                  toValue: 0.45,
                  duration: 65,
                  useNativeDriver: true,
                }),
                Animated.timing(contentFade, {
                  toValue: 1,
                  duration: 190,
                  useNativeDriver: true,
                }),
              ]).start();
            }}
```

---

#### Hunk 4 — `folderSheet` content: wrap children in `Animated.View`

**Original range:** lines 116–117 (inside `<View style={styles.folderSheet}>`)  
**Final range:** lines 133–135  
**Unified-diff header:** `@@ -116,1 +133,2 @@`

**Before:**
```tsx
          <View style={styles.folderSheet}>
            {loading ? <HomeSkeleton /> : null}
```

**After:**
```tsx
          <View style={styles.folderSheet}>
            <Animated.View style={[styles.contentFadeWrap, { opacity: contentFade }]}>
            {loading ? <HomeSkeleton /> : null}
```

---

#### Hunk 5 — close tag for `Animated.View` and add `contentFadeWrap` style

**Part A — close tag (original range lines ~303–304, final ~305–307):**

**Before:**
```tsx
            ) : null}
          </View>
```

**After:**
```tsx
            ) : null}
            </Animated.View>
          </View>
```

**Part B — new style entry (original range lines ~333–334, final ~337–342):**

**Before:**
```typescript
  folderSheet: {
    flex: 1,
    backgroundColor: colors.surface,
    zIndex: 0,
  },
  pad: { paddingHorizontal: 16, paddingTop: 16 },
```

**After:**
```typescript
  folderSheet: {
    flex: 1,
    backgroundColor: colors.surface,
    zIndex: 0,
  },
  contentFadeWrap: {
    flex: 1,
  },
  pad: { paddingHorizontal: 16, paddingTop: 16 },
```

---

## 4. Canonical Complete Patch

The patch below was generated directly by `diff -u` comparing the CA1 baseline
against the CA2 final working tree.  Apply with:

```bash
patch -p1 < ca2.patch
```

`````diff
--- a/apps/customer/src/components/home/ModeTabs.tsx
+++ b/apps/customer/src/components/home/ModeTabs.tsx
@@ -1,5 +1,5 @@
 import { Ionicons } from '@expo/vector-icons';
-import { useEffect, useRef, useState } from 'react';
+import { useEffect, useRef } from 'react';
 import {
   AccessibilityInfo,
   Animated,
@@ -8,25 +8,28 @@
   StyleSheet,
   Text,
   View,
-  type LayoutChangeEvent,
 } from 'react-native';
 
 import { MODE_TABS, type ModeTabId } from '../../lib/modeTabs';
 import { colors, radius, shadow, type } from '../../theme/tokens';
 
-// ─── constants ────────────────────────────────────────────────────────────────
+// ─── layout constants ─────────────────────────────────────────────────────────
 
-/** Shoulder-curve radius — mirrors the `radius.folderScoop` token. */
-const SCOOP = radius.folderScoop; // 14
-const TROUGH_PAD = 8;
-const ANIM_DURATION = 220;
-/** Initial off-screen value so scoops don't flash at (0, 0). */
-const OFF_SCREEN = -999;
+/** Inactive tab height — sits lower in the trough to expose the active crest. */
+const FOLDER_H_INACTIVE = 84;
+/** Active tab height — crests 16 px above its inactive neighbours. */
+const FOLDER_H_ACTIVE   = 100;
+/**
+ * Trough minimum height locks the row at a fixed size so it never shrinks
+ * during the height transition, preventing layout jank in the content below.
+ * 14 px of trough background is visible above the active crest.
+ */
+const TROUGH_MIN_H  = FOLDER_H_ACTIVE + 14; // 114 px
+const TROUGH_PAD_H  = 6;
+const ANIM_DURATION = 210;
 
 // ─── types ────────────────────────────────────────────────────────────────────
 
-type TabBox = { x: number; width: number };
-
 type Props = {
   active: ModeTabId;
   onChange: (id: ModeTabId) => void;
@@ -38,27 +41,37 @@
   ModeTabId,
   { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }
 > = {
-  repair:  { bg: colors.brandSoft,    fg: colors.brandStrong, icon: 'construct' },
-  general: { bg: colors.brandSoft,    fg: colors.brandStrong, icon: 'car-sport' },
-  oneman:  { bg: colors.successSoft,  fg: colors.success,     icon: 'flash'     },
-  sos:     { bg: colors.warningSoft,  fg: colors.sosAccent,   icon: 'warning'   },
+  repair:  { bg: colors.brandSoft,   fg: colors.brandStrong, icon: 'construct'  },
+  general: { bg: colors.brandSoft,   fg: colors.brandStrong, icon: 'car-sport'  },
+  oneman:  { bg: colors.successSoft, fg: colors.success,     icon: 'flash'      },
+  sos:     { bg: colors.warningSoft, fg: colors.sosAccent,   icon: 'warning'    },
 };
 
+/** Very faint brand tint — inactive glyph circle dissolves into the trough. */
+const INACTIVE_BG = 'rgba(23,107,158,0.07)';
+/**
+ * Muted in-family brand tint for inactive labels and icons.
+ * Keeps the whole cluster in the blue colour family instead of neutral grey.
+ */
+const INACTIVE_COLOR = 'rgba(23,107,158,0.52)';
+
 // ─── component ────────────────────────────────────────────────────────────────
 
 export function ModeTabs({ active, onChange }: Props) {
-  const [boxes, setBoxes] = useState<Partial<Record<ModeTabId, TabBox>>>({});
-
-  // ── accessibility: respect prefers-reduced-motion ──────────────────────────
+  // ── respect prefers-reduced-motion ────────────────────────────────────────
   const reduceMotion = useRef(false);
   useEffect(() => {
     AccessibilityInfo.isReduceMotionEnabled()
       .then((v) => { reduceMotion.current = v; })
-      .catch(() => {}); // ignore — safe default is animate
+      .catch(() => {}); // safe default: animate
   }, []);
 
-  // ── per-tab open/close Animated.Values (0 = inactive, 1 = active) ─────────
-  // Stable ref; initialised once so references never change.
+  // ── single JS-driven Animated.Value per tab: 0 = inactive, 1 = active ─────
+  //
+  // Every animated property — container height, flex-grow, background colour,
+  // shadow, icon lift/scale, and halo — is derived from one interpolated value.
+  // useNativeDriver:false is required for layout and colour properties.
+  // For a 4-item row the JS-thread cost is negligible.
   const tabAnims = useRef(
     MODE_TABS.reduce<Record<ModeTabId, Animated.Value>>(
       (acc, t) => ({
@@ -69,13 +82,7 @@
     ),
   ).current;
 
-  // ── scoop position Animated.Values ────────────────────────────────────────
-  const leftScoopX  = useRef(new Animated.Value(OFF_SCREEN)).current;
-  const rightScoopX = useRef(new Animated.Value(OFF_SCREEN)).current;
-  /** Tracks whether scoops have been placed at least once (first snap). */
-  const hasPlaced = useRef(false);
-
-  // ── animate tabs when active changes ──────────────────────────────────────
+  // ── animate the outgoing and incoming tabs simultaneously ─────────────────
   const prevActive = useRef<ModeTabId>(active);
   useEffect(() => {
     const prev = prevActive.current;
@@ -88,264 +95,278 @@
         toValue: 0,
         duration: dur,
         easing: Easing.out(Easing.cubic),
-        useNativeDriver: true,
+        useNativeDriver: false,
       }),
       Animated.timing(tabAnims[active], {
         toValue: 1,
         duration: dur,
         easing: Easing.out(Easing.cubic),
-        useNativeDriver: true,
+        useNativeDriver: false,
       }),
     ]).start();
   }, [active, tabAnims]);
 
-  // ── move scoops whenever the active tab or its measured box changes ────────
-  useEffect(() => {
-    const box = boxes[active];
-    if (!box) return;
-
-    // Snap on first placement; smooth transitions thereafter.
-    const dur = !hasPlaced.current || reduceMotion.current ? 0 : ANIM_DURATION;
-    hasPlaced.current = true;
-
-    const targetLeft  = TROUGH_PAD + box.x - SCOOP;
-    const targetRight = TROUGH_PAD + box.x + box.width;
-
-    Animated.parallel([
-      Animated.timing(leftScoopX, {
-        toValue: targetLeft,
-        duration: dur,
-        easing: Easing.out(Easing.cubic),
-        useNativeDriver: false, // 'left' is a layout prop — cannot use native driver
-      }),
-      Animated.timing(rightScoopX, {
-        toValue: targetRight,
-        duration: dur,
-        easing: Easing.out(Easing.cubic),
-        useNativeDriver: false,
-      }),
-    ]).start();
-  }, [active, boxes, leftScoopX, rightScoopX]);
-
-  // ── layout handler ─────────────────────────────────────────────────────────
-  function handleLayout(tabId: ModeTabId, event: LayoutChangeEvent) {
-    const { x, width } = event.nativeEvent.layout;
-    setBoxes((prev) => {
-      const cur = prev[tabId];
-      if (cur?.x === x && cur?.width === width) return prev; // no change
-      return { ...prev, [tabId]: { x, width } };
-    });
-  }
-
   // ─────────────────────────────────────────────────────────────────────────────
 
   return (
-    <View style={styles.trough} accessibilityRole="tablist">
+    <View
+      // @ts-expect-error — experimental_backgroundImage is an RN 0.76 experimental prop
+      style={styles.trough}
+      accessibilityRole="tablist"
+    >
       {MODE_TABS.map((tab) => {
         const selected = tab.id === active;
         const glyph    = GLYPH[tab.id];
         const anim     = tabAnims[tab.id];
 
-        // Icon lifts upward and scales slightly when active — native driver safe.
+        // ── all animated derivations read from a single Animated.Value ────────
+
+        /** Container grows taller as the tab activates → dune-crest topography. */
+        const containerH = anim.interpolate({
+          inputRange:  [0, 1],
+          outputRange: [FOLDER_H_INACTIVE, FOLDER_H_ACTIVE],
+        });
+        /**
+         * Active tab slightly wider — 2-D crest.
+         * With alignItems:'flex-end' the expansion spreads from the bottom up.
+         */
+        const containerFlex = anim.interpolate({
+          inputRange:  [0, 1],
+          outputRange: [1, 1.2],
+        });
+        /** White background fades in — the folder opening onto the content sheet. */
+        const tabBg = anim.interpolate({
+          inputRange:  [0, 1],
+          outputRange: ['rgba(255,255,255,0)', 'rgba(255,255,255,1)'],
+        });
+        /** Shadow opacity rises with the crest (iOS). */
+        const tabShadowOpacity = anim.interpolate({
+          inputRange:  [0, 1],
+          outputRange: [0, 0.13],
+        });
+        /** Android elevation rises with the crest. */
+        const tabElevation = anim.interpolate({
+          inputRange:  [0, 1],
+          outputRange: [0, 8],
+        });
+        /** Icon lifts upward when active — reinforces the raised-surface feel. */
         const iconTranslateY = anim.interpolate({
           inputRange:  [0, 1],
-          outputRange: [0, -3],
+          outputRange: [0, -4],
         });
+        /** Icon grows slightly when active. */
         const iconScale = anim.interpolate({
           inputRange:  [0, 1],
-          outputRange: [1, 1.08],
+          outputRange: [1, 1.13],
         });
+        /** Luminous brand halo fades in behind the active glyph. */
+        const haloOpacity = anim.interpolate({
+          inputRange:  [0, 1],
+          outputRange: [0, 1],
+        });
 
         return (
-          <Pressable
+          <Animated.View
             key={tab.id}
-            accessibilityRole="tab"
-            accessibilityState={{ selected }}
-            accessibilityLabel={tab.label}
-            focusable
-            onPress={() => { if (!selected) onChange(tab.id); }}
-            onLayout={(e) => handleLayout(tab.id, e)}
-            style={({ pressed }) => [
-              styles.folder,
-              selected ? styles.folderOpen : styles.folderClosed,
-              pressed && !selected && styles.folderPressed,
+            style={[
+              styles.folderOuter,
+              {
+                minHeight:        containerH,
+                flexGrow:         containerFlex,
+                backgroundColor:  tabBg,
+                shadowOpacity:    tabShadowOpacity,
+                elevation:        tabElevation,
+              },
             ]}
           >
-            {/* Icon glyph */}
-            <Animated.View
-              style={[
-                styles.glyph,
-                { backgroundColor: selected ? glyph.bg : INACTIVE_GLYPH_BG },
-                {
-                  transform: [
-                    { translateY: iconTranslateY },
-                    { scale: iconScale },
-                  ],
-                },
+            <Pressable
+              accessibilityRole="tab"
+              accessibilityState={{ selected }}
+              accessibilityLabel={tab.label}
+              focusable
+              onPress={() => { if (!selected) onChange(tab.id); }}
+              style={({ pressed }) => [
+                styles.folder,
+                pressed && !selected && styles.folderPressed,
               ]}
             >
-              <Ionicons
-                name={glyph.icon}
-                size={26}
-                color={selected ? glyph.fg : colors.textMuted}
-              />
-            </Animated.View>
+              {/* ── glyph + halo ─────────────────────────────────────────── */}
+              <View style={styles.glyphWrapper}>
+                {/* Soft brand glow — fades in with the active state */}
+                <Animated.View
+                  pointerEvents="none"
+                  style={[styles.glyphHalo, { opacity: haloOpacity }]}
+                />
+                {/* Icon circle — squircle corners via borderCurve:'continuous' */}
+                <Animated.View
+                  style={[
+                    styles.glyph,
+                    { backgroundColor: selected ? glyph.bg : INACTIVE_BG },
+                    {
+                      transform: [
+                        { translateY: iconTranslateY },
+                        { scale: iconScale },
+                      ],
+                    },
+                  ]}
+                >
+                  <Ionicons
+                    name={glyph.icon}
+                    size={26}
+                    color={selected ? glyph.fg : INACTIVE_COLOR}
+                  />
+                </Animated.View>
+              </View>
 
-            {/* Label lines */}
-            {tab.folderLines.map((line) => (
-              <Text
-                key={line}
-                numberOfLines={1}
-                adjustsFontSizeToFit
-                minimumFontScale={0.85}
-                style={[
-                  styles.label,
-                  selected && styles.labelOpen,
-                  selected && tab.sos && styles.labelSos,
-                ]}
-              >
-                {line}
-              </Text>
-            ))}
-          </Pressable>
+              {/* ── label lines ──────────────────────────────────────────── */}
+              {tab.folderLines.map((line) => (
+                <Text
+                  key={line}
+                  numberOfLines={1}
+                  adjustsFontSizeToFit
+                  minimumFontScale={0.80}
+                  style={[
+                    styles.label,
+                    selected ? styles.labelOpen : styles.labelInactive,
+                    selected && tab.sos && styles.labelSos,
+                  ]}
+                >
+                  {line}
+                </Text>
+              ))}
+            </Pressable>
+          </Animated.View>
         );
       })}
-
-      {/*
-        Shoulder curves — concave quarter-circle connectors that visually join
-        the active tab to the content panel below.
-
-        Technique: each scoop is a SCOOP×SCOOP container (backgroundColor=surface)
-        with an oversized circle (2×SCOOP, backgroundColor=brandSoft) positioned
-        so only one quadrant is visible through the container's overflow:hidden.
-        The brandSoft quarter-circle creates the concave "trough-coloured" curve
-        while the white container area extends the folderSheet upward into the gap.
-
-        They sit at bottom:-SCOOP (below the trough bounds) but remain inside
-        dockInner's bounds (the folderSheet region), so dockInner's
-        overflow:hidden does not clip them.  The trough's zIndex:2 ensures they
-        render above the folderSheet.
-      */}
-      <Animated.View
-        pointerEvents="none"
-        style={[styles.scoop, { left: leftScoopX }]}
-      >
-        <View style={[styles.scoopFill, styles.scoopLeft]} />
-      </Animated.View>
-      <Animated.View
-        pointerEvents="none"
-        style={[styles.scoop, { left: rightScoopX }]}
-      >
-        <View style={[styles.scoopFill, styles.scoopRight]} />
-      </Animated.View>
     </View>
   );
 }
 
-// ─── style constants ──────────────────────────────────────────────────────────
+// ─── styles ───────────────────────────────────────────────────────────────────
 
-/** Semi-transparent branded background for inactive glyph circles. */
-const INACTIVE_GLYPH_BG = 'rgba(23,107,158,0.08)';
-
 const styles = StyleSheet.create({
+  // ── trough ──────────────────────────────────────────────────────────────────
   trough: {
-    flexDirection: 'row',
-    alignItems: 'flex-end',
-    backgroundColor: colors.brandSoft,
-    paddingHorizontal: TROUGH_PAD,
-    paddingTop: 10,
-    gap: 4,
-    overflow: 'visible', // allow scoops to render below the trough boundary
-    zIndex: 2,
+    flexDirection:     'row',
+    alignItems:        'flex-end',
+    backgroundColor:   colors.brandSoft,
+    paddingHorizontal: TROUGH_PAD_H,
+    gap:               8,
+    overflow:          'visible', // let the active-tab shadow escape below
+    zIndex:            2,
+    // Fixed minimum height locks the row during crest animation so the
+    // content panel below never shifts.
+    minHeight: TROUGH_MIN_H,
+    // Subtle top-edge highlight gives the brandSoft surface visual dimension
+    // (light catching the top of the trough plane).
+    experimental_backgroundImage:
+      'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 55%)',
   },
 
-  // ── folder tabs ─────────────────────────────────────────────────────────────
+  // ── outer Animated.View ─────────────────────────────────────────────────────
+  //
+  // Carries all animated properties: height, flex-grow, background colour, and
+  // shadow.  borderCurve:'continuous' gives iOS squircle curvature — the smooth,
+  // app-icon–style corners that make rounded shapes look premium instead of
+  // a plain circular arc.
+  folderOuter: {
+    flexBasis:  0,
+    flexShrink: 1,
+    minWidth:   0,
+    borderTopLeftRadius:  radius.folder, // 28
+    borderTopRightRadius: radius.folder,
+    borderCurve: 'continuous',
+    // Shadow base — opacity and elevation are overridden by animated inline values
+    // so the crest's shadow only appears when the tab is active.
+    shadowColor:  shadow.folder.shadowColor,
+    shadowOffset: shadow.folder.shadowOffset,
+    shadowRadius: shadow.folder.shadowRadius,
+    overflow:     'visible', // icon lift and shadow extend beyond bounds
+  },
+
+  // ── inner Pressable ─────────────────────────────────────────────────────────
+  // Fills the Animated.View, handles touch, keeps its own background transparent
+  // so the animated white layer on the outer view shows through.
   folder: {
-    flex: 1,
-    minWidth: 0, // prevent overflow on narrow viewports
-    alignItems: 'center',
-    justifyContent: 'flex-end',
-    minHeight: 92,
-    paddingHorizontal: 2,
-    paddingTop: 10,
-    paddingBottom: 10,
-    borderTopLeftRadius: radius.folder,
+    flex:              1,
+    minWidth:          0,
+    alignItems:        'center',
+    justifyContent:    'flex-end',
+    paddingHorizontal: 6,
+    paddingTop:        10,
+    paddingBottom:     10,
+    borderTopLeftRadius:  radius.folder,
     borderTopRightRadius: radius.folder,
+    borderCurve: 'continuous',
   },
-  folderClosed: {
-    backgroundColor: 'rgba(23,107,158,0.14)',
-    // Subtle top/side border separates adjacent inactive tabs from each other
-    // and from the trough background without adding visual weight.
-    borderTopWidth: 1,
-    borderLeftWidth: 1,
-    borderRightWidth: 1,
-    borderBottomWidth: 0,
-    borderTopColor: 'rgba(23,107,158,0.10)',
-    borderLeftColor: 'rgba(23,107,158,0.10)',
-    borderRightColor: 'rgba(23,107,158,0.10)',
+
+  folderPressed: {
+    opacity: 0.68,
   },
-  folderOpen: {
-    backgroundColor: colors.surface,
-    // Subtle elevation to reinforce "raised" metaphor.
-    ...shadow.nav,
+
+  // ── glyph ────────────────────────────────────────────────────────────────────
+  /**
+   * Fixed-size anchor so the animated (scaling, translating) icon and its
+   * oversized halo do not push label siblings.
+   */
+  glyphWrapper: {
+    width:          46,
+    height:         46,
+    alignItems:     'center',
+    justifyContent: 'center',
+    marginBottom:   5,
+    overflow:       'visible', // halo and scaled glyph extend beyond wrapper
   },
-  folderPressed: {
-    opacity: 0.70,
+
+  /**
+   * Soft brand-coloured halo rendered behind the icon circle.
+   * opacity is driven by the per-tab Animated.Value.
+   */
+  glyphHalo: {
+    position:        'absolute',
+    width:           58,
+    height:          58,
+    borderRadius:    29,
+    borderCurve:     'continuous',
+    backgroundColor: 'rgba(93,183,232,0.18)',
+    shadowColor:     colors.brand,
+    shadowOffset:    { width: 0, height: 0 },
+    shadowOpacity:   0.38,
+    shadowRadius:    10,
   },
 
-  // ── glyph icon circle ───────────────────────────────────────────────────────
+  /** Icon circle with squircle corners. */
   glyph: {
-    width: 46,
-    height: 46,
-    borderRadius: 14,
-    alignItems: 'center',
+    width:          46,
+    height:         46,
+    borderRadius:   23,
+    borderCurve:    'continuous',
+    alignItems:     'center',
     justifyContent: 'center',
-    marginBottom: 5,
   },
 
-  // ── labels ──────────────────────────────────────────────────────────────────
+  // ── labels ───────────────────────────────────────────────────────────────────
   label: {
     ...type.label,
-    fontSize: 10,
+    fontSize:  10,
     lineHeight: 13,
     textAlign: 'center',
-    color: colors.textMuted,
-    fontWeight: '500',
   },
+
+  /** Inactive: muted in-family blue — stays in the brand colour family. */
+  labelInactive: {
+    color:      INACTIVE_COLOR,
+    fontWeight: '400',
+  },
+
   labelOpen: {
-    color: colors.brandStrong,
+    color:      colors.brandStrong,
     fontWeight: '700',
-    fontSize: 11,
+    fontSize:   11,
     lineHeight: 14,
   },
+
   labelSos: {
     color: colors.sosAccent,
   },
-
-  // ── shoulder curves ─────────────────────────────────────────────────────────
-  scoop: {
-    position: 'absolute',
-    bottom: -SCOOP,   // positioned below the trough, above the folderSheet
-    width: SCOOP,
-    height: SCOOP,
-    overflow: 'hidden',
-    backgroundColor: colors.surface, // matches the folderSheet
-  },
-  scoopFill: {
-    position: 'absolute',
-    width: SCOOP * 2,
-    height: SCOOP * 2,
-    borderRadius: SCOOP,
-    backgroundColor: colors.brandSoft, // matches the trough
-  },
-  /** Left scoop: brandSoft circle centred at the top-left corner of the box. */
-  scoopLeft: {
-    left: -SCOOP,
-    top: -SCOOP,
-  },
-  /** Right scoop: brandSoft circle centred at the top-right corner of the box. */
-  scoopRight: {
-    left: 0,
-    top: -SCOOP,
-  },
 });
--- a/packages/ui-tokens/src/radius.ts
+++ b/packages/ui-tokens/src/radius.ts
@@ -6,8 +6,8 @@
   card: 16,
   tile: 20,
   sheet: 32,
-  folder: 22,
-  folderScoop: 14,
+  /** Folder-tab top corners — generous archway shape. */
+  folder: 28,
   pill: 999,
 } as const;
 
@@ -19,6 +19,14 @@
     shadowRadius: 2,
     elevation: 2,
   },
+  /** Raised elevation for the active folder-tab crest. */
+  folder: {
+    shadowColor: colors.textStrong,
+    shadowOffset: { width: 0, height: 6 },
+    shadowOpacity: 0.14,
+    shadowRadius: 14,
+    elevation: 8,
+  },
   sheet: {
     shadowColor: colors.textStrong,
     shadowOffset: { width: 0, height: -4 },
--- a/apps/customer/app/(customer)/(tabs)/home.tsx
+++ b/apps/customer/app/(customer)/(tabs)/home.tsx
@@ -1,8 +1,8 @@
 import { ApiError } from '@caratom/api-client';
 import { Ionicons } from '@expo/vector-icons';
 import { useQuery } from '@tanstack/react-query';
-import { useCallback, useEffect, useMemo, useState } from 'react';
-import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
+import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
+import { Animated, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
 import { useRouter } from 'expo-router';
 
 import { HomeMasthead } from '../../../src/components/home/HomeMasthead';
@@ -36,6 +36,9 @@
   const router = useRouter();
   const [tab, setTab] = useState<ModeTabId>('repair');
   const [error, setError] = useState<string | null>(null);
+  // Crossfade animation — briefly dips opacity when the active tab changes so
+  // the content switch feels like one connected system instead of a hard cut.
+  const contentFade = useRef(new Animated.Value(1)).current;
   const draft = useVehicleDraftStore();
   const setFlowKind = useJobCardFlowStore((s) => s.setFlowKind);
   const location = useLiveLocation(tab === 'sos');
@@ -111,9 +114,24 @@
             onChange={(next) => {
               setTab(next);
               track('home_tab_changed', { tab: next });
+              // Quick fade-out → fade-in so tapping a tab and the content
+              // updating feel like one transition, not a hard cut.
+              Animated.sequence([
+                Animated.timing(contentFade, {
+                  toValue: 0.45,
+                  duration: 65,
+                  useNativeDriver: true,
+                }),
+                Animated.timing(contentFade, {
+                  toValue: 1,
+                  duration: 190,
+                  useNativeDriver: true,
+                }),
+              ]).start();
             }}
           />
           <View style={styles.folderSheet}>
+            <Animated.View style={[styles.contentFadeWrap, { opacity: contentFade }]}>
             {loading ? <HomeSkeleton /> : null}
             {error ? (
               <View style={styles.pad}>
@@ -285,6 +303,7 @@
                 ) : null}
               </ScrollView>
             ) : null}
+            </Animated.View>
           </View>
         </View>
       </View>
@@ -314,6 +333,9 @@
     backgroundColor: colors.surface,
     zIndex: 0,
   },
+  contentFadeWrap: {
+    flex: 1,
+  },
   pad: { paddingHorizontal: 16, paddingTop: 16 },
   body: {
     paddingHorizontal: layout.pagePad,
`````

## 5. Replication Instructions for the Receiving Cursor Instance

The receiving Cursor instance must follow these steps exactly.

### Step 1 — Verify the repository

Confirm you are operating on a copy of the **CarAtom** repository and that its
`HEAD` commit SHA is `96fb0c4ee500b636c303a58423e9e376ef966ea1`:

```bash
git rev-parse HEAD
# Expected: 96fb0c4ee500b636c303a58423e9e376ef966ea1
```

### Step 2 — Apply CA1 changes first

Before applying this document's changes, the CA1 changes must already be present
in the working tree (but **not** committed).  The expected CA1 baseline SHA-256
values for the two files it touches are:

| File | CA1 baseline SHA-256 |
|---|---|
| `apps/customer/src/components/home/ModeTabs.tsx` | `53cc7910fcbb65569317d1a795c644044e2f35d2f393984e5d6890e82d5dd42b` |
| `packages/ui-tokens/src/radius.ts` | `d5e5ef3165ec81ecfd97dc470d1ca3ac218b99e8ca9a0b7fef1e8b28f556db38` |
| `apps/customer/app/(customer)/(tabs)/home.tsx` | `a50a3b16c3a31c10b728993f317d1d3588fd1747c7b9d21748a93e5e8902b9da` |

Verify with:

```bash
sha256sum apps/customer/src/components/home/ModeTabs.tsx
sha256sum packages/ui-tokens/src/radius.ts
sha256sum "apps/customer/app/(customer)/(tabs)/home.tsx"
```

If the hashes do not match, apply `changes_CA1.md` first.  Stop and report the
mismatch if the working tree has diverged further.

### Step 3 — Apply the canonical patch

Save the patch from Section 4 above to a file (e.g., `ca2.patch`), then apply:

```bash
patch -p1 < ca2.patch
```

If line-offset conflicts occur, use the exact before/after code blocks in
Section 3 to resolve them manually.

### Step 4 — Verify final file hashes

After applying, verify that every changed file matches the expected final hash:

```bash
sha256sum apps/customer/src/components/home/ModeTabs.tsx
# Expected: d1a3cfa59b1f09f25b99c583f224c701c86a18a71c44d9a2d1bc51a4b27c318f

sha256sum packages/ui-tokens/src/radius.ts
# Expected: 6707b828104c7fc3635a842852b03d99655a0c4a4374c1fc7eceffd3795c1b24

sha256sum "apps/customer/app/(customer)/(tabs)/home.tsx"
# Expected: 5b9bfa417d1b53d0d50d64d58867fad7b54228f86e1b614e826b3502e390941c
```

If any hash does not match, do not proceed.  Compare the failing file against
the complete per-file section in this document line by line.

### Step 5 — Verify no additional diff

After applying, confirm that no files outside the three listed above have
changed:

```bash
git diff --name-only
# Expected output (no commit order enforced):
# apps/customer/app/(customer)/(tabs)/home.tsx
# apps/customer/src/components/home/ModeTabs.tsx
# packages/ui-tokens/src/radius.ts
```

### Step 6 — Run verification suite

After successful hash verification, run the following (adjust filter names if
different in the target environment):

```bash
pnpm --filter @caratom/customer typecheck
pnpm --filter @caratom/ui-tokens typecheck
pnpm --filter @caratom/customer lint
```

Report every applied file, verification result, typecheck result, lint result,
and any unresolved conflict.

### Rules the receiving instance must follow

1. Reproduce **only** the changes recorded in this document.
2. Do not refactor, simplify, improve, reinterpret, or add any code.
3. Do not introduce any change absent from this document.
4. Preserve all paths, filenames, casing, whitespace, modes, and file contents
   exactly.
5. Do not modify `changes_CA1.md`, `changes_CA2.md`, or `tmp.lzhQTAvoGM/`.
6. Do not commit the changes unless explicitly instructed.

---

## 6. Verification Record

Verification was performed against the live working tree immediately before
writing this document.

| Check | Result | Details |
|---|---|---|
| All three CA2 files present in working tree | ✅ Pass | `git status` confirmed all three as `modified` |
| CA1 baseline reconstructed by applying `tmp.lzhQTAvoGM/task.patch` to HEAD files | ✅ Pass | `patch -p1 --batch` succeeded; CA1 baseline files produced |
| CA2 diff computed (CA1 baseline → current working tree) | ✅ Pass | 679-line unified diff produced covering 12 hunks across 3 files |
| `apps/customer/src/components/home/ModeTabs.tsx` original SHA-256 | ✅ Pass | `53cc7910…` verified against CA1 baseline file |
| `apps/customer/src/components/home/ModeTabs.tsx` final SHA-256 | ✅ Pass | `d1a3cfa5…` verified against working tree file |
| `packages/ui-tokens/src/radius.ts` original SHA-256 | ✅ Pass | `d5e5ef31…` verified against CA1 baseline file |
| `packages/ui-tokens/src/radius.ts` final SHA-256 | ✅ Pass | `6707b828…` verified against working tree file |
| `apps/customer/app/(customer)/(tabs)/home.tsx` original SHA-256 | ✅ Pass | `a50a3b16…` verified against HEAD (CA1 did not touch this file) |
| `apps/customer/app/(customer)/(tabs)/home.tsx` final SHA-256 | ✅ Pass | `5b9bfa41…` verified against working tree file |
| No CA1 changes included in this document | ✅ Pass | CA1 baseline used as starting point; only delta is documented |
| No unrelated files included | ✅ Pass | Only the 3 files with CA2 modifications are listed |
| `folderScoop` token absent from final `radius.ts` | ✅ Pass | `grep folderScoop packages/ui-tokens/src/radius.ts` → no matches |
| `shadow.folder` token present in final `radius.ts` | ✅ Pass | `grep -A6 'folder:' packages/ui-tokens/src/radius.ts` shows entry |
| `scoop`/`scoopFill`/`scoopLeft`/`scoopRight` absent from final `ModeTabs.tsx` | ✅ Pass | No occurrences found |
| `useNativeDriver: false` used for layout/colour animations | ✅ Pass | Both `Animated.timing` calls in the tab-switch effect use `false` |
| `useNativeDriver: true` used for content crossfade | ✅ Pass | Both `Animated.timing` calls in `home.tsx` use `true` |
| `borderCurve: 'continuous'` present on `folderOuter`, `folder`, `glyph`, `glyphHalo` | ✅ Pass | All four style entries verified |
| `experimental_backgroundImage` present in `trough` style | ✅ Pass | Suppressed by `@ts-expect-error` comment on `<View>` |
| Patch applied cleanly to a temporary copy of CA1 baseline | ✅ Pass | `patch -p1` returned exit 0 in temp directory |
| Final file hashes match post-patch files | ✅ Pass | All three SHA-256 values confirmed |
