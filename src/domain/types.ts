export const GARMENT_TYPES = ['saree_blouse', 'chudidhar'] as const;
export type GarmentType = (typeof GARMENT_TYPES)[number];

export const ORDER_STATUSES = ['pending', 'completed'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type SectionKey = 'blouse' | 'top' | 'pant';

export const GARMENT_SECTIONS: Record<GarmentType, readonly SectionKey[]> = {
  saree_blouse: ['blouse'],
  chudidhar: ['top', 'pant'],
};

// Sections that also take hand (sleeve) measurements.
export const HAND_SECTIONS: readonly SectionKey[] = ['blouse', 'top'];

export interface Dimension {
  length: number;
  breadth: number;
  handLength?: number;
  handBreadth?: number;
}

export type Measurements = Partial<Record<SectionKey, Dimension>>;

export interface ClientInput {
  name: string;
  phone: string;
  area: string | null;
}

export interface Client extends ClientInput {
  id: number;
  createdAt: string;
}

export interface ClientSummary extends Client {
  totalDresses: number;
  pendingDresses: number;
}

export interface NewOrderInput {
  garmentType: GarmentType;
  count: number;
  liningGivenCount: number;
  fallNeeded: boolean;
  fallGiven: boolean;
  measurements: Measurements;
  notes: string | null;
}

export interface Order extends NewOrderInput {
  id: number;
  clientId: number;
  status: OrderStatus;
  createdAt: string;
  completedAt: string | null;
  givenAt: string | null;
}

export interface DashboardStats {
  clients: number;
  clientsCompleted: number;
  clientsPending: number;
  totalDresses: number;
  completedDresses: number;
  pendingDresses: number;
  liningPendingDresses: number;
}

export interface PendingLiningItem {
  orderId: number;
  clientId: number;
  clientName: string;
  garmentType: GarmentType;
  count: number;
  liningGivenCount: number;
  liningPending: number;
  // Set when the pending quantity was already sent out to be bought.
  exportedAt: string | null;
}

export interface LiningExport {
  id: number;
  orderId: number;
  quantity: number;
  exportedAt: string;
}

export interface InventorySummary {
  totalLiningPending: number;
  byGarment: Record<GarmentType, number>;
  items: PendingLiningItem[];
}

export interface Profile {
  shopName: string;
  ownerName: string;
  phone: string;
}

export type Language = 'en' | 'ta';

export type ClientStatusFilter = 'all' | 'pending' | 'completed';
