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

// ─── component ────────────────────────────────────────────────────────────────

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
  // For a 3-item row the JS-thread cost is negligible.
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
