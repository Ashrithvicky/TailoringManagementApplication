import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LiningExport, Order } from '../domain/types';
import { formatDate } from '../domain/date';
import { colors, radius, spacing } from '../theme';
import { GlassCard } from './GlassCard';
import { MenuButton } from './MenuButton';

interface Props {
  order: Order;
  liningExports?: readonly LiningExport[];
  onToggleStitched: () => void;
  onToggleGiven: () => void;
  onDelete: () => void;
}

interface StageProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function StageButton({ label, active, onPress }: StageProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.stage, active && styles.stageOn, pressed && styles.pressed]}
    >
      <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={active ? colors.success : colors.muted} />
      <Text style={[styles.stageText, active && { color: colors.success }]}>{label}</Text>
    </Pressable>
  );
}

export function OrderCard({ order, liningExports = [], onToggleStitched, onToggleGiven, onDelete }: Props) {
  const { t, i18n } = useTranslation();
  const completed = order.status === 'completed';
  const given = order.givenAt !== null;
  const garment = order.garmentType === 'saree_blouse' ? t('order.sareeBlouse') : t('order.chudidhar');

  return (
    <GlassCard>
      <View style={styles.head}>
        <Text style={styles.title}>
          {garment} × {order.count}
        </Text>
        <View style={styles.headRight}>
          <Text style={styles.date}>{formatDate(order.createdAt, i18n.language)}</Text>
          <MenuButton
            accessibilityLabel={t('order.options')}
            size={18}
            items={[{ label: t('order.delete'), onPress: onDelete, danger: true }]}
          />
        </View>
      </View>
      <View style={[styles.badge, completed ? styles.badgeDone : styles.badgePending]}>
        <Text style={[styles.badgeText, { color: completed ? colors.success : colors.warn }]}>
          {completed ? t('order.completed') : t('order.pending')}
        </Text>
      </View>

      {Object.entries(order.measurements).map(([section, size]) => (
        <Text key={section} style={styles.line}>
          {t(`order.${section}`)}: {size.length} × {size.breadth} in
          {size.handLength !== undefined && size.handBreadth !== undefined
            ? `  ·  ${t('order.hand')}: ${size.handLength} × ${size.handBreadth} in`
            : ''}
        </Text>
      ))}
      {order.garmentType === 'saree_blouse' ? (
        <Text style={styles.line}>
          {t('order.fallStatus', {
            needed: order.fallNeeded ? t('order.yes') : t('order.no'),
            given: order.fallGiven ? t('order.yes') : t('order.no'),
          })}
        </Text>
      ) : null}
      <Text style={styles.line}>
        {t('order.liningStatus', { given: order.liningGivenCount, count: order.count })}
      </Text>
      {liningExports.map((entry) => (
        <Text key={entry.id} style={styles.exportLine}>
          {t('order.liningSent', { count: entry.quantity, date: formatDate(entry.exportedAt, i18n.language) })}
        </Text>
      ))}
      {order.notes ? <Text style={styles.notes}>{order.notes}</Text> : null}

      <View style={styles.actions}>
        <StageButton label={t('order.stitched')} active={completed} onPress={onToggleStitched} />
        <StageButton label={t('order.given')} active={given} onPress={onToggleGiven} />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  exportLine: { color: colors.teal, fontSize: 13 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { color: colors.text, fontSize: 17, fontWeight: '700', flexShrink: 1 },
  date: { color: colors.text, fontSize: 14, fontWeight: '600' },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  badgeDone: { backgroundColor: colors.successSoft },
  badgePending: { backgroundColor: colors.warnSoft },
  badgeText: { fontSize: 12, fontWeight: '700' },
  line: { color: colors.muted, fontSize: 14 },
  notes: { color: colors.text, fontSize: 14, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  stage: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
  },
  stageOn: { borderColor: colors.success, backgroundColor: colors.successSoft },
  stageText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
