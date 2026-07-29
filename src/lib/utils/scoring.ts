/** NTA scoring: +4 correct, -1 incorrect, 0 unattempted, out of 720 / 180 questions. */
export const NTA = {
  CORRECT: 4,
  INCORRECT: -1,
  TOTAL_QUESTIONS: 180,
  MAX_SCORE: 720,
  DURATION_MINUTES: 200,
} as const;

export interface ScoredAnswer {
  selected_option: number | null;
  correct_option: number;
}

export function scoreAttempt(answers: ScoredAnswer[], totalQuestions = NTA.TOTAL_QUESTIONS) {
  let correct = 0;
  let incorrect = 0;
  for (const a of answers) {
    if (a.selected_option === null || a.selected_option === undefined) continue;
    if (a.selected_option === a.correct_option) correct += 1;
    else incorrect += 1;
  }
  const attempted = correct + incorrect;
  return {
    score: correct * NTA.CORRECT + incorrect * NTA.INCORRECT,
    correct_count: correct,
    incorrect_count: incorrect,
    unattempted_count: Math.max(0, totalQuestions - attempted),
    accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
    max_score: totalQuestions * NTA.CORRECT,
  };
}

/** Rough percentile/rank estimate from a 720-scale score. Always shown as an estimate. */
export function estimateRank(score: number, totalCandidates = 2400000) {
  const ratio = Math.min(1, Math.max(0, score / NTA.MAX_SCORE));
  const percentile = Number((100 * Math.pow(ratio, 1.65)).toFixed(4));
  const rank = Math.max(1, Math.round(((100 - percentile) / 100) * totalCandidates));
  return {
    percentile,
    rank_low: Math.max(1, Math.round(rank * 0.82)),
    rank_high: Math.round(rank * 1.18),
  };
}
