import type { LiningExport } from '../domain/types';
import type { Db } from './types';

interface ExportRow {
  id: number;
  order_id: number;
  quantity: number;
  exported_at: string;
}

const toExport = (row: ExportRow): LiningExport => ({
  id: row.id,
  orderId: row.order_id,
  quantity: row.quantity,
  exportedAt: row.exported_at,
});

// Remembers that these quantities were sent out to be bought.
export async function recordLiningExports(
  db: Db,
  entries: readonly { orderId: number; quantity: number }[],
): Promise<void> {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const entry of entries) {
      await db.runAsync(
        'INSERT INTO lining_exports (order_id, quantity, exported_at) VALUES (?, ?, ?)',
        entry.orderId,
        entry.quantity,
        now,
      );
    }
  });
}

export async function listLiningExportsByClient(db: Db, clientId: number): Promise<LiningExport[]> {
  const rows = await db.getAllAsync<ExportRow>(
    `SELECT e.* FROM lining_exports e
       JOIN orders o ON o.id = e.order_id
      WHERE o.client_id = ?
      ORDER BY e.id DESC`,
    clientId,
  );
  return rows.map(toExport);
}
