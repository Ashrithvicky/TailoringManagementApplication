import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '../../components/Button';
import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { useDb } from '../../data/DatabaseProvider';
import { recordLiningExports } from '../../data/liningRepo';
import { getInventorySummary, receiveLining } from '../../data/ordersRepo';
import { buildInventoryText, parseCount } from '../../domain/billing';
import { formatDate } from '../../domain/date';
import type { PendingLiningItem } from '../../domain/types';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { colors, radius, spacing } from '../../theme';

function BoughtLining({ pending, onBought }: { pending: number; onBought: (quantity: number) => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState(String(pending));
  const quantity = parseCount(text);
  const valid = quantity !== null && quantity > 0 && quantity <= pending;

  return (
    <View style={styles.buyRow}>
      <TextInput
        value={text}
        onChangeText={setText}
        keyboardType="number-pad"
        accessibilityLabel={t('inventory.quantity')}
        style={[styles.qty, !valid && styles.qtyInvalid]}
      />
      <View style={styles.buyButton}>
        <Button variant="ghost" title={t('inventory.received')} disabled={!valid} onPress={() => onBought(quantity ?? 0)} />
      </View>
    </View>
  );
}

interface TileProps {
  item: PendingLiningItem;
  selecting: boolean;
  selected: boolean;
  onToggle: () => void;
  onBought: (quantity: number) => void;
}

function LiningTile({ item, selecting, selected, onToggle, onBought }: TileProps) {
  const { t, i18n } = useTranslation();
  const sent = item.exportedAt !== null;

  const body = (
    <GlassCard style={[sent && styles.sentCard, selected && styles.selectedCard]}>
      <View style={styles.head}>
        <Text style={styles.client} onPress={selecting ? undefined : () => router.push(`/client/${item.clientId}`)}>
          {item.clientName}
        </Text>
        {selecting ? (
          <Ionicons
            name={selected ? 'checkbox' : 'square-outline'}
            size={24}
            color={selected ? colors.accent : colors.muted}
          />
        ) : null}
      </View>
      <Text style={styles.line}>
        {item.garmentType === 'saree_blouse' ? t('order.sareeBlouse') : t('order.chudidhar')} ·{' '}
        {t('inventory.pendingFor', {
          pending: item.liningPending,
          given: item.liningGivenCount,
          count: item.count,
        })}
      </Text>
      {sent && item.exportedAt ? (
        <Text style={styles.sentText}>{t('inventory.sentOn', { date: formatDate(item.exportedAt, i18n.language) })}</Text>
      ) : null}
      {selecting ? null : <BoughtLining pending={item.liningPending} onBought={onBought} />}
    </GlassCard>
  );

  return (
    <View style={sent && styles.glow}>
      {selecting ? (
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onToggle}>
          {body}
        </Pressable>
      ) : (
        body
      )}
    </View>
  );
}

export default function InventoryScreen() {
  const { t } = useTranslation();
  const db = useDb();
  const { data, reload } = useFocusLoad(getInventorySummary);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());

  const items = data?.items ?? [];
  const waiting = items.filter((item) => item.exportedAt === null);
  const sent = items.filter((item) => item.exportedAt !== null);
  const chosen = items.filter((item) => selected.has(item.orderId));
  const allSelected = items.length > 0 && chosen.length === items.length;

  const bought = async (orderId: number, quantity: number) => {
    await receiveLining(db, orderId, quantity);
    await reload();
  };

  const toggle = (orderId: number) => {
    const next = new Set(selected);
    if (!next.delete(orderId)) next.add(orderId);
    setSelected(next);
  };

  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const sendInventory = async () => {
    const message = buildInventoryText(
      chosen.map((item) => ({ clientId: item.clientId, clientName: item.clientName, quantity: item.liningPending })),
      t('inventory.nameLabel'),
      t('inventory.countLabel'),
    );
    try {
      const result = await Share.share({ message });
      if (result.action === Share.dismissedAction) return;
      await recordLiningExports(
        db,
        chosen.map((item) => ({ orderId: item.orderId, quantity: item.liningPending })),
      );
      stopSelecting();
      await reload();
    } catch {
      Alert.alert(t('common.error'));
    }
  };

  const renderTile = (item: PendingLiningItem) => (
    <LiningTile
      key={item.orderId}
      item={item}
      selecting={selecting}
      selected={selected.has(item.orderId)}
      onToggle={() => toggle(item.orderId)}
      onBought={(quantity) => void bought(item.orderId, quantity)}
    />
  );

  return (
    <Screen title={t('inventory.title')} subtitle={t('inventory.subtitle')}>
      <GlassCard strong>
        <Text style={styles.label}>{t('inventory.toBuy')}</Text>
        <Text style={styles.big}>{data?.totalLiningPending ?? 0}</Text>
        <View style={styles.split}>
          <Text style={styles.line}>
            {t('inventory.forBlouse')}: {data?.byGarment.saree_blouse ?? 0}
          </Text>
          <Text style={styles.line}>
            {t('inventory.forChudidhar')}: {data?.byGarment.chudidhar ?? 0}
          </Text>
        </View>
      </GlassCard>

      {selecting ? (
        <>
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                variant="ghost"
                title={allSelected ? t('inventory.clearAll') : t('inventory.selectAll')}
                onPress={() => setSelected(allSelected ? new Set() : new Set(items.map((item) => item.orderId)))}
              />
            </View>
            <View style={styles.action}>
              <Button variant="ghost" title={t('common.cancel')} onPress={stopSelecting} />
            </View>
          </View>
          <Button title={t('inventory.send')} onPress={() => void sendInventory()} disabled={chosen.length === 0} />
        </>
      ) : (
        <Button title={t('inventory.export')} onPress={() => setSelecting(true)} disabled={items.length === 0} />
      )}

      <Text style={styles.section}>{t('inventory.pendingList')}</Text>
      {data && items.length === 0 ? (
        <GlassCard>
          <Text style={styles.empty}>{t('inventory.allGood')}</Text>
        </GlassCard>
      ) : null}
      {waiting.map(renderTile)}

      {sent.length > 0 ? (
        <>
          <Text style={styles.section}>{t('inventory.sentList')}</Text>
          {sent.map(renderTile)}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.muted, fontSize: 14 },
  big: { color: colors.teal, fontSize: 52, fontWeight: '800' },
  split: { gap: spacing.xs },
  line: { color: colors.muted, fontSize: 14 },
  section: { color: colors.accent, fontSize: 16, fontWeight: '700', marginTop: spacing.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  client: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '700' },
  empty: { color: colors.muted, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
  sentText: { color: colors.teal, fontSize: 13 },
  // Glow around tiles that were already sent out; the solid backing lets Android draw the shadow.
  glow: {
    borderRadius: radius.lg,
    backgroundColor: colors.barBg,
    shadowColor: colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  sentCard: { borderColor: colors.accent, borderWidth: 1.5 },
  selectedCard: { borderColor: colors.violet, borderWidth: 1.5 },
  buyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  buyButton: { flex: 1 },
  qty: {
    width: 64,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 12,
    paddingVertical: spacing.sm,
  },
  qtyInvalid: { borderColor: colors.danger },
});
