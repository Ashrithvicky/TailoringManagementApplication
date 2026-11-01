import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { GlassCard } from '../../components/GlassCard';
import { OrderFormFields } from '../../components/OrderFormFields';
import { Screen } from '../../components/Screen';
import { createClientWithOrder } from '../../data/clientsRepo';
import { useDb } from '../../data/DatabaseProvider';
import {
  emptyOrderForm,
  validateClientForm,
  validateOrderForm,
  type ClientFormValues,
  type FieldErrors,
} from '../../domain/validation';
import { colors, spacing } from '../../theme';

const EMPTY_CLIENT: ClientFormValues = { name: '', phone: '', area: '' };

export default function NewClientScreen() {
  const { t } = useTranslation();
  const db = useDb();
  const [client, setClient] = useState(EMPTY_CLIENT);
  const [order, setOrder] = useState(emptyOrderForm());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const err = (key: string) => (errors[key] ? t(errors[key]) : undefined);

  const save = async () => {
    const clientResult = validateClientForm(client);
    const orderResult = validateOrderForm(order);
    setErrors({ ...clientResult.errors, ...orderResult.errors });
    if (!clientResult.value || !orderResult.value) return;

    setSaving(true);
    try {
      const id = await createClientWithOrder(db, clientResult.value, orderResult.value);
      setClient(EMPTY_CLIENT);
      setOrder(emptyOrderForm());
      router.push(`/client/${id}`);
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title={t('newClient.title')}>
      <GlassCard>
        <Text style={styles.section}>{t('newClient.clientSection')}</Text>
        <Field
          label={t('newClient.name')}
          value={client.name}
          onChangeText={(name) => setClient({ ...client, name })}
          maxLength={100}
          error={err('name')}
        />
        <Field
          label={t('newClient.phone')}
          value={client.phone}
          onChangeText={(phone) => setClient({ ...client, phone })}
          keyboardType="phone-pad"
          maxLength={20}
          error={err('phone')}
        />
        <Field
          label={t('newClient.area')}
          value={client.area}
          onChangeText={(area) => setClient({ ...client, area })}
          maxLength={100}
          error={err('area')}
        />
      </GlassCard>

      <OrderFormFields values={order} errors={errors} onChange={setOrder} />
      <Button title={t('newClient.save')} onPress={save} disabled={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { color: colors.accent, fontSize: 16, fontWeight: '700', marginBottom: spacing.md },
});
