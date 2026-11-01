import {
  GARMENT_SECTIONS,
  HAND_SECTIONS,
  type ClientInput,
  type Dimension,
  type GarmentType,
  type Measurements,
  type NewOrderInput,
  type SectionKey,
} from './types';

export type ErrorKey =
  | 'errors.required'
  | 'errors.invalidPhone'
  | 'errors.invalidNumber'
  | 'errors.invalidCount'
  | 'errors.liningRange'
  | 'errors.tooLong';

export type FieldErrors = Record<string, ErrorKey>;

export interface ValidationResult<T> {
  errors: FieldErrors;
  value: T | null;
}

export interface ClientFormValues {
  name: string;
  phone: string;
  area: string;
}

export interface SectionFormValues {
  length: string;
  breadth: string;
  handLength: string;
  handBreadth: string;
}

export interface OrderFormValues {
  garmentType: GarmentType;
  count: string;
  measurements: Partial<Record<SectionKey, SectionFormValues>>;
  liningGiven: boolean;
  liningCount: string;
  fallNeeded: boolean;
  fallGiven: boolean;
  notes: string;
}

export const LIMITS = {
  name: 100,
  area: 100,
  notes: 1000,
  maxInches: 300,
  maxCount: 99,
} as const;

export const PHONE_PATTERN = /^\+?\d{7,15}$/;
const INCHES_PATTERN = /^\d{1,3}([.,]\d{1,2})?$/;
const WHOLE_PATTERN = /^\d{1,3}$/;

export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, '');
}

export function parseInches(text: string): number | null {
  const trimmed = text.trim();
  if (!INCHES_PATTERN.test(trimmed)) return null;
  const value = Number(trimmed.replace(',', '.'));
  return value > 0 && value <= LIMITS.maxInches ? value : null;
}

export function parseWhole(text: string): number | null {
  const trimmed = text.trim();
  return WHOLE_PATTERN.test(trimmed) ? Number(trimmed) : null;
}

export const EMPTY_SECTION: SectionFormValues = { length: '', breadth: '', handLength: '', handBreadth: '' };

export function emptyOrderForm(garmentType: GarmentType = 'saree_blouse'): OrderFormValues {
  const measurements: OrderFormValues['measurements'] = {};
  for (const section of GARMENT_SECTIONS[garmentType]) {
    measurements[section] = { ...EMPTY_SECTION };
  }
  return {
    garmentType,
    count: '1',
    measurements,
    liningGiven: false,
    liningCount: '',
    fallNeeded: false,
    fallGiven: false,
    notes: '',
  };
}

export function validateClientForm(values: ClientFormValues): ValidationResult<ClientInput> {
  const errors: FieldErrors = {};
  const name = values.name.trim();
  const area = values.area.trim();
  const phone = normalizePhone(values.phone);

  if (!name) errors.name = 'errors.required';
  else if (name.length > LIMITS.name) errors.name = 'errors.tooLong';

  if (!phone) errors.phone = 'errors.required';
  else if (!PHONE_PATTERN.test(phone)) errors.phone = 'errors.invalidPhone';

  if (area.length > LIMITS.area) errors.area = 'errors.tooLong';

  if (Object.keys(errors).length > 0) return { errors, value: null };
  return { errors, value: { name, phone, area: area || null } };
}

export function validateOrderForm(values: OrderFormValues): ValidationResult<NewOrderInput> {
  const errors: FieldErrors = {};

  const count = parseWhole(values.count);
  if (count === null || count < 1 || count > LIMITS.maxCount) errors.count = 'errors.invalidCount';

  const measurements: Measurements = {};
  for (const section of GARMENT_SECTIONS[values.garmentType]) {
    const input = values.measurements[section] ?? EMPTY_SECTION;
    const fields: (keyof SectionFormValues)[] = HAND_SECTIONS.includes(section)
      ? ['length', 'breadth', 'handLength', 'handBreadth']
      : ['length', 'breadth'];
    const parsed: Partial<Dimension> = {};
    for (const field of fields) {
      const raw = input[field];
      const number = parseInches(raw);
      if (number === null) errors[`${section}.${field}`] = raw.trim() ? 'errors.invalidNumber' : 'errors.required';
      else parsed[field] = number;
    }
    if (fields.every((f) => parsed[f] !== undefined)) measurements[section] = parsed as Dimension;
  }

  let liningGivenCount = 0;
  if (values.liningGiven) {
    const given = parseWhole(values.liningCount);
    if (given === null || given < 1 || (count !== null && given > count)) errors.lining = 'errors.liningRange';
    else liningGivenCount = given;
  }

  const notes = values.notes.trim();
  const isSaree = values.garmentType === 'saree_blouse';
  if (notes.length > LIMITS.notes) errors.notes = 'errors.tooLong';

  if (Object.keys(errors).length > 0 || count === null) return { errors, value: null };
  return {
    errors,
    value: {
      garmentType: values.garmentType,
      count,
      liningGivenCount,
      fallNeeded: isSaree && values.fallNeeded,
      fallGiven: isSaree && values.fallNeeded && values.fallGiven,
      measurements,
      notes: notes || null,
    },
  };
}
