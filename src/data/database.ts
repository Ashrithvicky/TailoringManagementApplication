import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { defaultDatabaseDirectory, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrate } from './schema';

const DB_NAME = 'ta.db';
const KEY_NAME = 'ta.db.key';
const HEX_KEY_PATTERN = /^[0-9a-f]{64}$/;
// App-private "TA" folder next to the default SQLite folder; other apps cannot read it.
const DB_DIRECTORY = defaultDatabaseDirectory.replace(/SQLite\/?$/, 'TA');

async function getOrCreateKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY_NAME);
  if (existing) {
    if (!HEX_KEY_PATTERN.test(existing)) throw new Error('Stored database key is corrupt');
    return existing;
  }
  const bytes = Crypto.getRandomBytes(32);
  const key = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(KEY_NAME, key, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}

// The key lives in the Android Keystore / iOS Keychain; the DB file is SQLCipher-encrypted.
export async function openSecureDatabase(): Promise<SQLiteDatabase> {
  const key = await getOrCreateKey();
  const db = await openDatabaseAsync(DB_NAME, undefined, DB_DIRECTORY);

  const cipher = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
  if (cipher == null) {
    if (!__DEV__) throw new Error('SQLCipher is not available; refusing to store unencrypted data');
    console.warn('SQLCipher unavailable (Expo Go?): database is NOT encrypted in this dev session');
  } else {
    await db.execAsync(`PRAGMA key = "x'${key}'"`);
  }

  await db.execAsync('PRAGMA foreign_keys = ON');
  await migrate(db);
  return db;
}
