import { EMPTY_PRICES, PRICE_KEYS, type Bill, type BillLine, type BillRecord, type Prices } from '../domain/billing';
import { getSetting, setSetting } from './settingsRepo';
import type { Db } from './types';

const priceKey = (key: string) => `price.${key}`;

export async function getPrices(db: Db): Promise<Prices> {
  const prices = { ...EMPTY_PRICES };
  for (const key of PRICE_KEYS) {
    const value = Number(await getSetting(db, priceKey(key)));
    prices[key] = Number.isFinite(value) ? value : 0;
  }
  return prices;
}

export async function savePrices(db: Db, prices: Prices): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const key of PRICE_KEYS) await setSetting(db, priceKey(key), String(prices[key]));
  });
}

export type BillOwner = { clientId: number } | { guestName: string; guestPhone: string };

export async function insertBill(db: Db, owner: BillOwner, bill: Bill): Promise<number> {
  const registered = 'clientId' in owner;
  const result = await db.runAsync(
    `INSERT INTO bills (client_id, guest_name, guest_phone, lines, extra, total, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    registered ? owner.clientId : null,
    registered ? null : owner.guestName,
    registered ? null : owner.guestPhone,
    JSON.stringify(bill.lines),
    bill.extra,
    bill.total,
    new Date().toISOString(),
  );
  return result.lastInsertRowId;
}

interface BillRow {
  id: number;
  client_id: number | null;
  guest_name: string | null;
  guest_phone: string | null;
  client_name: string | null;
  client_phone: string | null;
  lines: string;
  extra: number;
  total: number;
  note: string | null;
  created_at: string;
}

function parseLines(json: string): BillLine[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as BillLine[]) : [];
  } catch {
    return [];
  }
}

function toBillRecord(row: BillRow): BillRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.client_name ?? row.guest_name ?? '',
    phone: row.client_phone ?? row.guest_phone ?? '',
    registered: row.client_id !== null,
    lines: parseLines(row.lines),
    extra: row.extra,
    total: row.total,
    note: row.note ?? '',
    createdAt: row.created_at,
  };
}

const BILL_SELECT = `SELECT b.*, c.name AS client_name, c.phone AS client_phone
                       FROM bills b LEFT JOIN clients c ON c.id = b.client_id`;

export const BILL_LIMIT = 100;

export async function listBills(db: Db, options: { clientId?: number; limit?: number } = {}): Promise<BillRecord[]> {
  const { clientId, limit = BILL_LIMIT } = options;
  const where = clientId === undefined ? '' : 'WHERE b.client_id = ?';
  const params = clientId === undefined ? [limit] : [clientId, limit];
  const rows = await db.getAllAsync<BillRow>(
    `${BILL_SELECT} ${where} ORDER BY b.created_at DESC, b.id DESC LIMIT ?`,
    ...params,
  );
  return rows.map(toBillRecord);
}

export async function getBill(db: Db, id: number): Promise<BillRecord | null> {
  const row = await db.getFirstAsync<BillRow>(`${BILL_SELECT} WHERE b.id = ?`, id);
  return row ? toBillRecord(row) : null;
}

export async function updateBillNote(db: Db, id: number, note: string): Promise<void> {
  await db.runAsync('UPDATE bills SET note = ? WHERE id = ?', note.trim() || null, id);
}
