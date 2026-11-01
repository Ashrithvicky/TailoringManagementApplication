import type { Client, ClientSummary, Measurements, Order, GarmentType, OrderStatus } from '../domain/types';

export interface ClientRow {
  id: number;
  name: string;
  phone: string;
  area: string | null;
  created_at: string;
}

export interface ClientSummaryRow extends ClientRow {
  total_dresses: number;
  pending_dresses: number;
}

export interface OrderRow {
  id: number;
  client_id: number;
  garment_type: GarmentType;
  count: number;
  lining_given_count: number;
  fall_needed: number;
  fall_given: number;
  measurements: string;
  notes: string | null;
  status: OrderStatus;
  created_at: string;
  completed_at: string | null;
  given_at: string | null;
}

export function toClient(row: ClientRow): Client {
  return { id: row.id, name: row.name, phone: row.phone, area: row.area, createdAt: row.created_at };
}

export function toClientSummary(row: ClientSummaryRow): ClientSummary {
  return { ...toClient(row), totalDresses: row.total_dresses, pendingDresses: row.pending_dresses };
}

export function parseMeasurements(json: string): Measurements {
  try {
    const parsed: unknown = JSON.parse(json);
    return parsed !== null && typeof parsed === 'object' ? (parsed as Measurements) : {};
  } catch {
    return {};
  }
}

export function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    clientId: row.client_id,
    garmentType: row.garment_type,
    count: row.count,
    liningGivenCount: row.lining_given_count,
    fallNeeded: row.fall_needed === 1,
    fallGiven: row.fall_given === 1,
    measurements: parseMeasurements(row.measurements),
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    givenAt: row.given_at ?? null,
  };
}
