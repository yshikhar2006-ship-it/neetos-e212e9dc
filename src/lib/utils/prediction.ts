import type { TestAttempt } from "@/hooks/use-performance";
import { NTA, estimateRank } from "@/lib/utils/scoring";

export interface ScoreProjection {
  latest: number;
  average: number;
  best: number;
  /** Linear-trend projection of the score on exam day, clamped to the NTA scale. */
  projected: number;
  /** 0-100. Grows with sample size, falls with volatility. */
  confidence: number;
  confidenceLabel: "low" | "moderate" | "high";
  samples: number;
  slopePerTest: number;
}

const clampScore = (v: number) => Math.max(0, Math.min(NTA.MAX_SCORE, Math.round(v)));

/**
 * Performance prediction (Section 5.4).
 * Deliberately conservative: with fewer than three submitted mocks we project
 * the average, not the trend, and label confidence "low".
 */
export function projectScore(attempts: TestAttempt[], testsUntilExam = 6): ScoreProjection {
  const done = attempts
    .filter((a) => a.submitted_at)
    .sort((a, b) => new Date(a.submitted_at!).getTime() - new Date(b.submitted_at!).getTime());

  const scaled = done.map((a) => (a.max_score ? (a.score / a.max_score) * NTA.MAX_SCORE : a.score));
  const samples = scaled.length;
  if (!samples) {
    return {
      latest: 0,
      average: 0,
      best: 0,
      projected: 0,
      confidence: 0,
      confidenceLabel: "low",
      samples: 0,
      slopePerTest: 0,
    };
  }

  const latest = clampScore(scaled[samples - 1]!);
  const average = clampScore(scaled.reduce((s, v) => s + v, 0) / samples);
  const best = clampScore(Math.max(...scaled));

  // Least-squares slope over test index.
  let slope = 0;
  if (samples >= 3) {
    const meanX = (samples - 1) / 2;
    const meanY = scaled.reduce((s, v) => s + v, 0) / samples;
    let num = 0;
    let den = 0;
    scaled.forEach((y, x) => {
      num += (x - meanX) * (y - meanY);
      den += (x - meanX) ** 2;
    });
    slope = den ? num / den : 0;
  }

  const recent = scaled.slice(-3);
  const recentMean = recent.reduce((s, v) => s + v, 0) / recent.length;
  const projected = samples >= 3 ? clampScore(recentMean + slope * testsUntilExam) : average;

  const variance = scaled.reduce((s, v) => s + (v - average) ** 2, 0) / samples;
  const sd = Math.sqrt(variance);
  const sampleFactor = Math.min(1, samples / 8);
  const stabilityFactor = Math.max(0, 1 - sd / 120);
  const confidence = Math.round(100 * (0.6 * sampleFactor + 0.4 * stabilityFactor));

  return {
    latest,
    average,
    best,
    projected,
    confidence,
    confidenceLabel: confidence >= 70 ? "high" : confidence >= 40 ? "moderate" : "low",
    samples,
    slopePerTest: Number(slope.toFixed(1)),
  };
}

export interface RankBand {
  percentile: number;
  rank_low: number;
  rank_high: number;
}

/** Widens the raw rank band when prediction confidence is low. */
export function rankBand(score: number, confidence: number, totalCandidates = 2400000): RankBand {
  const base = estimateRank(score, totalCandidates);
  const widen = 1 + (100 - Math.max(0, Math.min(100, confidence))) / 140;
  const mid = (base.rank_low + base.rank_high) / 2;
  return {
    percentile: base.percentile,
    rank_low: Math.max(1, Math.round(mid - ((mid - base.rank_low) * widen))),
    rank_high: Math.round(mid + (base.rank_high - mid) * widen),
  };
}

export type CollegeChance = "safe" | "likely" | "stretch" | "unlikely";

/** Compares a predicted rank band against a historical closing rank. */
export function collegeChance(closingRank: number, band: RankBand): CollegeChance {
  if (band.rank_high <= closingRank * 0.8) return "safe";
  if (band.rank_high <= closingRank) return "likely";
  if (band.rank_low <= closingRank * 1.25) return "stretch";
  return "unlikely";
}

export const CHANCE_META: Record<CollegeChance, { label: string; tone: string }> = {
  safe: { label: "Safe", tone: "text-success" },
  likely: { label: "Likely", tone: "text-primary" },
  stretch: { label: "Stretch", tone: "text-warning" },
  unlikely: { label: "Unlikely", tone: "text-muted-foreground" },
};
