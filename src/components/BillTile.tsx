import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatAmount, type BillRecord } from '../domain/billing';
import { formatDate } from '../domain/date';
import { colors, radius, spacing } from '../theme';
import { GlassCard } from './GlassCard';

export function BillTile({ bill }: { bill: BillRecord }) {
  const { t, i18n } = useTranslation();

  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/bill/${bill.id}`)}>
      <GlassCard>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={1}>
            {bill.name}
          </Text>
          {bill.registered ? null : (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('billing.notRegistered')}</Text>
            </View>
          )}
        </View>
        <View style={styles.bottom}>
          <View style={styles.info}>
            <Text style={styles.muted}>{bill.phone}</Text>
            <Text style={styles.muted}>{formatDate(bill.createdAt, i18n.language)}</Text>
          </View>
          <Text style={styles.total}>{formatAmount(bill.total)}</Text>
        </View>
        {bill.note ? (
          <Text style={styles.note} numberOfLines={1}>
            {bill.note}
          </Text>
        ) : null}
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700' },
  badge: { backgroundColor: colors.warnSoft, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  badgeText: { color: colors.warn, fontSize: 12, fontWeight: '700' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  info: { gap: 2 },
  muted: { color: colors.muted, fontSize: 13 },
  total: { color: colors.accent, fontSize: 22, fontWeight: '800' },
  note: { color: colors.muted, fontSize: 13, fontStyle: 'italic' },
});
