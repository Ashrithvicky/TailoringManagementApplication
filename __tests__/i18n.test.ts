import { en } from '../src/i18n/en';
import { ta } from '../src/i18n/ta';

type Dict = { [key: string]: string | Dict };

function flatten(dict: Dict, prefix = ''): Record<string, string> {
  return Object.entries(dict).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? { ...acc, [path]: value } : { ...acc, ...flatten(value, path) };
  }, {});
}

const placeholders = (text: string) => (text.match(/{{\w+}}/g) ?? []).sort();

describe('translations', () => {
  const english = flatten(en);
  const tamil = flatten(ta);

  it('has the same keys in English and Tamil', () => {
    expect(Object.keys(tamil).sort()).toEqual(Object.keys(english).sort());
  });

  it('has no empty strings', () => {
    expect(Object.values(english).every((v) => v.trim())).toBe(true);
    expect(Object.values(tamil).every((v) => v.trim())).toBe(true);
  });

  it('keeps interpolation placeholders in sync', () => {
    for (const key of Object.keys(english)) {
      expect(placeholders(tamil[key])).toEqual(placeholders(english[key]));
    }
  });
});
