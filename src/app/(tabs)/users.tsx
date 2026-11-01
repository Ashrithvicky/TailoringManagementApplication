import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { GlassCard } from '../../components/GlassCard';
import { MenuButton } from '../../components/MenuButton';
import { Screen } from '../../components/Screen';
import { PAGE_SIZE, deleteClient, listClients } from '../../data/clientsRepo';
import { useDb } from '../../data/DatabaseProvider';
import type { Db } from '../../data/types';
import { useFocusLoad } from '../../hooks/useFocusLoad';
import { formatDate } from '../../domain/date';
import type { ClientStatusFilter, ClientSummary } from '../../domain/types';
import { colors, radius, spacing } from '../../theme';

const SEARCH_DEBOUNCE_MS = 250;
const FILTERS: readonly ClientStatusFilter[] = ['all', 'pending', 'completed'];

const toFilter = (value: unknown): ClientStatusFilter => (FILTERS.includes(value as ClientStatusFilter) ? (value as ClientStatusFilter) : 'all');

export default function UsersScreen() {
  const { t, i18n } = useTranslation();
  const db = useDb();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState<ClientStatusFilter>(toFilter(params.filter));

  useEffect(() => {
    setStatus(toFilter(params.filter));
    setPages(1);
  }, [params.filter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(input);
      setPages(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const loader = useCallback((db: Db) => listClients(db, { query, status, limit: pages * PAGE_SIZE }), [query, status, pages]);
  const { data, reload } = useFocusLoad(loader);
  const clients = data ?? [];

  const removeClient = (client: ClientSummary) =>
    Alert.alert(t('common.confirmDelete'), client.name, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          void deleteClient(db, client.id).then(reload);
        },
      },
    ]);

  const loadMore = () => {
    if (clients.length >= pages * PAGE_SIZE) setPages((p) => p + 1);
  };

  const renderItem = ({ item }: { item: ClientSummary }) => {
    const finished = item.totalDresses > 0 && item.pendingDresses === 0;
    return (
      <Pressable accessibilityRole="button" onPress={() => router.push(`/client/${item.id}`)}>
        <GlassCard style={[styles.row, { borderColor: finished ? colors.success : colors.glassBorder }]}>
          <View style={styles.rowHead}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.rowRight}>
              <View style={[styles.pill, { backgroundColor: finished ? colors.successSoft : colors.warnSoft }]}>
                <Ionicons
                  name={finished ? 'checkmark-circle' : 'time'}
                  size={14}
                  color={finished ? colors.success : colors.warn}
                />
                <Text style={[styles.pillText, { color: finished ? colors.success : colors.warn }]}>
                  {finished
                    ? t('users.allDone')
                    : item.totalDresses === 0
                      ? t('users.noDresses')
                      : t('users.dresses', { pending: item.pendingDresses, total: item.totalDresses })}
                </Text>
              </View>
              <MenuButton
                accessibilityLabel={t('users.clientOptions')}
                items={[{ label: t('users.deleteClient'), onPress: () => removeClient(item), danger: true }]}
              />
            </View>
          </View>
          <Text style={styles.meta}>{[item.phone, item.area].filter(Boolean).join(' · ')}</Text>
          <Text style={styles.date}>{t('users.added', { date: formatDate(item.createdAt, i18n.language) })}</Text>
        </GlassCard>
      </Pressable>
    );
  };

  return (
    <Screen title={t('users.title')} scroll={false}>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={t('users.search')}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t('users.search')}
          autoCorrect={false}
          style={styles.searchInput}
        />
      </View>
      <View style={styles.chips}>
        {FILTERS.map((filter) => (
          <Pressable
            key={filter}
            accessibilityRole="button"
            accessibilityState={{ selected: status === filter }}
            onPress={() => {
              setStatus(filter);
              setPages(1);
            }}
            style={[styles.chip, status === filter && styles.chipOn]}
          >
            <Text style={[styles.chipText, status === filter && styles.chipTextOn]}>{t(`users.filter.${filter}`)}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={clients}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          data ? <Text style={styles.empty}>{query ? t('users.noResults') : t('users.empty')}</Text> : undefined
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.inputBg,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: spacing.md },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  row: { gap: spacing.xs },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { color: colors.text, fontSize: 17, fontWeight: '700', flexShrink: 1 },
  meta: { color: colors.muted, fontSize: 14 },
  date: { color: colors.muted, fontSize: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  pillText: { fontSize: 12, fontWeight: '700' },
  chips: { flexDirection: 'row', gap: spacing.sm },
  chip: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.glassBorder, backgroundColor: colors.inputBg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: colors.text },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
});
