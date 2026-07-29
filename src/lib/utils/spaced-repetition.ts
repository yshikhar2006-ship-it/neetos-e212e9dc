/**
 * SM-2 spaced repetition. Shared shape used by the scheduler server function.
 * The authoritative scheduling call lives in src/lib/revision.functions.ts —
 * this module only holds the pure maths so it can be unit-reasoned about.
 */
export interface Sm2State {
  ease_factor: number;
  interval_days: number;
  repetitions: number;
}

export interface Sm2Result extends Sm2State {
  next_review_at: string;
}

/** rating: 0 = again, 1 = hard, 2 = good, 3 = easy */
export function sm2(state: Sm2State, rating: number): Sm2Result {
  const quality = [2, 3, 4, 5][Math.min(3, Math.max(0, rating))];
  let { ease_factor: ef, interval_days: interval, repetitions } = state;

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * ef);
  }

  ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  ef = Math.max(1.3, Math.min(2.8, Number(ef.toFixed(2))));

  const next = new Date();
  next.setDate(next.getDate() + Math.max(1, interval));

  return {
    ease_factor: ef,
    interval_days: Math.max(1, interval),
    repetitions,
    next_review_at: next.toISOString(),
  };
}

/** Ebbinghaus-style retention estimate used for the forgetting-curve sparkline. */
export function retentionCurve(intervalDays: number, points = 8): number[] {
  const stability = Math.max(1, intervalDays);
  return Array.from({ length: points }, (_, i) => {
    const t = (i / (points - 1)) * stability * 2;
    return Math.round(Math.exp(-t / stability) * 100);
  });
}
