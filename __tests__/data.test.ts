import { createClientWithOrder, escapeLike, getClient, listClients } from '../src/data/clientsRepo';
import { parseMeasurements, toOrder } from '../src/data/mappers';
import { getDashboardStats, getInventorySummary, receiveLining, setOrderStatus } from '../src/data/ordersRepo';
import { MIGRATIONS, migrate } from '../src/data/schema';
import { getLanguage, getProfile, saveLanguage, saveProfile } from '../src/data/settingsRepo';
import type { Db } from '../src/data/types';

function makeDb(overrides: Partial<Record<keyof Db, jest.Mock>> = {}) {
  return {
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 7, changes: 1 }),
    withTransactionAsync: jest.fn(async (task: () => Promise<void>) => task()),
    ...overrides,
  } as unknown as jest.Mocked<Db>;
}

const order = {
  garmentType: 'saree_blouse' as const,
  count: 3,
  liningGivenCount: 1,
  fallNeeded: true,
  fallGiven: false,
  measurements: { blouse: { length: 14, breadth: 16, handLength: 8, handBreadth: 9 } },
  notes: null,
};

describe('mappers', () => {
  it('parses measurements defensively', () => {
    expect(parseMeasurements('{"top":{"length":1,"breadth":2}}')).toEqual({ top: { length: 1, breadth: 2 } });
    expect(parseMeasurements('not json')).toEqual({});
    expect(parseMeasurements('5')).toEqual({});
  });

  it('maps order rows', () => {
    const mapped = toOrder({
      id: 1,
      client_id: 2,
      garment_type: 'chudidhar',
      count: 2,
      lining_given_count: 1,
      fall_needed: 1,
      fall_given: 0,
      measurements: '{}',
      notes: 'n',
      status: 'pending',
      created_at: 'c',
      completed_at: null,
      given_at: null,
    });
    expect(mapped).toMatchObject({ id: 1, clientId: 2, liningGivenCount: 1, status: 'pending', fallNeeded: true, fallGiven: false });
  });
});

describe('clientsRepo', () => {
  it('escapes LIKE wildcards', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });

  it('creates a client and its first order in one transaction', async () => {
    const db = makeDb();
    const id = await createClientWithOrder(db, { name: 'A', phone: '9876543210', area: null }, order);
    expect(id).toBe(7);
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledTimes(2);
    expect(db.runAsync.mock.calls[1][0]).toContain('INSERT INTO orders');
    expect(db.runAsync.mock.calls[1]).toContain(JSON.stringify(order.measurements));
  });

  it('lists all clients ordered ascending without a filter', async () => {
    const db = makeDb();
    await listClients(db);
    const [sql, ...params] = db.getAllAsync.mock.calls[0];
    expect(sql).not.toContain('WHERE');
    expect(sql).toContain('ORDER BY c.name COLLATE NOCASE ASC');
    expect(params).toEqual([50, 0]);
  });

  it('searches by name or digits-only phone using bound parameters', async () => {
    const db = makeDb();
    await listClients(db, { query: ' 98-76 ' });
    const [sql, ...params] = db.getAllAsync.mock.calls[0];
    expect(sql).toContain('WHERE c.name LIKE ?');
    expect(params.slice(0, 2)).toEqual(['%98-76%', '%9876%']);
  });

  it('searches names with the raw text when there are no digits', async () => {
    const db = makeDb();
    await listClients(db, { query: 'ravi' });
    expect(db.getAllAsync.mock.calls[0].slice(1, 3)).toEqual(['%ravi%', '%ravi%']);
  });

  it('maps summary rows', async () => {
    const db = makeDb({
      getAllAsync: jest.fn().mockResolvedValue([
        { id: 1, name: 'A', phone: '1', area: null, created_at: 'x', total_dresses: 10, pending_dresses: 2 },
      ]),
    });
    expect(await listClients(db)).toEqual([
      { id: 1, name: 'A', phone: '1', area: null, createdAt: 'x', totalDresses: 10, pendingDresses: 2 },
    ]);
  });

  it('filters clients by completion status with HAVING', async () => {
    const db = makeDb();
    await listClients(db, { status: 'pending' });
    await listClients(db, { status: 'completed' });
    expect(db.getAllAsync.mock.calls[0][0]).toContain("HAVING COALESCE(SUM(CASE WHEN o.status = 'pending'");
    expect(db.getAllAsync.mock.calls[1][0]).toContain('SUM(o.count), 0) > 0');
  });

  it('returns null for a missing client', async () => {
    expect(await getClient(makeDb(), 99)).toBeNull();
  });
});

