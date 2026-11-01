import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../theme';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  strong?: boolean;
}

export function GlassCard({ children, style, strong = false }: Props) {
  return (
    <View style={[styles.shell, style]}>
      <BlurView intensity={strong ? 45 : 30} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.fill, strong && styles.fillStrong]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  fill: { backgroundColor: colors.glass, padding: spacing.lg, gap: spacing.md },
  fillStrong: { backgroundColor: colors.glassStrong },
});
