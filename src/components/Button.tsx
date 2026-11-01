import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '../theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
}

export function Button({ title, onPress, variant = 'primary', disabled = false }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, styles[variant], (pressed || disabled) && styles.dim]}
    >
      <Text style={[styles.text, variant === 'primary' && styles.textPrimary, variant === 'danger' && styles.textDanger]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    borderWidth: 1,
  },
  primary: { backgroundColor: colors.accent, borderColor: colors.accent },
  ghost: { backgroundColor: colors.glass, borderColor: colors.glassBorder },
  danger: { backgroundColor: 'transparent', borderColor: colors.danger },
  dim: { opacity: 0.6 },
  text: { color: colors.text, fontSize: 15, fontWeight: '700' },
  textPrimary: { color: colors.onAccent },
  textDanger: { color: colors.danger },
});
