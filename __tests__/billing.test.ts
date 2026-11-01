import { getBill, getPrices, insertBill, listBills, savePrices, updateBillNote } from '../src/data/billingRepo';
import { listLiningExportsByClient, recordLiningExports } from '../src/data/liningRepo';
import { getInventorySummary, setOrderGiven } from '../src/data/ordersRepo';
import type { Db } from '../src/data/types';
import {
  EMPTY_PRICES,
  buildBillText,
  buildInventoryText,
  computeBill,
  formatAmount,
  groupInventoryRequests,
  parseAmount,
  parseCount,
  suggestCounts,
} from '../src/domain/billing';
import type { Order } from '../src/domain/types';

function makeDb(overrides: Partial<Record<keyof Db, jest.Mock>> = {}) {
  return {
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 9, changes: 1 }),
    withTransactionAsync: jest.fn(async (task: () => Promise<void>) => task()),
    ...overrides,
  } as unknown as jest.Mocked<Db>;
}

const base: Order = {
  id: 1,
  clientId: 1,
  garmentType: 'saree_blouse',
  count: 5,
  liningGivenCount: 2,
  fallNeeded: true,
  fallGiven: false,
  measurements: {},
  notes: null,
  status: 'pending',
  createdAt: 'c',
  completedAt: null,
  givenAt: null,
};

describe('amount parsing', () => {
  it('accepts blank, integers and up to 2 decimals', () => {
    expect(parseAmount('')).toBe(0);
    expect(parseAmount(' 250 ')).toBe(250);
    expect(parseAmount('12.5')).toBe(12.5);
  });

  it('rejects negatives, text, 3 decimals and huge values', () => {
    for (const bad of ['-1', 'abc', '1.234', '1e3', '1000001']) expect(parseAmount(bad)).toBeNull();
  });

  it('parses counts', () => {
    expect(parseCount('')).toBe(0);
    expect(parseCount('12')).toBe(12);
    expect(parseCount('1.5')).toBeNull();
    expect(parseCount('12345')).toBeNull();
  });

  it('formats whole and fractional amounts', () => {
    expect(formatAmount(150)).toBe('150');
    expect(formatAmount(12.5)).toBe('12.50');
  });
});

describe('bill maths', () => {
  const prices = { ...EMPTY_PRICES, fall: 30, blouse: 250, blouseLining: 350 };

  it('multiplies counts by prices and adds extras', () => {
    const bill = computeBill(prices, { ...EMPTY_PRICES, fall: 5, blouse: 2 }, 100);
    expect(bill.lines[0]).toMatchObject({ key: 'fall', total: 150 });
    expect(bill.lines[1]).toMatchObject({ key: 'blouse', total: 500 });
    expect(bill.total).toBe(750);
  });

  it('suggests counts from dresses', () => {
    const chudi: Order = { ...base, id: 2, garmentType: 'chudidhar', count: 3, liningGivenCount: 3, fallNeeded: false };
    expect(suggestCounts([base, chudi])).toEqual({
      fall: 5,
      blouse: 5,
      blouseLining: 3,
      chudidhar: 3,
      chudidharLining: 0,
    });
  });

  it('builds share text without empty lines', () => {
    const bill = computeBill(prices, { ...EMPTY_PRICES, fall: 5 }, 20);
    const labels = { fall: 'Fall', blouse: 'B', blouseLining: 'BL', chudidhar: 'C', chudidharLining: 'CL' };
    const text = buildBillText({
      dateLabel: 'Date',
      date: '30 October 2026',
      nameLabel: 'Name',
      name: 'Asha',
      labels,
      extraLabel: 'Extra',
      totalLabel: 'Total',
      bill,
    });
    expect(text).toBe('Date: 30 October 2026\n\nName: Asha\n\nFall: 5 x 30 = 150\n\nExtra: 20\n\nTotal: 170');
  });
});

