import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '../../../components/Button';
import { BillTile } from '../../../components/BillTile';
import { GlassCard } from '../../../components/GlassCard';
import { MenuButton } from '../../../components/MenuButton';
import { OrderCard } from '../../../components/OrderCard';
import { Screen } from '../../../components/Screen';
import { listBills } from '../../../data/billingRepo';
import { deleteClient, getClient } from '../../../data/clientsRepo';
import { useDb } from '../../../data/DatabaseProvider';
import { listLiningExportsByClient } from '../../../data/liningRepo';
import { deleteOrder, listOrdersByClient, setOrderGiven, setOrderStatus } from '../../../data/ordersRepo';
import type { Db } from '../../../data/types';
import type { Order } from '../../../domain/types';
import { useFocusLoad } from '../../../hooks/useFocusLoad';
import { colors, spacing } from '../../../theme';

export default function ClientDetailScreen() {
  const { t } = useTranslation();
  const db = useDb();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = Number(id);

  const loader = useCallback(
    async (database: Db) => {
      const [client, orders, bills, exports] = await Promise.all([
        getClient(database, clientId),
        listOrdersByClient(database, clientId),
        listBills(database, { clientId }),
        listLiningExportsByClient(database, clientId),
      ]);
      return { client, orders, bills, exports };
    },
    [clientId],
  );
  const { data, reload } = useFocusLoad(loader);

  const confirmDelete = (onConfirm: () => Promise<void>) =>
    Alert.alert(t('common.confirmDelete'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => void onConfirm() },
    ]);

  const toggleStitched = async (order: Order) => {
    await setOrderStatus(db, order.id, order.status === 'completed' ? 'pending' : 'completed');
    await reload();
  };

  const toggleGiven = async (order: Order) => {
    await setOrderGiven(db, order.id, order.givenAt === null);
    await reload();
  };

  const removeOrder = (order: Order) =>
    confirmDelete(async () => {
      await deleteOrder(db, order.id);
      await reload();
    });

  const removeClient = () =>
    confirmDelete(async () => {
      await deleteClient(db, clientId);
      router.back();
    });

  if (!data?.client) return <Screen title={t('common.loading')} tabBar={false} onBack={() => router.back()}>{null}</Screen>;

  const { client, orders, bills, exports } = data;
  return (
    <Screen
      title={client.name}
      subtitle={[client.phone, client.area].filter(Boolean).join(' · ')}
      tabBar={false}
      onBack={() => router.back()}
      headerRight={
        <MenuButton
          accessibilityLabel={t('users.clientOptions')}
          items={[{ label: t('users.deleteClient'), onPress: removeClient, danger: true }]}
        />
      }
    >
      <Button title={t('order.add')} onPress={() => router.push(`/client/${clientId}/add-order`)} />
      <Text style={styles.section}>{t('users.orders')}</Text>
      {orders.length === 0 ? (
        <GlassCard>
          <Text style={styles.empty}>{t('users.noOrders')}</Text>
        </GlassCard>
      ) : (
        orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            liningExports={exports.filter((e) => e.orderId === order.id)}
            onToggleStitched={() => void toggleStitched(order)}
            onToggleGiven={() => void toggleGiven(order)}
            onDelete={() => removeOrder(order)}
          />
        ))
      )}

      <Text style={styles.section}>{t('billing.history')}</Text>
      {bills.length === 0 ? (
        <GlassCard>
          <Text style={styles.empty}>{t('billing.noBills')}</Text>
        </GlassCard>
      ) : (
        bills.map((bill) => <BillTile key={bill.id} bill={bill} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { color: colors.accent, fontSize: 16, fontWeight: '700', marginTop: spacing.sm },
  empty: { color: colors.muted, textAlign: 'center' },
});
