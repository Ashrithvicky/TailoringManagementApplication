import type { SQLiteDatabase } from 'expo-sqlite';

export type Db = Pick<SQLiteDatabase, 'getAllAsync' | 'getFirstAsync' | 'runAsync' | 'withTransactionAsync'>;