describe('ordersRepo', () => {
  it('maps dashboard stats and defaults to zero', async () => {
    expect(await getDashboardStats(makeDb())).toEqual({
      clients: 0,
      clientsCompleted: 0,
      clientsPending: 0,
      totalDresses: 0,
      completedDresses: 0,
      pendingDresses: 0,
      liningPendingDresses: 0,
    });

    const db = makeDb({
      getFirstAsync: jest.fn().mockResolvedValue({
        clients: 10,
        clients_completed: 8,
        clients_pending: 2,
        total_dresses: 10,
        completed_dresses: 8,
        pending_dresses: 2,
        lining_pending: 1,
      }),
    });
    expect(await getDashboardStats(db)).toEqual({
      clients: 10,
      clientsCompleted: 8,
      clientsPending: 2,
      totalDresses: 10,
      completedDresses: 8,
      pendingDresses: 2,
      liningPendingDresses: 1,
    });
  });

  it('summarises lining still to buy', async () => {
    const db = makeDb({
      getAllAsync: jest.fn().mockResolvedValue([
        { order_id: 1, client_id: 1, client_name: 'A', garment_type: 'saree_blouse', count: 3, lining_given_count: 1 },
        { order_id: 2, client_id: 2, client_name: 'B', garment_type: 'chudidhar', count: 2, lining_given_count: 0 },
      ]),
    });
    const summary = await getInventorySummary(db);
    expect(summary.totalLiningPending).toBe(4);
    expect(summary.byGarment).toEqual({ saree_blouse: 2, chudidhar: 2 });
    expect(summary.items[0]).toMatchObject({ orderId: 1, liningPending: 2 });
  });

  it('stamps completion time only when completing', async () => {
    const db = makeDb();
    await setOrderStatus(db, 5, 'completed');
    await setOrderStatus(db, 5, 'pending');
    expect(typeof db.runAsync.mock.calls[0][2]).toBe('string');
    expect(db.runAsync.mock.calls[1][2]).toBeNull();
  });

  it('caps received lining in SQL', async () => {
    const db = makeDb();
    await receiveLining(db, 4, 1);
    expect(db.runAsync).toHaveBeenCalledWith(expect.stringContaining('MIN(count'), 1, 4);
  });
});

describe('settingsRepo', () => {
  it('reads and saves the profile', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue({ value: 'x' }) });
    expect(await getProfile(db)).toEqual({ shopName: 'x', ownerName: 'x', phone: 'x' });

    await saveProfile(db, { shopName: 'a', ownerName: 'b', phone: 'c' });
    expect(db.runAsync).toHaveBeenCalledTimes(3);
  });

  it('only accepts supported languages', async () => {
    expect(await getLanguage(makeDb({ getFirstAsync: jest.fn().mockResolvedValue({ value: 'ta' }) }))).toBe('ta');
    expect(await getLanguage(makeDb({ getFirstAsync: jest.fn().mockResolvedValue({ value: 'fr' }) }))).toBeNull();

    const db = makeDb();
    await saveLanguage(db, 'en');
    expect(db.runAsync).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO settings'), 'language', 'en');
  });
});

describe('migrate', () => {
  const makeSqlite = (userVersion: number) => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValue({ user_version: userVersion }) });
    return Object.assign(db, { execAsync: jest.fn().mockResolvedValue(undefined) });
  };

  it('applies pending migrations and bumps user_version', async () => {
    const db = makeSqlite(0);
    await migrate(db as never);
    expect(db.execAsync).toHaveBeenCalledWith(MIGRATIONS[0]);
    expect(db.execAsync).toHaveBeenCalledWith(MIGRATIONS[1]);
    expect(db.execAsync).toHaveBeenCalledWith(`PRAGMA user_version = ${MIGRATIONS.length}`);
  });

  it('does nothing when already current', async () => {
    const db = makeSqlite(MIGRATIONS.length);
    await migrate(db as never);
    expect(db.execAsync).not.toHaveBeenCalled();
  });
});
