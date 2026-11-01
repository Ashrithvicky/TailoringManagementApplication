import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { colors, radius, spacing } from '../theme';

export interface MenuItem {
  label: string;
  onPress: () => void;
  danger?: boolean;
}

interface Props {
  items: readonly MenuItem[];
  accessibilityLabel: string;
  size?: number;
}

const MENU_WIDTH = 170;

// Three-dot button that opens a small dropdown under itself.
export function MenuButton({ items, accessibilityLabel, size = 22 }: Props) {
  const anchor = useRef<ComponentRef<typeof Pressable>>(null);
  const { width } = useWindowDimensions();
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  const open = () =>
    anchor.current?.measureInWindow((x, y, w, h) =>
      setPos({ top: y + h + spacing.xs, right: Math.max(spacing.sm, width - (x + w)) }),
    );
  const close = () => setPos(null);

  return (
    <>
      <Pressable
        ref={anchor}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={open}
        hitSlop={8}
        style={styles.dots}
      >
        <Ionicons name="ellipsis-vertical" size={size} color={colors.muted} />
      </Pressable>
      <Modal transparent visible={pos !== null} animationType="fade" onRequestClose={close}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close menu" />
        {pos ? (
          <View style={[styles.menu, { top: pos.top, right: pos.right }]}>
            {items.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="menuitem"
                style={styles.item}
                onPress={() => {
                  close();
                  item.onPress();
                }}
              >
                <Text style={[styles.itemText, item.danger && { color: colors.danger }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dots: { padding: spacing.xs },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    backgroundColor: '#0E1334',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    elevation: 8,
    overflow: 'hidden',
  },
  item: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  itemText: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
