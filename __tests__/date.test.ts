import { formatDate } from '../src/domain/date';

describe('formatDate', () => {
  it('formats an ISO date for English', () => {
    expect(formatDate('2026-10-30T10:00:00.000Z', 'en')).toMatch(/30 October 2026/);
  });

  it('returns an empty string for invalid input', () => {
    expect(formatDate('nope', 'en')).toBe('');
  });
});
