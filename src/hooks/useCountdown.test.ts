import { describe, expect, it } from 'vitest';
import { computeCountdown } from '@/hooks/useCountdown';

describe('computeCountdown', () => {
  const now = Date.parse('2026-11-01T10:00:00.000Z');

  it('splits the remaining time into days, hours, minutes and seconds', () => {
    const end = new Date(now + ((1 * 24 + 2) * 3600 + 3 * 60 + 4) * 1000).toISOString();
    expect(computeCountdown(end, now)).toEqual({ expired: false, days: 1, hours: 2, minutes: 3, seconds: 4 });
  });

  it('reports expired for past, missing or invalid end times', () => {
    expect(computeCountdown(new Date(now - 1000).toISOString(), now).expired).toBe(true);
    expect(computeCountdown(null, now).expired).toBe(true);
    expect(computeCountdown('not-a-date', now).expired).toBe(true);
  });
});
