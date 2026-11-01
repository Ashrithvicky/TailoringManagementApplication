import type { Client, ClientInput, ClientStatusFilter, ClientSummary, NewOrderInput } from '../domain/types';
import { toClient, toClientSummary, type ClientRow, type ClientSummaryRow } from './mappers';
import { insertOrder } from './ordersRepo';
import type { Db } from './types';

export const PAGE_SIZE = 50;

const HAVING: Record<ClientStatusFilter, string> = {
  all: '',
  pending: "HAVING COALESCE(SUM(CASE WHEN o.status = 'pending' THEN o.count ELSE 0 END), 0) > 0",
  completed:
    "HAVING COALESCE(SUM(o.count), 0) > 0 AND COALESCE(SUM(CASE WHEN o.status = 'pending' THEN o.count ELSE 0 END), 0) = 0",
};

export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

async function insertClient(db: Db, input: ClientInput): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO clients (name, phone, area, created_at) VALUES (?, ?, ?, ?)',
    input.name,
    input.phone,
    input.area,
    new Date().toISOString(),
  );
  return result.lastInsertRowId;
}

export async function createClientWithOrder(
  db: Db,
  client: ClientInput,
  order: NewOrderInput,
): Promise<number> {
  let clientId = 0;
  await db.withTransactionAsync(async () => {
    clientId = await insertClient(db, client);
    await insertOrder(db, clientId, order);
  });
  return clientId;
}

export async function getClient(db: Db, id: number): Promise<Client | null> {
  const row = await db.getFirstAsync<ClientRow>('SELECT * FROM clients WHERE id = ?', id);
  return row ? toClient(row) : null;
}

export async function listClients(
  db: Db,
  options: { query?: string; offset?: number; limit?: number; status?: ClientStatusFilter } = {},
): Promise<ClientSummary[]> {
  const { query = '', offset = 0, limit = PAGE_SIZE, status = 'all' } = options;
  const text = query.trim();
  const params: (string | number)[] = [];
  let where = '';

  if (text) {
    const digits = text.replace(/\D/g, '');
    where = "WHERE c.name LIKE ? ESCAPE '\\' OR c.phone LIKE ? ESCAPE '\\'";
    params.push(`%${escapeLike(text)}%`, `%${escapeLike(digits || text)}%`);
  }

  const rows = await db.getAllAsync<ClientSummaryRow>(
    `SELECT c.*,
            COALESCE(SUM(o.count), 0) AS total_dresses,
            COALESCE(SUM(CASE WHEN o.status = 'pending' THEN o.count ELSE 0 END), 0) AS pending_dresses
       FROM clients c
       LEFT JOIN orders o ON o.client_id = c.id
       ${where}
      GROUP BY c.id
      ${HAVING[status]}
      ORDER BY c.name COLLATE NOCASE ASC, c.id ASC
      LIMIT ? OFFSET ?`,
    ...params,
    limit,
    offset,
  );
  return rows.map(toClientSummary);
}

export async function deleteClient(db: Db, id: number): Promise<void> {
  await db.runAsync('DELETE FROM clients WHERE id = ?', id);
}
