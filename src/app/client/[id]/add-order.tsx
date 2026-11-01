import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { Button } from '../../../components/Button';
import { OrderFormFields } from '../../../components/OrderFormFields';
import { Screen } from '../../../components/Screen';
import { useDb } from '../../../data/DatabaseProvider';
import { insertOrder } from '../../../data/ordersRepo';
import { emptyOrderForm, validateOrderForm, type FieldErrors } from '../../../domain/validation';

export default function AddOrderScreen() {
  const { t } = useTranslation();
  const db = useDb();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState(emptyOrderForm());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const result = validateOrderForm(order);
    setErrors(result.errors);
    if (!result.value) return;

    setSaving(true);
    try {
      await insertOrder(db, Number(id), result.value);
      router.back();
    } catch {
      Alert.alert(t('common.error'));
      setSaving(false);
    }
  };

  return (
    <Screen title={t('order.addTitle')} tabBar={false} onBack={() => router.back()}>
      <OrderFormFields values={order} errors={errors} onChange={setOrder} />
      <Button title={t('newClient.save')} onPress={save} disabled={saving} />
    </Screen>
  );
}
