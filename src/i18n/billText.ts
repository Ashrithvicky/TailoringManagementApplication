import type { TFunction } from 'i18next';

import { PRICE_KEYS, buildBillText, type Bill, type PriceKey } from '../domain/billing';
import { formatDate } from '../domain/date';

export function localizedBillText(t: TFunction, language: string, name: string, isoDate: string, bill: Bill): string {
  const labels = Object.fromEntries(PRICE_KEYS.map((key) => [key, t(`billing.items.${key}`)])) as Record<PriceKey, string>;
  return buildBillText({
    dateLabel: t('billing.date'),
    date: formatDate(isoDate, language),
    nameLabel: t('billing.name'),
    name,
    labels,
    extraLabel: t('billing.extra'),
    totalLabel: t('billing.total'),
    bill,
  });
}
