import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BillHistory } from '../../components/BillHistory';
import { GlassCard } from '../../components/GlassCard';
import { NewBillForm } from '../../components/NewBillForm';
import { Screen } from '../../components/Screen';
import { getPrices } from '../../data/billingRepo';
import { EMPTY_PRICES } from '../../domain/billing';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { colors, radius, spacing } from '../../theme';

type Tab = 'new' | 'history';

export default function PaymentsScreen() {
  const { t } = useTranslation();
  const { data: prices } = useFocusLoad(getPrices);
  const [tab, setTab] = useState<Tab>('new');

  return (
    <Screen title={t('billing.title')} subtitle={t('billing.subtitle')}>
      <GlassCard>
        <View style={styles.tabs}>
          {(['new', 'history'] as const).map((key) => (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              onPress={() => setTab(key)}
              style={[styles.tab, tab === key && styles.tabOn]}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextOn]}>
                {key === 'new' ? t('billing.newBill') : t('billing.history')}
              </Text>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      {tab === 'new' ? (
        <NewBillForm prices={prices ?? EMPTY_PRICES} onSaved={() => setTab('history')} />
      ) : (
        <BillHistory />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md },
  tabOn: { backgroundColor: colors.accentSoft },
  tabText: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  tabTextOn: { color: colors.accent },
});
