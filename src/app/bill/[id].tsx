import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { getBill, updateBillNote } from '../../data/billingRepo';
import { useDb } from '../../data/DatabaseProvider';
import type { Db } from '../../data/types';
import { formatAmount } from '../../domain/billing';
import { formatDate } from '../../domain/date';
import { localizedBillText } from '../../i18n/billText';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { colors, radius, spacing } from '../../theme';

const NOTE_LIMIT = 500;

export default function BillDetailScreen() {
  const { t, i18n } = useTranslation();
  const db = useDb();
  const { id } = useLocalSearchParams<{ id: string }>();
  const billId = Number(id);
  const loader = useCallback((database: Db) => getBill(database, billId), [billId]);
  const { data: bill, reload } = useFocusLoad(loader);
  // null until edited, so the saved note shows by default.
  const [draft, setDraft] = useState<string | null>(null);

  if (!bill) return <Screen title={t('common.loading')} tabBar={false} onBack={() => router.back()}>{null}</Screen>;

  const note = draft ?? bill.note;
  const changed = note.trim() !== bill.note;

  const saveNote = async () => {
    try {
      await updateBillNote(db, bill.id, note);
      setDraft(null);
      await reload();
      Alert.alert(t('billing.noteSaved'));
    } catch {
      Alert.alert(t('common.error'));
    }
  };

  const send = async () => {
    const message = localizedBillText(t, i18n.language, bill.name, bill.createdAt, bill);
    try {
      await Share.share({ message });
    } catch {
      Alert.alert(t('common.error'));
    }
  };

  return (
    <Screen
      title={bill.name}
      subtitle={[bill.phone, formatDate(bill.createdAt, i18n.language)].filter(Boolean).join(' · ')}
      tabBar={false}
      onBack={() => router.back()}
      headerRight={
        bill.registered ? null : (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('billing.notRegistered')}</Text>
          </View>
        )
      }
    >
      <GlassCard>
        {bill.lines
          .filter((line) => line.count > 0)
          .map((line) => (
            <View key={line.key} style={styles.row}>
              <Text style={styles.rowLabel}>
                {t(`billing.items.${line.key}`)}
                {'\n'}
                <Text style={styles.hint}>
                  {line.count} × {formatAmount(line.price)}
                </Text>
              </Text>
              <Text style={styles.amount}>{formatAmount(line.total)}</Text>
            </View>
          ))}
        {bill.extra > 0 ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('billing.extra')}</Text>
            <Text style={styles.amount}>{formatAmount(bill.extra)}</Text>
          </View>
        ) : null}
      </GlassCard>

      <GlassCard strong>
        <View style={styles.row}>
          <Text style={styles.totalLabel}>{t('billing.total')}</Text>
          <Text style={styles.totalValue}>{formatAmount(bill.total)}</Text>
        </View>
      </GlassCard>

      <GlassCard>
        <Field
          label={t('billing.notes')}
          value={note}
          onChangeText={setDraft}
          multiline
          maxLength={NOTE_LIMIT}
          placeholder={t('billing.notesHint')}
        />
        <Button variant="ghost" title={t('billing.saveNote')} onPress={() => void saveNote()} disabled={!changed} />
      </GlassCard>

      <Button title={t('billing.send')} onPress={() => void send()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  rowLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 13, fontWeight: '400' },
  amount: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  totalLabel: { color: colors.text, fontSize: 18, fontWeight: '700' },
  totalValue: { color: colors.accent, fontSize: 28, fontWeight: '800' },
  badge: { backgroundColor: colors.warnSoft, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  badgeText: { color: colors.warn, fontSize: 12, fontWeight: '700' },
});
