import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function Select<T extends string>({ label, options, value, onChange }: Props<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={[styles.box, open && styles.boxOpen]}
      >
        <Text style={styles.value}>{current?.label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>
      {open ? (
        <View style={styles.list}>
          {options.map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole="menuitem"
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={[styles.item, option.value === value && styles.itemSelected]}
            >
              <Text style={[styles.itemText, option.value === value && styles.itemTextSelected]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.inputBg,
  },
  boxOpen: { borderColor: colors.accent },
  value: { color: colors.text, fontSize: 16, fontWeight: '600' },
  list: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.inputBg,
    overflow: 'hidden',
  },
  item: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  itemSelected: { backgroundColor: colors.accentSoft },
  itemText: { color: colors.muted, fontSize: 16 },
  itemTextSelected: { color: colors.text, fontWeight: '700' },
});
