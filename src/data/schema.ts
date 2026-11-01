import type { SQLiteDatabase } from 'expo-sqlite';

// Each entry upgrades the schema by one version; never edit a released entry.
export const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    area TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_clients_name ON clients(name COLLATE NOCASE);
  CREATE INDEX idx_clients_phone ON clients(phone);

  CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    garment_type TEXT NOT NULL CHECK (garment_type IN ('saree_blouse', 'chudidhar')),
    count INTEGER NOT NULL CHECK (count > 0),
    lining_given_count INTEGER NOT NULL DEFAULT 0
      CHECK (lining_given_count >= 0 AND lining_given_count <= count),
    measurements TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TEXT NOT NULL,
    completed_at TEXT
  );
  CREATE INDEX idx_orders_client ON orders(client_id);
  CREATE INDEX idx_orders_status ON orders(status);

  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  `
  ALTER TABLE orders ADD COLUMN fall_needed INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE orders ADD COLUMN fall_given INTEGER NOT NULL DEFAULT 0;
  `,
  `
  ALTER TABLE orders ADD COLUMN given_at TEXT;

  CREATE TABLE bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    lines TEXT NOT NULL,
    extra REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_bills_client ON bills(client_id);
  `,
  `
  CREATE TABLE bills_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    guest_name TEXT,
    guest_phone TEXT,
    lines TEXT NOT NULL,
    extra REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL
  );
  INSERT INTO bills_v2 (id, client_id, lines, extra, total, created_at)
    SELECT id, client_id, lines, extra, total, created_at FROM bills;
  DROP TABLE bills;
  ALTER TABLE bills_v2 RENAME TO bills;
  CREATE INDEX idx_bills_client ON bills(client_id);
  CREATE INDEX idx_bills_created ON bills(created_at);

  CREATE TABLE lining_exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    exported_at TEXT NOT NULL
  );
  CREATE INDEX idx_lining_exports_order ON lining_exports(order_id);
  `,
];

export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
