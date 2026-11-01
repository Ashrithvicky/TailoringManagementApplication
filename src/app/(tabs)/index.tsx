import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '../../components/GlassCard';
import { Screen } from '../../components/Screen';
import { StatTile } from '../../components/StatTile';
import { getProfile } from '../../data/settingsRepo';
import { getDashboardStats } from '../../data/ordersRepo';
import type { Db } from '../../data/types';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import type { ClientStatusFilter } from '../../domain/types';
import { colors, radius, spacing } from '../../theme';

async function loadDashboard(db: Db) {
  const [stats, profile] = await Promise.all([getDashboardStats(db), getProfile(db)]);
  return { stats, profile };
}

const openUsers = (filter: ClientStatusFilter) => router.navigate({ pathname: '/users', params: { filter } });

function ProgressBar({ percent }: { percent: number }) {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(width, { toValue: percent, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [percent, width]);

  return (
    <View style={styles.track}>
      <Animated.View
        style={[styles.fillBar, { width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]}
      />
    </View>
  );
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { data } = useFocusLoad(loadDashboard);

  const stats = data?.stats;
  const name = data?.profile.shopName || data?.profile.ownerName;
  const clients = stats?.clients ?? 0;
  const done = stats?.clientsCompleted ?? 0;
  const percent = clients ? Math.round((done / clients) * 100) : 0;

  return (
    <Screen title={name ? `${t('dashboard.greeting')}, ${name}` : t('dashboard.greeting')} subtitle={t('dashboard.subtitle')}>
      <View style={styles.row}>
        <StatTile
          size="large"
          icon="checkmark-done-circle"
          color={colors.success}
          label={t('dashboard.completed')}
          hint={t('dashboard.clientsHint')}
          value={done}
          onPress={() => openUsers('completed')}
        />
        <StatTile
          size="large"
          icon="hourglass"
          color={colors.warn}
          label={t('dashboard.pending')}
          hint={t('dashboard.clientsHint')}
          value={stats?.clientsPending ?? 0}
          onPress={() => openUsers('pending')}
        />
      </View>

      <GlassCard strong>
        <Text style={styles.progressText}>{t('dashboard.progress', { done, total: clients })}</Text>
        <ProgressBar percent={percent} />
      </GlassCard>

      <View style={styles.row}>
        <StatTile icon="people" color={colors.violet} label={t('dashboard.clients')} value={clients} onPress={() => openUsers('all')} />
        <StatTile icon="shirt" color={colors.accent} label={t('dashboard.totalDresses')} value={stats?.totalDresses ?? 0} />
        <StatTile icon="cut" color={colors.success} label={t('dashboard.stitchedDresses')} value={stats?.completedDresses ?? 0} />
        <StatTile
          icon="layers"
          color={colors.teal}
          label={t('dashboard.liningPending')}
          value={stats?.liningPendingDresses ?? 0}
          onPress={() => router.navigate('/inventory')}
        />
      </View>

      <GlassCard strong style={styles.logoTile}>
        <Image source={require('../../../assets/icon.png')} style={styles.logo} accessibilityLabel={t('dashboard.logo')} />
      </GlassCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoTile: { alignSelf: 'stretch' },
  logo: { alignSelf: 'center', width: 112, height: 112, borderRadius: radius.lg },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  progressText: { color: colors.text, fontSize: 14 },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.inputBg, overflow: 'hidden' },
  fillBar: { height: 8, borderRadius: radius.pill, backgroundColor: colors.success },
});
