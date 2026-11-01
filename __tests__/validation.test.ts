import {
  emptyOrderForm,
  normalizePhone,
  parseInches,
  parseWhole,
  validateClientForm,
  validateOrderForm,
} from '../src/domain/validation';
import { validateProfile } from '../src/domain/profile';

describe('parsers', () => {
  it('parses inches with dot or comma decimals', () => {
    expect(parseInches('14')).toBe(14);
    expect(parseInches(' 14.5 ')).toBe(14.5);
    expect(parseInches('14,25')).toBe(14.25);
  });

  it.each(['', '0', 'abc', '-3', '14.555', '301', '1e3'])('rejects invalid inches %p', (text) => {
    expect(parseInches(text)).toBeNull();
  });

  it('parses whole numbers only', () => {
    expect(parseWhole('3')).toBe(3);
    expect(parseWhole('3.5')).toBeNull();
    expect(parseWhole('')).toBeNull();
  });

  it('normalizes phone formatting', () => {
    expect(normalizePhone('+91 98765-43210')).toBe('+919876543210');
  });
});

describe('validateClientForm', () => {
  it('accepts a valid client and treats area as optional', () => {
    const { value, errors } = validateClientForm({ name: '  Lakshmi ', phone: '98765 43210', area: '' });
    expect(errors).toEqual({});
    expect(value).toEqual({ name: 'Lakshmi', phone: '9876543210', area: null });
  });

  it('accepts Tamil names', () => {
    expect(validateClientForm({ name: 'லட்சுமி', phone: '9876543210', area: 'சென்னை' }).value).not.toBeNull();
  });

  it('requires name and phone', () => {
    const { value, errors } = validateClientForm({ name: ' ', phone: '', area: '' });
    expect(value).toBeNull();
    expect(errors).toEqual({ name: 'errors.required', phone: 'errors.required' });
  });

  it('rejects bad phone numbers and over-long values', () => {
    const { errors } = validateClientForm({ name: 'a'.repeat(101), phone: '12ab', area: 'b'.repeat(101) });
    expect(errors).toEqual({ name: 'errors.tooLong', phone: 'errors.invalidPhone', area: 'errors.tooLong' });
  });
});

describe('validateOrderForm', () => {
  const filledBlouse = () => {
    const form = emptyOrderForm('saree_blouse');
    form.measurements.blouse = { length: '14', breadth: '16.5', handLength: '8', handBreadth: '9.5' };
    return form;
  };

  it('builds a saree-blouse order', () => {
    const form = { ...filledBlouse(), count: '3', notes: ' deep neck ' };
    expect(validateOrderForm(form).value).toEqual({
      garmentType: 'saree_blouse',
      count: 3,
      liningGivenCount: 0,
      fallNeeded: false,
      fallGiven: false,
      measurements: { blouse: { length: 14, breadth: 16.5, handLength: 8, handBreadth: 9.5 } },
      notes: 'deep neck',
    });
  });

  it('records saree fall needed and given, and drops given when not needed', () => {
    const both = validateOrderForm({ ...filledBlouse(), fallNeeded: true, fallGiven: true }).value;
    expect(both).toMatchObject({ fallNeeded: true, fallGiven: true });
    const stale = validateOrderForm({ ...filledBlouse(), fallNeeded: false, fallGiven: true }).value;
    expect(stale).toMatchObject({ fallNeeded: false, fallGiven: false });
  });

  it('ignores saree fall for chudidhar', () => {
    const form = emptyOrderForm('chudidhar');
    form.measurements.top = { length: '20', breadth: '18', handLength: '8', handBreadth: '9' };
    form.measurements.pant = { length: '38', breadth: '20', handLength: '', handBreadth: '' };
    expect(validateOrderForm({ ...form, fallNeeded: true }).value).toMatchObject({ fallNeeded: false });
  });

  it('requires hand measurements for blouse and top but not pant', () => {
    const blouse = emptyOrderForm('saree_blouse');
    blouse.measurements.blouse = { length: '14', breadth: '16', handLength: '', handBreadth: 'x' };
    expect(validateOrderForm(blouse).errors).toEqual({
      'blouse.handLength': 'errors.required',
      'blouse.handBreadth': 'errors.invalidNumber',
    });
  });

  it('requires both top and pant for chudidhar', () => {
    const form = emptyOrderForm('chudidhar');
    form.measurements.top = { length: '20', breadth: '', handLength: '8', handBreadth: '9' };
    const { errors, value } = validateOrderForm(form);
    expect(value).toBeNull();
    expect(errors).toEqual({
      'top.breadth': 'errors.required',
      'pant.length': 'errors.required',
      'pant.breadth': 'errors.required',
    });
  });

  it('flags non-numeric measurements as invalid', () => {
    const form = filledBlouse();
    form.measurements.blouse = { length: 'x', breadth: '16', handLength: '8', handBreadth: '9' };
    expect(validateOrderForm(form).errors).toEqual({ 'blouse.length': 'errors.invalidNumber' });
  });

  it.each(['0', '100', 'x', ''])('rejects count %p', (count) => {
    expect(validateOrderForm({ ...filledBlouse(), count }).errors.count).toBe('errors.invalidCount');
  });

  it('records lining given for part of the count', () => {
    const form = { ...filledBlouse(), count: '3', liningGiven: true, liningCount: '2' };
    expect(validateOrderForm(form).value?.liningGivenCount).toBe(2);
  });

  it('rejects lining count above the dress count or empty', () => {
    const over = { ...filledBlouse(), count: '2', liningGiven: true, liningCount: '3' };
    const empty = { ...filledBlouse(), count: '2', liningGiven: true, liningCount: '' };
    expect(validateOrderForm(over).errors.lining).toBe('errors.liningRange');
    expect(validateOrderForm(empty).errors.lining).toBe('errors.liningRange');
  });

  it('ignores a stale lining count when lining is not given', () => {
    const form = { ...filledBlouse(), liningGiven: false, liningCount: '9' };
    expect(validateOrderForm(form).value?.liningGivenCount).toBe(0);
  });

  it('rejects over-long notes', () => {
    expect(validateOrderForm({ ...filledBlouse(), notes: 'n'.repeat(1001) }).errors.notes).toBe('errors.tooLong');
  });
});

describe('validateProfile', () => {
  it('allows an empty profile and trims values', () => {
    expect(validateProfile({ shopName: ' TA ', ownerName: '', phone: '' }).value).toEqual({
      shopName: 'TA',
      ownerName: '',
      phone: '',
    });
  });

  it('validates phone and lengths', () => {
    const { errors } = validateProfile({ shopName: 's'.repeat(101), ownerName: 'o'.repeat(101), phone: 'bad' });
    expect(errors).toEqual({ shopName: 'errors.tooLong', ownerName: 'errors.tooLong', phone: 'errors.invalidPhone' });
  });
});
