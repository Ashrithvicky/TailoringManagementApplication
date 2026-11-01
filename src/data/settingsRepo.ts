import { EMPTY_PROFILE } from '../domain/profile';
import type { Language, Profile } from '../domain/types';
import type { Db } from './types';

const PROFILE_KEYS = ['shopName', 'ownerName', 'phone'] as const;

export async function getSetting(db: Db, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(db: Db, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

export async function getProfile(db: Db): Promise<Profile> {
  const profile = { ...EMPTY_PROFILE };
  for (const key of PROFILE_KEYS) profile[key] = (await getSetting(db, key)) ?? '';
  return profile;
}

export async function saveProfile(db: Db, profile: Profile): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const key of PROFILE_KEYS) await setSetting(db, key, profile[key]);
  });
}

export async function getLanguage(db: Db): Promise<Language | null> {
  const value = await getSetting(db, 'language');
  return value === 'en' || value === 'ta' ? value : null;
}

export async function saveLanguage(db: Db, language: Language): Promise<void> {
  await setSetting(db, 'language', language);
}
