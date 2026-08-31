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
                {line}
              </Text>
            ))}
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
    alignItems: 'flex-end',
    backgroundColor: colors.brandSoft,
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
});
