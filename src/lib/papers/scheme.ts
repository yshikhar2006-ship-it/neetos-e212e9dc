/**
 * Per-paper marking scheme. Coaching institutes don't all use NTA's +4/-1, so
 * every paper carries its own scheme (stored as jsonb on paper_uploads).
 */
export interface MarkingScheme {
  correct: number;
  incorrect: number;
  unattempted: number;
}

export const NTA_SCHEME: MarkingScheme = { correct: 4, incorrect: -1, unattempted: 0 };

export const SCHEME_PRESETS: { label: string; scheme: MarkingScheme }[] = [
  { label: "NTA (+4 / −1 / 0)", scheme: NTA_SCHEME },
  { label: "+4 / 0 / 0 (no negative)", scheme: { correct: 4, incorrect: 0, unattempted: 0 } },
  { label: "+1 / −0.25 / 0", scheme: { correct: 1, incorrect: -0.25, unattempted: 0 } },
  { label: "+2 / −0.5 / 0", scheme: { correct: 2, incorrect: -0.5, unattempted: 0 } },
];

export function parseScheme(value: unknown): MarkingScheme {
  const v = (value ?? {}) as Partial<MarkingScheme>;
  return {
    correct: Number.isFinite(Number(v.correct)) ? Number(v.correct) : NTA_SCHEME.correct,
    incorrect: Number.isFinite(Number(v.incorrect)) ? Number(v.incorrect) : NTA_SCHEME.incorrect,
    unattempted: Number.isFinite(Number(v.unattempted)) ? Number(v.unattempted) : NTA_SCHEME.unattempted,
  };
}

export function schemeLabel(scheme: MarkingScheme) {
  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  return `${sign(scheme.correct)} / ${sign(scheme.incorrect)} / ${scheme.unattempted}`;
}

export interface PaperScoredAnswer {
  selected_option: number | null;
  correct_option: number | null;
}

/**
 * Scores a paper against its own scheme. Questions with no known correct
 * option (no answer key detected or supplied) are excluded from scoring
 * entirely rather than counted as wrong.
 */
export function scorePaper(answers: PaperScoredAnswer[], scheme: MarkingScheme) {
  let correct = 0;
  let incorrect = 0;
  let unattempted = 0;
  let scorable = 0;

  for (const a of answers) {
    if (a.correct_option === null || a.correct_option === undefined) continue;
    scorable += 1;
    if (a.selected_option === null || a.selected_option === undefined) unattempted += 1;
    else if (a.selected_option === a.correct_option) correct += 1;
    else incorrect += 1;
  }

  const attempted = correct + incorrect;
  return {
    score: Number(
      (correct * scheme.correct + incorrect * scheme.incorrect + unattempted * scheme.unattempted).toFixed(2),
    ),
    max_score: Number((scorable * scheme.correct).toFixed(2)),
    correct_count: correct,
    incorrect_count: incorrect,
    unattempted_count: unattempted,
    scorable_count: scorable,
    accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
  };
}
