/**
 * Recommendation engine (Section 5.1).
 * Pure scoring helpers live here so the server-function module stays a thin
 * wrapper (TanStack server-fn splitting removes runtime siblings).
 */

export interface TopicInput {
  topic_id: string;
  subject_id: string;
  chapter_id: string;
  topic_name: string;
  chapter_name: string;
  weightage: number;
  confidence: number; // 0-5
  status: string;
  last_studied_at: string | null;
  next_revision_due_at: string | null;
  attempts: number;
  correct: number;
}

export interface ScoredTopic {
  topic_id: string;
  score: number;
  weightage: number;
  mastery: number;
  recency_multiplier: number;
  driver: "weightage" | "confidence" | "revision" | "accuracy";
  reason: string;
}

const DAY = 1000 * 60 * 60 * 24;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / DAY);
}

/** Blends self-rated confidence with measured accuracy, weighting reality higher. */
export function masteryOf(t: TopicInput): number {
  const selfRated = Math.min(1, Math.max(0, t.confidence / 5));
  const statusFloor = t.status === "mastered" ? 0.75 : t.status === "revised" ? 0.6 : t.status === "completed" ? 0.5 : 0;
  if (t.attempts >= 3) {
    const accuracy = t.correct / t.attempts;
    return Math.min(1, Math.max(0.3 * selfRated + 0.7 * accuracy, statusFloor * 0.7));
  }
  return Math.min(1, Math.max(selfRated, statusFloor));
}

export function recencyOf(t: TopicInput): number {
  const since = daysSince(t.last_studied_at);
  let m = since === null ? 1.4 : 1 + Math.min(since / 30, 1) * 0.8;
  if (t.next_revision_due_at && new Date(t.next_revision_due_at).getTime() <= Date.now()) m += 0.5;
  return Number(m.toFixed(3));
}

export function scoreTopic(t: TopicInput): ScoredTopic {
  const mastery = masteryOf(t);
  const recency = recencyOf(t);
  const weightage = Number(t.weightage) || 1;
  const score = Number((weightage * (1 - mastery) * recency).toFixed(4));

  const accuracy = t.attempts >= 3 ? t.correct / t.attempts : null;
  const overdue = !!t.next_revision_due_at && new Date(t.next_revision_due_at).getTime() <= Date.now();
  const selfRated = t.confidence / 5;

  let driver: ScoredTopic["driver"] = "weightage";
  if (overdue) driver = "revision";
  else if (accuracy !== null && selfRated - accuracy >= 0.25) driver = "confidence";
  else if (accuracy !== null && accuracy < 0.5) driver = "accuracy";

  const since = daysSince(t.last_studied_at);
  const seen = since === null ? "never studied" : since < 1 ? "studied today" : `last seen ${Math.round(since)}d ago`;
  const acc = accuracy === null ? "no test data yet" : `${Math.round(accuracy * 100)}% accuracy`;

  const reason =
    driver === "revision"
      ? `Revision is overdue — ${t.chapter_name} carries ${weightage} weightage and you are at ${Math.round(mastery * 100)}% mastery (${acc}).`
      : driver === "confidence"
        ? `You rate this ${t.confidence}/5 but score ${acc} — high-weightage (${weightage}) gap worth closing, ${seen}.`
        : driver === "accuracy"
          ? `Only ${acc} across ${t.attempts} questions on a ${weightage}-weightage chapter, ${seen}.`
          : `High exam weightage (${weightage}) with ${Math.round(mastery * 100)}% mastery, ${seen}.`;

  return { topic_id: t.topic_id, score, weightage, mastery: Number(mastery.toFixed(3)), recency_multiplier: recency, driver, reason };
}

export function rankTopics(inputs: TopicInput[]): ScoredTopic[] {
  return inputs.map(scoreTopic).sort((a, b) => b.score - a.score);
}
