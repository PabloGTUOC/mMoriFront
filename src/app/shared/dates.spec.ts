import { toLocalIsoDate } from './dates';

/**
 * These assertions are timezone-independent by construction: the `Date` is built from local
 * components, and the expectation is those same components. They therefore fail under the
 * old `toISOString().split('T')[0]` in any zone with a non-zero offset, in whichever
 * direction that zone runs — which is the point.
 */
describe('toLocalIsoDate', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toLocalIsoDate(new Date(2026, 0, 15, 12, 0))).toBe('2026-01-15');
  });

  it('keeps just-after-midnight on the same local day', () => {
    // 00:30 local. East of UTC this is still the previous day in UTC, which is exactly how
    // an early-morning weigh-in used to be filed against yesterday.
    expect(toLocalIsoDate(new Date(2026, 0, 15, 0, 30))).toBe('2026-01-15');
  });

  it('keeps late evening on the same local day', () => {
    // 23:30 local. West of UTC this is already tomorrow in UTC.
    expect(toLocalIsoDate(new Date(2026, 0, 15, 23, 30))).toBe('2026-01-15');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toLocalIsoDate(new Date(2026, 8, 5, 9, 0))).toBe('2026-09-05');
  });

  it('handles a leap day', () => {
    expect(toLocalIsoDate(new Date(2028, 1, 29, 6, 0))).toBe('2028-02-29');
  });

  it('defaults to now', () => {
    const now = new Date();
    expect(toLocalIsoDate()).toBe(toLocalIsoDate(now));
  });
});
