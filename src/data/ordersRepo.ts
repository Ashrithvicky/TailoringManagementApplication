import type {
  DashboardStats,
  GarmentType,
  InventorySummary,
  NewOrderInput,
  Order,
  OrderStatus,
  PendingLiningItem,
} from '../domain/types';
import { toOrder, type OrderRow } from './mappers';
import type { Db } from './types';

export async function insertOrder(db: Db, clientId: number, input: NewOrderInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO orders
       (client_id, garment_type, count, lining_given_count, fall_needed, fall_given, measurements, notes, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    clientId,
    input.garmentType,
    input.count,
    input.liningGivenCount,
    input.fallNeeded ? 1 : 0,
    input.fallGiven ? 1 : 0,
    JSON.stringify(input.measurements),
    input.notes,
    new Date().toISOString(),
  );
  return result.lastInsertRowId;
}

export async function listOrdersByClient(db: Db, clientId: number): Promise<Order[]> {
  const rows = await db.getAllAsync<OrderRow>(
    'SELECT * FROM orders WHERE client_id = ? ORDER BY created_at DESC, id DESC',
    clientId,
  );
  return rows.map(toOrder);
}

export async function setOrderStatus(db: Db, orderId: number, status: OrderStatus): Promise<void> {
  // Un-stitching also clears the hand-over date.
  await db.runAsync(
    `UPDATE orders SET status = ?, completed_at = ?, given_at = CASE WHEN ? = 'completed' THEN given_at ELSE NULL END WHERE id = ?`,
    status,
    status === 'completed' ? new Date().toISOString() : null,
    status,
    orderId,
  );
}

// Handing over implies the dress is stitched.
export async function setOrderGiven(db: Db, orderId: number, given: boolean): Promise<void> {
  const now = new Date().toISOString();
  if (given) {
    await db.runAsync(
      "UPDATE orders SET given_at = ?, status = 'completed', completed_at = COALESCE(completed_at, ?) WHERE id = ?",
      now,
      now,
      orderId,
    );
  } else {
    await db.runAsync('UPDATE orders SET given_at = NULL WHERE id = ?', orderId);
  }
}

export async function deleteOrder(db: Db, orderId: number): Promise<void> {
  await db.runAsync('DELETE FROM orders WHERE id = ?', orderId);
}

// Marks more lining pieces as received, capped at the order's dress count.
export async function receiveLining(db: Db, orderId: number, quantity: number): Promise<void> {
  await db.runAsync(
    'UPDATE orders SET lining_given_count = MIN(count, lining_given_count + ?) WHERE id = ?',
    quantity,
    orderId,
  );
}

interface StatsRow {
  clients: number;
  clients_completed: number;
  clients_pending: number;
  total_dresses: number;
  completed_dresses: number;
  pending_dresses: number;
  lining_pending: number;
}

export async function getDashboardStats(db: Db): Promise<DashboardStats> {
  const row = await db.getFirstAsync<StatsRow>(
    `SELECT (SELECT COUNT(*) FROM clients) AS clients,
            (SELECT COUNT(*) FROM clients c
              WHERE EXISTS (SELECT 1 FROM orders o WHERE o.client_id = c.id)
                AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.client_id = c.id AND o.status = 'pending')) AS clients_completed,
            (SELECT COUNT(DISTINCT client_id) FROM orders WHERE status = 'pending') AS clients_pending,
            COALESCE(SUM(count), 0) AS total_dresses,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN count ELSE 0 END), 0) AS completed_dresses,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN count ELSE 0 END), 0) AS pending_dresses,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN count - lining_given_count ELSE 0 END), 0) AS lining_pending
       FROM orders`,
  );
  return {
    clients: row?.clients ?? 0,
    clientsCompleted: row?.clients_completed ?? 0,
    clientsPending: row?.clients_pending ?? 0,
    totalDresses: row?.total_dresses ?? 0,
    completedDresses: row?.completed_dresses ?? 0,
    pendingDresses: row?.pending_dresses ?? 0,
    liningPendingDresses: row?.lining_pending ?? 0,
  };
}

interface PendingLiningRow {
  order_id: number;
  client_id: number;
  client_name: string;
  garment_type: GarmentType;
  count: number;
  lining_given_count: number;
  last_export_qty: number | null;
  last_export_at: string | null;
}

export async function getInventorySummary(db: Db): Promise<InventorySummary> {
  const rows = await db.getAllAsync<PendingLiningRow>(
    `SELECT o.id AS order_id, c.id AS client_id, c.name AS client_name,
            o.garment_type, o.count, o.lining_given_count,
            (SELECT e.quantity FROM lining_exports e WHERE e.order_id = o.id ORDER BY e.id DESC LIMIT 1) AS last_export_qty,
            (SELECT e.exported_at FROM lining_exports e WHERE e.order_id = o.id ORDER BY e.id DESC LIMIT 1) AS last_export_at
       FROM orders o
       JOIN clients c ON c.id = o.client_id
      WHERE o.status = 'pending' AND o.lining_given_count < o.count
      ORDER BY c.name COLLATE NOCASE ASC, o.id ASC`,
  );

  const byGarment: Record<GarmentType, number> = { saree_blouse: 0, chudidhar: 0 };
  let totalLiningPending = 0;
  const items: PendingLiningItem[] = rows.map((row) => {
    const liningPending = row.count - row.lining_given_count;
    byGarment[row.garment_type] += liningPending;
    totalLiningPending += liningPending;
    return {
      orderId: row.order_id,
      clientId: row.client_id,
      clientName: row.client_name,
      garmentType: row.garment_type,
      count: row.count,
      liningGivenCount: row.lining_given_count,
      liningPending,
      exportedAt:
        row.last_export_qty !== null && row.last_export_qty >= liningPending ? row.last_export_at : null,
    };
  });

  return { totalLiningPending, byGarment, items };
}
