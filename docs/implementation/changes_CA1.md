# changes\_CA1 — Premium Folder-Tab Navigation for ModeTabs

Complete, lossless, code-level transfer document.

---

## 1. Source-State Metadata

| Field | Value |
|---|---|
| Repository name | CarAtom |
| Remote URL | `https://github.com/ananyabusiness17-cmyk/CarAtom.git` |
| Source branch | `main` |
| Baseline branch / commit | `main` / `96fb0c4ee500b636c303a58423e9e376ef966ea1` |
| Full baseline commit SHA | `96fb0c4ee500b636c303a58423e9e376ef966ea1` |
| Current branch | `main` |
| Current HEAD commit SHA | `96fb0c4ee500b636c303a58423e9e376ef966ea1` |
| Staged changes included | No |
| Unstaged changes included | Yes — all task changes are unstaged modifications |
| Committed changes included | No — no task-specific commits were created |
| Untracked files included | No — no untracked task files |
| Generation timestamp (UTC) | `2026-09-03T19:08:00Z` |
| Total added files | 0 |
| Total modified files | 2 |
| Total deleted files | 0 |
| Total renamed files | 0 |
| Total mode-changed files | 0 |

---

## 2. Complete File Inventory

| # | Repository-relative path | Original path | Change type | Original line count | Final line count | Additions | Deletions | SHA-256 (original) | SHA-256 (final) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `apps/customer/src/components/home/ModeTabs.tsx` | — | modified | 167 | 351 | 235 | 51 | `b9a48cd8c51fe2fd9a2aeb3c51b0f79e20c7104aa6f0aaf87aa9beacc8e0604a` | `53cc7910fcbb65569317d1a795c644044e2f35d2f393984e5d6890e82d5dd42b` |
| 2 | `packages/ui-tokens/src/radius.ts` | — | modified | 28 | 29 | 1 | 0 | `9a250d8d5c4ff0ff03ae2d248ca0c3009c72bbec3485f34ed429ab7d81d6c92a` | `d5e5ef3165ec81ecfd97dc470d1ca3ac218b99e8ca9a0b7fef1e8b28f556db38` |

---

## 3. Exact Per-File Changes

### 3.1 `apps/customer/src/components/home/ModeTabs.tsx`

- **Change type:** modified
- **Original file mode:** 100644
- **Final file mode:** 100644
- **Original line-ending format:** LF
- **Final line-ending format:** LF
- **Hunks:** 3

#### Hunk 1 of 3

- **Original range:** lines 1–63
- **Final range:** lines 1–203
- **Unified-diff header:** `@@ -1,63 +1,203 @@`

**Code before (original lines 1–63):**

```typescript
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MODE_TABS, type ModeTabId } from '../../lib/modeTabs';
import { colors, radius, type } from '../../theme/tokens';

const SCOOP = 12;
const TROUGH_PAD = 8;

type Props = {
  active: ModeTabId;
  onChange: (id: ModeTabId) => void;
};

type TabBox = { x: number; width: number };

const GLYPH: Record<
  ModeTabId,
  { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  repair: { bg: colors.surface, fg: colors.brandStrong, icon: 'construct' },
  general: { bg: colors.surface, fg: colors.brandStrong, icon: 'car-sport' },
  oneman: { bg: colors.successSoft, fg: colors.success, icon: 'flash' },
  sos: { bg: colors.warningSoft, fg: colors.sosAccent, icon: 'warning' },
};

export function ModeTabs({ active, onChange }: Props) {
  const [boxes, setBoxes] = useState<Partial<Record<ModeTabId, TabBox>>>({});
  const activeBox = boxes[active];

  return (
    <View style={styles.trough} accessibilityRole="tablist">
      {MODE_TABS.map((tab) => {
        const selected = tab.id === active;
        const glyph = GLYPH[tab.id];
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.id)}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              setBoxes((prev) => {
                const cur = prev[tab.id];
                if (cur && cur.x === x && cur.width === width) return prev;
                return { ...prev, [tab.id]: { x, width } };
              });
            }}
            style={[styles.folder, selected ? styles.folderOpen : styles.folderClosed]}
          >
            <View style={[styles.glyph, { backgroundColor: glyph.bg }]}>
              <Ionicons name={glyph.icon} size={26} color={glyph.fg} />
            </View>
            {tab.folderLines.map((line) => (
              <Text
                key={line}
                numberOfLines={1}
                style={[
                  styles.label,
                  selected && styles.labelOpen,
                  selected && tab.sos && styles.labelSos,
                ]}
              >
```

