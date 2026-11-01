import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { insertBill } from '../data/billingRepo';
import { listClients } from '../data/clientsRepo';
import { useDb } from '../data/DatabaseProvider';
import { listOrdersByClient } from '../data/ordersRepo';
import {
  EMPTY_PRICES,
  PRICE_KEYS,
  computeBill,
  formatAmount,
  parseAmount,
  parseCount,
  suggestCounts,
  type Counts,
  type PriceKey,
  type Prices,
} from '../domain/billing';
import type { ClientSummary } from '../domain/types';
import { validateClientForm } from '../domain/validation';
import { localizedBillText } from '../i18n/billText';
import { colors, radius, spacing } from '../theme';
import { Button } from './Button';
import { Field } from './Field';
import { GlassCard } from './GlassCard';

const RESULT_LIMIT = 20;
const SEARCH_DELAY_MS = 250;

interface Props {
  prices: Prices;
  onSaved: () => void;
}

export function NewBillForm({ prices, onSaved }: Props) {
  const { t, i18n } = useTranslation();
  const db = useDb();
  const [client, setClient] = useState<ClientSummary | null>(null);
  const [guest, setGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ClientSummary[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState('');
  const clientId = client?.id;

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void listClients(db, { query: search, limit: RESULT_LIMIT }).then((rows) => {
        if (active) setResults(rows);
      });
    }, SEARCH_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [db, search]);

  useEffect(() => {
    if (clientId === undefined) return;
    void listOrdersByClient(db, clientId).then((orders) => {
      const suggested = suggestCounts(orders);
      setCounts(Object.fromEntries(PRICE_KEYS.map((key) => [key, suggested[key] ? String(suggested[key]) : ''])));
      setExtra('');
    });
  }, [db, clientId]);

  const clearAmounts = () => {
    setCounts({});
    setExtra('');
  };

  const pickClient = (picked: ClientSummary) => {
    setGuest(false);
    setClient(picked);
  };

  const startGuest = () => {
    setClient(null);
    clearAmounts();
    setGuest(true);
  };

  const resetPayer = () => {
    setClient(null);
    setGuest(false);
    setGuestName('');
    setGuestPhone('');
    clearAmounts();
  };

  const guestForm = validateClientForm({ name: guestName, phone: guestPhone, area: '' });
  const parsedCounts = PRICE_KEYS.map((key) => parseCount(counts[key] ?? ''));
  const parsedExtra = parseAmount(extra);
  const amountsValid = parsedCounts.every((c) => c !== null) && parsedExtra !== null;
  const payerReady = client !== null || (guest && guestForm.value !== null);
  const ready = amountsValid && payerReady;

  const bill = useMemo(() => {
    const numeric = { ...EMPTY_PRICES } as Counts;
    PRICE_KEYS.forEach((key, i) => {
      numeric[key] = parsedCounts[i] ?? 0;
    });
    return computeBill(prices, numeric, parsedExtra ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices, counts, extra]);

  const labelOf = (key: PriceKey) => t(`billing.items.${key}`);
  const payerName = client?.name ?? guestForm.value?.name ?? '';

  const save = async () => {
    if (!ready) return;
    try {
      const owner = client
        ? { clientId: client.id }
        : { guestName: guestForm.value?.name ?? '', guestPhone: guestForm.value?.phone ?? '' };
      await insertBill(db, owner, bill);
      Alert.alert(t('billing.saved'));
      resetPayer();
      onSaved();
    } catch {
      Alert.alert(t('common.error'));
    }
  };

  const send = async () => {
    if (!ready) return;
    const message = localizedBillText(t, i18n.language, payerName, new Date().toISOString(), bill);
    try {
      await Share.share({ message });
    } catch {
      Alert.alert(t('common.error'));
    }
  };

  return (
    <>
      <GlassCard>
        <Text style={styles.label}>{t('billing.client')}</Text>
        {client ? (
          <View style={styles.selected}>
            <Text style={styles.selectedName}>
              {client.name} · {client.phone}
            </Text>
            <Pressable accessibilityRole="button" onPress={resetPayer}>
              <Text style={styles.change}>{t('billing.change')}</Text>
            </Pressable>
          </View>
        ) : guest ? (
          <>
            <View style={styles.selected}>
              <Text style={styles.selectedName}>{t('billing.notRegistered')}</Text>
              <Pressable accessibilityRole="button" onPress={resetPayer}>
                <Text style={styles.change}>{t('billing.change')}</Text>
              </Pressable>
            </View>
            <Field label={t('billing.guestName')} value={guestName} onChangeText={setGuestName} maxLength={100} />
            <Field
              label={t('billing.guestPhone')}
              value={guestPhone}
              onChangeText={setGuestPhone}
              keyboardType="phone-pad"
              maxLength={20}
              error={guestPhone && guestForm.errors.phone ? t(guestForm.errors.phone) : undefined}
            />
          </>
        ) : (
          <>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('billing.search')}
              placeholderTextColor={colors.muted}
              accessibilityLabel={t('billing.search')}
              autoCorrect={false}
              style={styles.search}
            />
            {results.length === 0 ? <Text style={styles.hint}>{t('billing.noClients')}</Text> : null}
            {results.map((c) => (
              <Pressable key={c.id} accessibilityRole="button" onPress={() => pickClient(c)} style={styles.result}>
                <Text style={styles.resultName}>{c.name}</Text>
                <Text style={styles.hint}>{c.phone}</Text>
              </Pressable>
            ))}
            <Button variant="ghost" title={`+ ${t('billing.addGuest')}`} onPress={startGuest} />
          </>
        )}
      </GlassCard>

      {payerReady ? (
        <>
          <GlassCard>
            {PRICE_KEYS.map((key, i) => (
              <View key={key} style={styles.row}>
                <View style={styles.rowLabel}>
                  <Text style={styles.itemLabel}>{labelOf(key)}</Text>
                  <Text style={styles.hint}>× {formatAmount(prices[key])}</Text>
                </View>
                <TextInput
                  value={counts[key] ?? ''}
                  onChangeText={(text) => setCounts({ ...counts, [key]: text })}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                  accessibilityLabel={labelOf(key)}
                  style={[styles.count, parsedCounts[i] === null && styles.invalid]}
                />
                <Text style={styles.lineTotal}>{formatAmount(bill.lines[i].total)}</Text>
              </View>
            ))}
          </GlassCard>

          <GlassCard>
            <Field
              label={t('billing.extraAmount')}
              value={extra}
              onChangeText={setExtra}
              keyboardType="decimal-pad"
              maxLength={9}
              placeholder="0"
              error={parsedExtra === null ? t('errors.invalidNumber') : undefined}
            />
          </GlassCard>

          <GlassCard strong>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('billing.total')}</Text>
              <Text style={styles.totalValue}>{formatAmount(bill.total)}</Text>
            </View>
          </GlassCard>

          <View style={styles.actions}>
            <View style={styles.action}>
              <Button title={t('billing.save')} onPress={() => void save()} disabled={!ready} />
            </View>
            <View style={styles.action}>
              <Button variant="ghost" title={t('billing.send')} onPress={() => void send()} disabled={!ready} />
            </View>
          </View>
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  itemLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 12 },
  search: {
    backgroundColor: colors.inputBg,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  result: { paddingVertical: spacing.sm, borderBottomColor: colors.glassBorder, borderBottomWidth: StyleSheet.hairlineWidth },
  resultName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  selected: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  selectedName: { flex: 1, color: colors.accent, fontSize: 16, fontWeight: '700' },
  change: { color: colors.teal, fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowLabel: { flex: 1, gap: 2 },
  count: {
    width: 64,
    textAlign: 'center',
    backgroundColor: colors.inputBg,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
  invalid: { borderColor: colors.danger },
  lineTotal: { width: 80, textAlign: 'right', color: colors.accent, fontSize: 16, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: colors.text, fontSize: 18, fontWeight: '700' },
  totalValue: { color: colors.accent, fontSize: 28, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
});
