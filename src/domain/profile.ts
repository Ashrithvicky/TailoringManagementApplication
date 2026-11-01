import { LIMITS, PHONE_PATTERN, normalizePhone, type FieldErrors, type ValidationResult } from './validation';
import type { Profile } from './types';

export const EMPTY_PROFILE: Profile = { shopName: '', ownerName: '', phone: '' };

export function validateProfile(values: Profile): ValidationResult<Profile> {
  const errors: FieldErrors = {};
  const shopName = values.shopName.trim();
  const ownerName = values.ownerName.trim();
  const phone = normalizePhone(values.phone);

  if (shopName.length > LIMITS.name) errors.shopName = 'errors.tooLong';
  if (ownerName.length > LIMITS.name) errors.ownerName = 'errors.tooLong';
  if (phone && !PHONE_PATTERN.test(phone)) errors.phone = 'errors.invalidPhone';

  if (Object.keys(errors).length > 0) return { errors, value: null };
  return { errors, value: { shopName, ownerName, phone } };
}