**Code after (final lines 1–203):**

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

// ─── component ────────────────────────────────────────────────────────────────

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
```

#### Hunk 2 of 3

- **Original range:** lines 70–95 (26 lines)
- **Final range:** lines 210–252 (43 lines)
- **Unified-diff header:** `@@ -70,26 +210,43 @@`

**Code before (original lines 70–95):**

```typescript
          </Pressable>
        );
      })}
      {activeBox ? (
        <>
          <View
            pointerEvents="none"
            style={[styles.scoop, { left: TROUGH_PAD + activeBox.x - SCOOP }]}
          >
            <View style={[styles.scoopFill, styles.scoopLeft]} />
          </View>
          <View
            pointerEvents="none"
            style={[styles.scoop, { left: TROUGH_PAD + activeBox.x + activeBox.width }]}
          >
            <View style={[styles.scoopFill, styles.scoopRight]} />
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  trough: {
    flexDirection: 'row',
```

**Code after (final lines 210–252):**

```typescript
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

// ─── style constants ──────────────────────────────────────────────────────────

/** Semi-transparent branded background for inactive glyph circles. */
const INACTIVE_GLYPH_BG = 'rgba(23,107,158,0.08)';

const styles = StyleSheet.create({
  trough: {
    flexDirection: 'row',
```

#### Hunk 3 of 3

- **Original range:** lines 98–165 (68 lines)
- **Final range:** lines 255–349 (95 lines)
- **Unified-diff header:** `@@ -98,68 +255,95 @@`

**Code before (original lines 98–165):**

```typescript
    paddingHorizontal: TROUGH_PAD,
    paddingTop: 10,
    gap: 4,
    overflow: 'visible',
    zIndex: 2,
  },
  folder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 92,
    paddingHorizontal: 2,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopLeftRadius: radius.folder,
    borderTopRightRadius: radius.folder,
  },
  folderClosed: {
    backgroundColor: 'rgba(93,183,232,0.28)',
  },
  folderOpen: {
    backgroundColor: colors.surface,
  },
  glyph: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    ...type.label,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    color: colors.text,
    fontWeight: '600',
  },
  labelOpen: {
    color: colors.brandStrong,
    fontWeight: '700',
  },
  labelSos: {
    color: colors.sosAccent,
  },
  scoop: {
    position: 'absolute',
    bottom: -SCOOP,
    width: SCOOP,
    height: SCOOP,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  scoopFill: {
    position: 'absolute',
    width: SCOOP * 2,
    height: SCOOP * 2,
    borderRadius: SCOOP,
    backgroundColor: colors.brandSoft,
  },
  scoopLeft: {
    left: -SCOOP,
    top: -SCOOP,
  },
  scoopRight: {
    left: 0,
    top: -SCOOP,
  },
```

**Code after (final lines 255–349):**

```typescript
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
```

---

### 3.2 `packages/ui-tokens/src/radius.ts`

- **Change type:** modified
- **Original file mode:** 100644
- **Final file mode:** 100644
- **Original line-ending format:** LF
- **Final line-ending format:** LF
- **Hunks:** 1

#### Hunk 1 of 1

- **Original range:** lines 7–12 (6 lines)
- **Final range:** lines 7–13 (7 lines)
- **Unified-diff header:** `@@ -7,6 +7,7 @@`

**Code before (original lines 7–12):**

```typescript
  tile: 20,
  sheet: 32,
  folder: 22,
  pill: 999,
} as const;
```

**Code after (final lines 7–13):**

```typescript
  tile: 20,
  sheet: 32,
  folder: 22,
  folderScoop: 14,
  pill: 999,
} as const;
```

---

## 4. Canonical Complete Patch

Generated directly from the repository via `git diff --full-index HEAD`.

``````diff
diff --git a/apps/customer/src/components/home/ModeTabs.tsx b/apps/customer/src/components/home/ModeTabs.tsx
index ae0470b5d2550820de20ac9ae189374d6c045615..d9eeef87401eed5875ba03bc5a0794d3a6b7611f 100644
--- a/apps/customer/src/components/home/ModeTabs.tsx
+++ b/apps/customer/src/components/home/ModeTabs.tsx
@@ -1,63 +1,203 @@
 import { Ionicons } from '@expo/vector-icons';
-import { useState } from 'react';
-import { Pressable, StyleSheet, Text, View } from 'react-native';
+import { useEffect, useRef, useState } from 'react';
+import {
+  AccessibilityInfo,
+  Animated,
+  Easing,
+  Pressable,
+  StyleSheet,
+  Text,
+  View,
+  type LayoutChangeEvent,
+} from 'react-native';
 
 import { MODE_TABS, type ModeTabId } from '../../lib/modeTabs';
-import { colors, radius, type } from '../../theme/tokens';
+import { colors, radius, shadow, type } from '../../theme/tokens';
 
-const SCOOP = 12;
+// ─── constants ────────────────────────────────────────────────────────────────
+
+/** Shoulder-curve radius — mirrors the `radius.folderScoop` token. */
+const SCOOP = radius.folderScoop; // 14
 const TROUGH_PAD = 8;
+const ANIM_DURATION = 220;
+/** Initial off-screen value so scoops don't flash at (0, 0). */
+const OFF_SCREEN = -999;
+
+// ─── types ────────────────────────────────────────────────────────────────────
+
+type TabBox = { x: number; width: number };
 
 type Props = {
   active: ModeTabId;
   onChange: (id: ModeTabId) => void;
 };
 
-type TabBox = { x: number; width: number };
+// ─── per-tab glyph config ─────────────────────────────────────────────────────
 
 const GLYPH: Record<
   ModeTabId,
   { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }
 > = {
-  repair: { bg: colors.surface, fg: colors.brandStrong, icon: 'construct' },
-  general: { bg: colors.surface, fg: colors.brandStrong, icon: 'car-sport' },
-  oneman: { bg: colors.successSoft, fg: colors.success, icon: 'flash' },
-  sos: { bg: colors.warningSoft, fg: colors.sosAccent, icon: 'warning' },
+  repair:  { bg: colors.brandSoft,    fg: colors.brandStrong, icon: 'construct' },
+  general: { bg: colors.brandSoft,    fg: colors.brandStrong, icon: 'car-sport' },
+  oneman:  { bg: colors.successSoft,  fg: colors.success,     icon: 'flash'     },
+  sos:     { bg: colors.warningSoft,  fg: colors.sosAccent,   icon: 'warning'   },
 };
 
+// ─── component ────────────────────────────────────────────────────────────────
+
 export function ModeTabs({ active, onChange }: Props) {
   const [boxes, setBoxes] = useState<Partial<Record<ModeTabId, TabBox>>>({});
-  const activeBox = boxes[active];
+
+  // ── accessibility: respect prefers-reduced-motion ──────────────────────────
+  const reduceMotion = useRef(false);
+  useEffect(() => {
+    AccessibilityInfo.isReduceMotionEnabled()
+      .then((v) => { reduceMotion.current = v; })
+      .catch(() => {}); // ignore — safe default is animate
+  }, []);
+
+  // ── per-tab open/close Animated.Values (0 = inactive, 1 = active) ─────────
+  // Stable ref; initialised once so references never change.
+  const tabAnims = useRef(
+    MODE_TABS.reduce<Record<ModeTabId, Animated.Value>>(
+      (acc, t) => ({
+        ...acc,
+        [t.id]: new Animated.Value(t.id === active ? 1 : 0),
+      }),
+      {} as Record<ModeTabId, Animated.Value>,
+    ),
+  ).current;
+
+  // ── scoop position Animated.Values ────────────────────────────────────────
+  const leftScoopX  = useRef(new Animated.Value(OFF_SCREEN)).current;
+  const rightScoopX = useRef(new Animated.Value(OFF_SCREEN)).current;
+  /** Tracks whether scoops have been placed at least once (first snap). */
+  const hasPlaced = useRef(false);
+
+  // ── animate tabs when active changes ──────────────────────────────────────
+  const prevActive = useRef<ModeTabId>(active);
+  useEffect(() => {
+    const prev = prevActive.current;
+    if (prev === active) return;
+    prevActive.current = active;
+
+    const dur = reduceMotion.current ? 0 : ANIM_DURATION;
+    Animated.parallel([
+      Animated.timing(tabAnims[prev], {
+        toValue: 0,
+        duration: dur,
+        easing: Easing.out(Easing.cubic),
+        useNativeDriver: true,
+      }),
+      Animated.timing(tabAnims[active], {
+        toValue: 1,
+        duration: dur,
+        easing: Easing.out(Easing.cubic),
+        useNativeDriver: true,
+      }),
+    ]).start();
+  }, [active, tabAnims]);
+
+  // ── move scoops whenever the active tab or its measured box changes ────────
+  useEffect(() => {
+    const box = boxes[active];
+    if (!box) return;
+
+    // Snap on first placement; smooth transitions thereafter.
+    const dur = !hasPlaced.current || reduceMotion.current ? 0 : ANIM_DURATION;
+    hasPlaced.current = true;
+
+    const targetLeft  = TROUGH_PAD + box.x - SCOOP;
+    const targetRight = TROUGH_PAD + box.x + box.width;
+
+    Animated.parallel([
+      Animated.timing(leftScoopX, {
+        toValue: targetLeft,
+        duration: dur,
+        easing: Easing.out(Easing.cubic),
+        useNativeDriver: false, // 'left' is a layout prop — cannot use native driver
+      }),
+      Animated.timing(rightScoopX, {
+        toValue: targetRight,
+        duration: dur,
+        easing: Easing.out(Easing.cubic),
+        useNativeDriver: false,
+      }),
+    ]).start();
+  }, [active, boxes, leftScoopX, rightScoopX]);
+
+  // ── layout handler ─────────────────────────────────────────────────────────
+  function handleLayout(tabId: ModeTabId, event: LayoutChangeEvent) {
+    const { x, width } = event.nativeEvent.layout;
+    setBoxes((prev) => {
+      const cur = prev[tabId];
+      if (cur?.x === x && cur?.width === width) return prev; // no change
+      return { ...prev, [tabId]: { x, width } };
+    });
+  }
+
+  // ─────────────────────────────────────────────────────────────────────────────
 
   return (
     <View style={styles.trough} accessibilityRole="tablist">
       {MODE_TABS.map((tab) => {
         const selected = tab.id === active;
-        const glyph = GLYPH[tab.id];
+        const glyph    = GLYPH[tab.id];
+        const anim     = tabAnims[tab.id];
+
+        // Icon lifts upward and scales slightly when active — native driver safe.
+        const iconTranslateY = anim.interpolate({
+          inputRange:  [0, 1],
+          outputRange: [0, -3],
+        });
+        const iconScale = anim.interpolate({
+          inputRange:  [0, 1],
+          outputRange: [1, 1.08],
+        });
+
         return (
           <Pressable
             key={tab.id}
             accessibilityRole="tab"
             accessibilityState={{ selected }}
             accessibilityLabel={tab.label}
-            onPress={() => onChange(tab.id)}
-            onLayout={(event) => {
-              const { x, width } = event.nativeEvent.layout;
-              setBoxes((prev) => {
-                const cur = prev[tab.id];
-                if (cur && cur.x === x && cur.width === width) return prev;
-                return { ...prev, [tab.id]: { x, width } };
-              });
-            }}
-            style={[styles.folder, selected ? styles.folderOpen : styles.folderClosed]}
+            focusable
+            onPress={() => { if (!selected) onChange(tab.id); }}
+            onLayout={(e) => handleLayout(tab.id, e)}
+            style={({ pressed }) => [
+              styles.folder,
+              selected ? styles.folderOpen : styles.folderClosed,
+              pressed && !selected && styles.folderPressed,
+            ]}
           >
-            <View style={[styles.glyph, { backgroundColor: glyph.bg }]}>
-              <Ionicons name={glyph.icon} size={26} color={glyph.fg} />
-            </View>
+            {/* Icon glyph */}
+            <Animated.View
+              style={[
+                styles.glyph,
+                { backgroundColor: selected ? glyph.bg : INACTIVE_GLYPH_BG },
+                {
+                  transform: [
+                    { translateY: iconTranslateY },
+                    { scale: iconScale },
+                  ],
+                },
+              ]}
+            >
+              <Ionicons
+                name={glyph.icon}
+                size={26}
+                color={selected ? glyph.fg : colors.textMuted}
+              />
+            </Animated.View>
+
+            {/* Label lines */}
             {tab.folderLines.map((line) => (
               <Text
                 key={line}
                 numberOfLines={1}
+                adjustsFontSizeToFit
+                minimumFontScale={0.85}
                 style={[
                   styles.label,
                   selected && styles.labelOpen,
@@ -70,26 +210,43 @@ export function ModeTabs({ active, onChange }: Props) {
           </Pressable>
         );
       })}
-      {activeBox ? (
-        <>
-          <View
-            pointerEvents="none"
-            style={[styles.scoop, { left: TROUGH_PAD + activeBox.x - SCOOP }]}
-          >
-            <View style={[styles.scoopFill, styles.scoopLeft]} />
-          </View>
-          <View
-            pointerEvents="none"
-            style={[styles.scoop, { left: TROUGH_PAD + activeBox.x + activeBox.width }]}
-          >
-            <View style={[styles.scoopFill, styles.scoopRight]} />
-          </View>
-        </>
-      ) : null}
+
+      {/*
+        Shoulder curves — concave quarter-circle connectors that visually join
+        the active tab to the content panel below.
+
+        Technique: each scoop is a SCOOP×SCOOP container (backgroundColor=surface)
+        with an oversized circle (2×SCOOP, backgroundColor=brandSoft) positioned
+        so only one quadrant is visible through the container's overflow:hidden.
+        The brandSoft quarter-circle creates the concave "trough-coloured" curve
+        while the white container area extends the folderSheet upward into the gap.
+
+        They sit at bottom:-SCOOP (below the trough bounds) but remain inside
+        dockInner's bounds (the folderSheet region), so dockInner's
+        overflow:hidden does not clip them.  The trough's zIndex:2 ensures they
+        render above the folderSheet.
+      */}
+      <Animated.View
+        pointerEvents="none"
+        style={[styles.scoop, { left: leftScoopX }]}
+      >
+        <View style={[styles.scoopFill, styles.scoopLeft]} />
+      </Animated.View>
+      <Animated.View
+        pointerEvents="none"
+        style={[styles.scoop, { left: rightScoopX }]}
+      >
+        <View style={[styles.scoopFill, styles.scoopRight]} />
+      </Animated.View>
     </View>
   );
 }
 
+// ─── style constants ──────────────────────────────────────────────────────────
+
+/** Semi-transparent branded background for inactive glyph circles. */
+const INACTIVE_GLYPH_BG = 'rgba(23,107,158,0.08)';
+
 const styles = StyleSheet.create({
   trough: {
     flexDirection: 'row',
@@ -98,68 +255,95 @@ const styles = StyleSheet.create({
     paddingHorizontal: TROUGH_PAD,
     paddingTop: 10,
     gap: 4,
-    overflow: 'visible',
+    overflow: 'visible', // allow scoops to render below the trough boundary
     zIndex: 2,
   },
+
+  // ── folder tabs ─────────────────────────────────────────────────────────────
   folder: {
     flex: 1,
+    minWidth: 0, // prevent overflow on narrow viewports
     alignItems: 'center',
     justifyContent: 'flex-end',
     minHeight: 92,
     paddingHorizontal: 2,
     paddingTop: 10,
-    paddingBottom: 8,
+    paddingBottom: 10,
     borderTopLeftRadius: radius.folder,
     borderTopRightRadius: radius.folder,
   },
   folderClosed: {
-    backgroundColor: 'rgba(93,183,232,0.28)',
+    backgroundColor: 'rgba(23,107,158,0.14)',
+    // Subtle top/side border separates adjacent inactive tabs from each other
+    // and from the trough background without adding visual weight.
+    borderTopWidth: 1,
+    borderLeftWidth: 1,
+    borderRightWidth: 1,
+    borderBottomWidth: 0,
+    borderTopColor: 'rgba(23,107,158,0.10)',
+    borderLeftColor: 'rgba(23,107,158,0.10)',
+    borderRightColor: 'rgba(23,107,158,0.10)',
   },
   folderOpen: {
     backgroundColor: colors.surface,
+    // Subtle elevation to reinforce "raised" metaphor.
+    ...shadow.nav,
   },
+  folderPressed: {
+    opacity: 0.70,
+  },
+
+  // ── glyph icon circle ───────────────────────────────────────────────────────
   glyph: {
-    width: 44,
-    height: 44,
+    width: 46,
+    height: 46,
     borderRadius: 14,
     alignItems: 'center',
     justifyContent: 'center',
-    marginBottom: 4,
+    marginBottom: 5,
   },
+
+  // ── labels ──────────────────────────────────────────────────────────────────
   label: {
     ...type.label,
     fontSize: 10,
     lineHeight: 13,
     textAlign: 'center',
-    color: colors.text,
-    fontWeight: '600',
+    color: colors.textMuted,
+    fontWeight: '500',
   },
   labelOpen: {
     color: colors.brandStrong,
     fontWeight: '700',
+    fontSize: 11,
+    lineHeight: 14,
   },
   labelSos: {
     color: colors.sosAccent,
   },
+
+  // ── shoulder curves ─────────────────────────────────────────────────────────
   scoop: {
     position: 'absolute',
-    bottom: -SCOOP,
+    bottom: -SCOOP,   // positioned below the trough, above the folderSheet
     width: SCOOP,
     height: SCOOP,
     overflow: 'hidden',
-    backgroundColor: colors.surface,
+    backgroundColor: colors.surface, // matches the folderSheet
   },
   scoopFill: {
     position: 'absolute',
     width: SCOOP * 2,
     height: SCOOP * 2,
     borderRadius: SCOOP,
-    backgroundColor: colors.brandSoft,
+    backgroundColor: colors.brandSoft, // matches the trough
   },
+  /** Left scoop: brandSoft circle centred at the top-left corner of the box. */
   scoopLeft: {
     left: -SCOOP,
     top: -SCOOP,
   },
+  /** Right scoop: brandSoft circle centred at the top-right corner of the box. */
   scoopRight: {
     left: 0,
     top: -SCOOP,
diff --git a/packages/ui-tokens/src/radius.ts b/packages/ui-tokens/src/radius.ts
index 1d9bccb3095bfdc52d6364c853d7b6ee70c9b682..59195a0ebb6cf9859a24862622a4e12dae49698c 100644
--- a/packages/ui-tokens/src/radius.ts
+++ b/packages/ui-tokens/src/radius.ts
@@ -7,6 +7,7 @@
   tile: 20,
   sheet: 32,
   folder: 22,
+  folderScoop: 14,
   pill: 999,
 } as const;
 
``````

---

## 5. Replication Instructions for the Receiving Cursor

1. **Verify repository identity.** Confirm that you are operating on a clone of `https://github.com/ananyabusiness17-cmyk/CarAtom.git` and that the working directory is the repository root.

2. **Compare starting state with baseline.** Checkout or verify that the current HEAD is commit `96fb0c4ee500b636c303a58423e9e376ef966ea1` on branch `main`. Run:
   ```bash
   git rev-parse HEAD
   ```
   The output must be `96fb0c4ee500b636c303a58423e9e376ef966ea1`. If it differs, stop and report the mismatch. Do not overwrite unrelated work.

3. **Verify baseline file hashes.** Run:
   ```bash
   shasum -a 256 apps/customer/src/components/home/ModeTabs.tsx packages/ui-tokens/src/radius.ts
   ```
   Expected output:
   ```
   b9a48cd8c51fe2fd9a2aeb3c51b0f79e20c7104aa6f0aaf87aa9beacc8e0604a  apps/customer/src/components/home/ModeTabs.tsx
   9a250d8d5c4ff0ff03ae2d248ca0c3009c72bbec3485f34ed429ab7d81d6c92a  packages/ui-tokens/src/radius.ts
   ```
   If any hash does not match, stop and report the mismatch.

4. **Apply the canonical patch.** Save the contents of Section 4 (Canonical Complete Patch) to a file, e.g. `task.patch`, then apply:
   ```bash
   git apply task.patch
   ```
   If the patch does not apply cleanly, use the exact per-file before-and-after sections in Section 3 to resolve line-offset conflicts manually.

5. **Use per-file sections for conflict resolution.** If `git apply` fails on any hunk, locate the corresponding hunk in Section 3, find the "Code before" block in the target file, and replace it with the "Code after" block. Preserve all paths, filenames, casing, whitespace, modes, and file contents exactly.

6. **Create added files, remove deleted files, perform renames.** This task has no added, deleted, or renamed files. Do not create, delete, or rename any files.

7. **Do not refactor, simplify, improve, reinterpret, or add code.** Reproduce only the changes recorded in this document.

8. **Do not introduce any change absent from this document.**

9. **Verify final file hashes.** After applying all changes, run:
   ```bash
   shasum -a 256 apps/customer/src/components/home/ModeTabs.tsx packages/ui-tokens/src/radius.ts
   ```
   Expected output:
   ```
   53cc7910fcbb65569317d1a795c644044e2f35d2f393984e5d6890e82d5dd42b  apps/customer/src/components/home/ModeTabs.tsx
   d5e5ef3165ec81ecfd97dc470d1ca3ac218b99e8ca9a0b7fef1e8b28f556db38  packages/ui-tokens/src/radius.ts
   ```
   Every hash must match exactly. If any hash does not match, investigate and correct before proceeding.

10. **Verify no additional diff.** Run:
    ```bash
    git diff HEAD
    ```
    The output must contain exactly the two files listed in the inventory and no others. Run:
    ```bash
    git diff HEAD --stat
    ```
    Expected:
    ```
     apps/customer/src/components/home/ModeTabs.tsx | 286 ++++++++++++++++++++-----
     packages/ui-tokens/src/radius.ts               |   1 +
     2 files changed, 236 insertions(+), 51 deletions(-)
    ```

11. **Run post-replication checks.** Execute the following (adapting to the available tooling):
    ```bash
    pnpm --filter @caratom/customer typecheck
    pnpm --filter @caratom/customer lint
    pnpm --filter @caratom/ui-tokens typecheck
    ```

12. **Report results.** Report every applied file, every verification result (hash comparison), every test/lint/typecheck result, and any unresolved conflict.

---

## 6. Verification Record

Verification performed at generation time (`2026-09-03T19:08:00Z`) in a temporary directory with copies of the baseline files, using `patch -p1`.

| Check performed | Result | File count | Details |
|---|---|---|---|
| Every task-related changed path appears in inventory | **Pass** | 2 | `ModeTabs.tsx`, `radius.ts` |
| Every inventory entry has a corresponding per-file section | **Pass** | 2 | Sections 3.1 and 3.2 |
| Every textual change appears in both per-file section and canonical patch | **Pass** | 4 hunks | 3 hunks in ModeTabs.tsx + 1 hunk in radius.ts |
| All untracked task files are included | **Pass** | 0 | No untracked task files |
| No unrelated changes are included | **Pass** | 2 | `git diff --stat HEAD` shows only the 2 task files |
| No content replaced with summaries or placeholders | **Pass** | 2 | Full code in all before/after blocks |
| Canonical patch matches actual source-to-final diff | **Pass** | 2 | Patch generated directly from `git diff --full-index HEAD` |
| Patch applies to clean copy of baseline without errors | **Pass** | 2 | `patch -p1 --dry-run` succeeded; `patch -p1` succeeded |
| Resulting files match current source files | **Pass** | 2 | SHA-256 hashes match after application |
| All final SHA-256 hashes match | **Pass** | 2 | `ModeTabs.tsx`: `53cc7910...` ✓ / `radius.ts`: `d5e5ef31...` ✓ |
| Applying patch produces no additional undocumented diff | **Pass** | 2 | Only the 2 documented files differ from baseline |
| Security: no credentials, private keys, tokens, passwords, or secrets in changed content | **Pass** | 2 | No secrets detected in either file |
