import { useEffect, useState } from 'react';

export interface Countdown {
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const EXPIRED: Countdown = { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };

export function computeCountdown(endsAt: string | null, now: number): Countdown {
  if (!endsAt) return EXPIRED;
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return EXPIRED;
  const remaining = Math.floor((end - now) / 1000);
  if (remaining <= 0) return EXPIRED;
  return {
    expired: false,
    days: Math.floor(remaining / 86400),
    hours: Math.floor((remaining % 86400) / 3600),
    minutes: Math.floor((remaining % 3600) / 60),
    seconds: remaining % 60,
  };
}

/** Ticks once per second while the offer is running; stops by itself when it ends. */
export function useCountdown(endsAt: string | null, enabled = true): Countdown {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !endsAt) return;
    setNow(Date.now());
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (computeCountdown(endsAt, current).expired) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt, enabled]);

  return enabled ? computeCountdown(endsAt, now) : EXPIRED;
}
