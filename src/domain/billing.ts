import type { Order } from './types';

export const PRICE_KEYS = ['fall', 'blouse', 'blouseLining', 'chudidhar', 'chudidharLining'] as const;
export type PriceKey = (typeof PRICE_KEYS)[number];

export type Prices = Record<PriceKey, number>;
export type Counts = Record<PriceKey, number>;

export const EMPTY_PRICES: Prices = { fall: 0, blouse: 0, blouseLining: 0, chudidhar: 0, chudidharLining: 0 };

export const MAX_AMOUNT = 1_000_000;

// Blank means 0; returns null for anything that is not a non-negative amount with up to 2 decimals.
export function parseAmount(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value <= MAX_AMOUNT ? value : null;
}

export function parseCount(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  return /^\d{1,4}$/.test(trimmed) ? Number(trimmed) : null;
}

export interface BillLine {
  key: PriceKey;
  count: number;
  price: number;
  total: number;
}

export interface Bill {
  lines: BillLine[];
  extra: number;
  total: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function computeBill(prices: Prices, counts: Counts, extra: number): Bill {
  const lines = PRICE_KEYS.map((key) => ({
    key,
    count: counts[key],
    price: prices[key],
    total: round2(counts[key] * prices[key]),
  }));
  const total = round2(lines.reduce((sum, line) => sum + line.total, 0) + extra);
  return { lines, extra, total };
}

// Starting counts from a client's dresses; the shop supplies lining that was not given.
export function suggestCounts(orders: readonly Order[]): Counts {
  const counts: Counts = { ...EMPTY_PRICES };
  for (const order of orders) {
    const lining = order.count - order.liningGivenCount;
    if (order.garmentType === 'saree_blouse') {
      counts.blouse += order.count;
      counts.blouseLining += lining;
      if (order.fallNeeded) counts.fall += order.count;
    } else {
      counts.chudidhar += order.count;
      counts.chudidharLining += lining;
    }
  }
  return counts;
}

export function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export interface BillRecord extends Bill {
  id: number;
  clientId: number | null;
  name: string;
  phone: string;
  registered: boolean;
  note: string;
  createdAt: string;
}

// Blocks are separated by a blank line so the message reads cleanly in chat apps.
export function buildBillText(args: {
  dateLabel: string;
  date: string;
  nameLabel: string;
  name: string;
  labels: Record<PriceKey, string>;
  extraLabel: string;
  totalLabel: string;
  bill: Bill;
}): string {
  const { dateLabel, date, nameLabel, name, labels, extraLabel, totalLabel, bill } = args;
  const rows = bill.lines
    .filter((line) => line.count > 0)
    .map((line) => `${labels[line.key]}: ${line.count} x ${formatAmount(line.price)} = ${formatAmount(line.total)}`);
  const blocks = [
    `${dateLabel}: ${date}`,
    `${nameLabel}: ${name}`,
    rows.join('\n'),
    bill.extra > 0 ? `${extraLabel}: ${formatAmount(bill.extra)}` : '',
    `${totalLabel}: ${formatAmount(bill.total)}`,
  ];
  return blocks.filter(Boolean).join('\n\n');
}

export interface InventoryRequest {
  clientId: number;
  clientName: string;
  quantity: number;
}

const INVENTORY_SEPARATOR = '--------------------';

// One entry per client; a client's several dresses are summed.
export function groupInventoryRequests(items: readonly InventoryRequest[]): InventoryRequest[] {
  const byClient = new Map<number, InventoryRequest>();
  for (const item of items) {
    const existing = byClient.get(item.clientId);
    if (existing) existing.quantity += item.quantity;
    else byClient.set(item.clientId, { ...item });
  }
  return [...byClient.values()];
}

export function buildInventoryText(items: readonly InventoryRequest[], nameLabel: string, countLabel: string): string {
  return groupInventoryRequests(items)
    .map((item) => `${nameLabel}: ${item.clientName}\n\n${countLabel}: ${item.quantity}`)
    .join(`\n\n${INVENTORY_SEPARATOR}\n\n`);
}
