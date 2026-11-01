import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';
import { StarField } from './StarField';

interface Props {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  tabBar?: boolean;
  onBack?: () => void;
  headerRight?: ReactNode;
}

export function Screen({ children, title, subtitle, scroll = true, tabBar = true, onBack, headerRight }: Props) {
  const insets = useSafeAreaInsets();
  // The tab bar already sits above the system navigation area.
  const bottom = tabBar ? spacing.xl : insets.bottom + spacing.xl;

  const header = title ? (
    <View style={styles.header}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.titleRow}>
        <View style={styles.titleText}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {headerRight}
      </View>
    </View>
  ) : null;

  return (
    <LinearGradient colors={colors.gradient} style={styles.root}>
      <StatusBar style="light" />
      <StarField />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingBottom: bottom }]}
          >
            {header}
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, styles.flex, { paddingTop: insets.top + spacing.lg }]}>
            {header}
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  header: { marginBottom: spacing.sm, gap: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  titleText: { flex: 1, gap: spacing.xs },
  title: { color: colors.text, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 14 },
});
