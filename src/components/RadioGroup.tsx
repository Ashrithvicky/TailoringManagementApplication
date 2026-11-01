import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label?: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function RadioGroup<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row} accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <View style={[styles.dot, selected && styles.dotSelected]}>
                {selected ? <View style={styles.dotInner} /> : null}
              </View>
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.inputBg,
  },
  optionSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSelected: { borderColor: colors.accent },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  optionText: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  optionTextSelected: { color: colors.text },
});
