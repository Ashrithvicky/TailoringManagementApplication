import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { listBills } from '../data/billingRepo';
import { useFocusLoad } from '../hooks/useFocusLoad';
import { colors } from '../theme';
import { BillTile } from './BillTile';
import { GlassCard } from './GlassCard';

export function BillHistory() {
  const { t } = useTranslation();
  const { data } = useFocusLoad(listBills);

  if (data && data.length === 0) {
    return (
      <GlassCard>
        <Text style={styles.empty}>{t('billing.noBills')}</Text>
      </GlassCard>
    );
  }
  return <>{data?.map((bill) => <BillTile key={bill.id} bill={bill} />)}</>;
}

const styles = StyleSheet.create({
  empty: { color: colors.muted, textAlign: 'center' },
});
