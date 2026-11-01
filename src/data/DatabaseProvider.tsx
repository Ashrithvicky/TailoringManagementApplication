import type { SQLiteDatabase } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { setLanguage } from '../i18n';
import { colors, spacing } from '../theme';
import { openSecureDatabase } from './database';
import { getLanguage } from './settingsRepo';

const DatabaseContext = createContext<SQLiteDatabase | null>(null);

export function useDb(): SQLiteDatabase {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error('useDb must be used inside DatabaseProvider');
  return db;
}

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    (async () => {
      try {
        const opened = await openSecureDatabase();
        const saved = await getLanguage(opened);
        if (saved) await setLanguage(saved);
        if (!cancelled) setDb(opened);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (db) return <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>;

  return (
    <View style={styles.center}>
      {failed ? (
        <>
          <Text style={styles.text}>{t('common.dbError')}</Text>
          <Button title={t('common.retry')} onPress={retry} />
        </>
      ) : (
        <ActivityIndicator color={colors.accent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, backgroundColor: colors.gradient[0] },
  text: { color: colors.text, fontSize: 16 },
});