describe('billingRepo', () => {
  it('reads missing prices as zero and ignores junk', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValueOnce({ value: '250' }).mockResolvedValue({ value: 'x' }) });
    expect(await getPrices(db)).toEqual({ ...EMPTY_PRICES, fall: 250 });
  });

  it('saves every price in one transaction', async () => {
    const db = makeDb();
    await savePrices(db, { ...EMPTY_PRICES, fall: 30 });
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledTimes(5);
  });

  it('inserts a registered bill with the client id', async () => {
    const db = makeDb();
    const bill = computeBill(EMPTY_PRICES, EMPTY_PRICES, 10);
    expect(await insertBill(db, { clientId: 3 }, bill)).toBe(9);
    expect(db.runAsync.mock.calls[0].slice(1, 4)).toEqual([3, null, null]);
  });

  it('inserts a guest bill with name and phone and no client', async () => {
    const db = makeDb();
    await insertBill(db, { guestName: 'Asha', guestPhone: '9876543210' }, computeBill(EMPTY_PRICES, EMPTY_PRICES, 0));
    expect(db.runAsync.mock.calls[0].slice(1, 4)).toEqual([null, 'Asha', '9876543210']);
  });

  const row = {
    id: 1,
    client_id: null,
    guest_name: 'Asha',
    guest_phone: '98',
    client_name: null,
    client_phone: null,
    lines: '[]',
    extra: 5,
    total: 5,
    note: null,
    created_at: 'c',
  };

  it('maps guest rows as not registered', async () => {
    const db = makeDb({ getAllAsync: jest.fn().mockResolvedValue([row]) });
    const [bill] = await listBills(db);
    expect(bill).toMatchObject({ name: 'Asha', phone: '98', registered: false, note: '' });
  });

  it('filters history by client and maps registered rows', async () => {
    const db = makeDb({
      getAllAsync: jest.fn().mockResolvedValue([{ ...row, client_id: 2, client_name: 'Meena', client_phone: '77', note: 'paid' }]),
    });
    const [bill] = await listBills(db, { clientId: 2 });
    expect(bill).toMatchObject({ name: 'Meena', registered: true, note: 'paid' });
    expect(db.getAllAsync.mock.calls[0].slice(1)).toEqual([2, 100]);
  });

  it('survives corrupt line data and missing bills', async () => {
    const db = makeDb({ getFirstAsync: jest.fn().mockResolvedValueOnce({ ...row, lines: '{bad' }).mockResolvedValue(null) });
    expect((await getBill(db, 1))?.lines).toEqual([]);
    expect(await getBill(db, 2)).toBeNull();
  });

  it('stores a trimmed note or clears it', async () => {
    const db = makeDb();
    await updateBillNote(db, 1, '  paid  ');
    await updateBillNote(db, 1, '   ');
    expect(db.runAsync.mock.calls[0][1]).toBe('paid');
    expect(db.runAsync.mock.calls[1][1]).toBeNull();
  });
});

describe('inventory export', () => {
  const items = [
    { clientId: 1, clientName: 'Client 1', quantity: 2 },
    { clientId: 2, clientName: 'Client 2', quantity: 5 },
    { clientId: 1, clientName: 'Client 1', quantity: 1 },
  ];

  it('sums a client\'s dresses into one entry', () => {
    expect(groupInventoryRequests(items)).toEqual([
      { clientId: 1, clientName: 'Client 1', quantity: 3 },
      { clientId: 2, clientName: 'Client 2', quantity: 5 },
    ]);
  });

  it('builds the message with separators', () => {
    expect(buildInventoryText(items, 'Name', 'No.Of.Linings')).toBe(
      'Name: Client 1\n\nNo.Of.Linings: 3\n\n--------------------\n\nName: Client 2\n\nNo.Of.Linings: 5',
    );
  });

  it('records one export row per order in a transaction', async () => {
    const db = makeDb();
    await recordLiningExports(db, [
      { orderId: 1, quantity: 2 },
      { orderId: 2, quantity: 3 },
    ]);
    expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(db.runAsync).toHaveBeenCalledTimes(2);
  });

  it('lists a client\'s exports', async () => {
    const db = makeDb({
      getAllAsync: jest.fn().mockResolvedValue([{ id: 1, order_id: 4, quantity: 2, exported_at: 'e' }]),
    });
    expect(await listLiningExportsByClient(db, 7)).toEqual([{ id: 1, orderId: 4, quantity: 2, exportedAt: 'e' }]);
  });

  it('marks a tile exported only while the export covers what is pending', async () => {
    const base = { order_id: 1, client_id: 1, client_name: 'A', garment_type: 'saree_blouse', count: 5, lining_given_count: 0 };
    const db = makeDb({
      getAllAsync: jest.fn().mockResolvedValue([
        { ...base, last_export_qty: 5, last_export_at: 'e' },
        { ...base, order_id: 2, last_export_qty: 2, last_export_at: 'e' },
        { ...base, order_id: 3, last_export_qty: null, last_export_at: null },
      ]),
    });
    const summary = await getInventorySummary(db);
    expect(summary.items.map((i) => i.exportedAt)).toEqual(['e', null, null]);
  });
});

describe('setOrderGiven', () => {
  it('marks given and stitched together', async () => {
    const db = makeDb();
    await setOrderGiven(db, 4, true);
    expect(db.runAsync.mock.calls[0][0]).toContain("status = 'completed'");
  });

  it('clears only the hand-over when un-given', async () => {
    const db = makeDb();
    await setOrderGiven(db, 4, false);
    expect(db.runAsync.mock.calls[0][0]).toContain('given_at = NULL');
  });
});
