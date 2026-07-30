import { format, subDays } from "date-fns";
import type { HabitLog } from "@/hooks/use-habits";
import type { TopicProgress } from "@/hooks/use-topic-progress";
import type { FlashcardReview } from "@/hooks/use-performance";

export interface ProductivityBreakdown {
  score: number | null; // null => not enough data
  consistency: number;
  efficiency: number;
  revisionDiscipline: number;
  daysLogged: number;
}

/**
 * Productivity Score (Section 5.3).
 * 0.4 consistency + 0.35 efficiency + 0.25 revision discipline.
 * Efficiency is per-hour, deliberately refusing to reward raw hours.
 */
export function productivityScore(
  logs: HabitLog[],
  progress: TopicProgress[],
  reviews: FlashcardReview[],
): ProductivityBreakdown {
  const last14 = new Set<string>();
  for (let i = 0; i < 14; i++) last14.add(format(subDays(new Date(), i), "yyyy-MM-dd"));

  const recent = logs.filter((l) => last14.has(l.log_date));
  const daysLogged = recent.filter((l) => Number(l.study_hours) > 0).length;
  const consistency = Math.round((daysLogged / 14) * 100);

  const hours = recent.reduce((sum, l) => sum + Number(l.study_hours || 0), 0);
  const cutoff = subDays(new Date(), 14).getTime();
  const completedRecently = progress.filter(
    (p) =>
      ["completed", "revised", "mastered"].includes(p.status) &&
      p.last_studied_at &&
      new Date(p.last_studied_at).getTime() >= cutoff,
  ).length;
  // One topic per two hours is treated as a healthy pace (=100).
  const efficiency = hours > 0 ? Math.min(100, Math.round((completedRecently / hours) * 200)) : 0;

  const due = progress.filter((p) => p.next_revision_due_at && new Date(p.next_revision_due_at).getTime() >= cutoff);
  const reviewedTopics = reviews.filter((r) => new Date(r.reviewed_at).getTime() >= cutoff).length;
  const revisionDiscipline = due.length
    ? Math.min(100, Math.round((reviewedTopics / due.length) * 100))
    : reviewedTopics > 0
      ? 100
      : 0;

  if (daysLogged < 3) {
    return { score: null, consistency, efficiency, revisionDiscipline, daysLogged };
  }

  const score = Math.round(0.4 * consistency + 0.35 * efficiency + 0.25 * revisionDiscipline);
  return { score, consistency, efficiency, revisionDiscipline, daysLogged };
}

/**
 * Burnout signal (Section 5.5): hours, activity frequency and accuracy all
 * falling together. Callers must check this before generating any push message.
 */
export function burnoutDetected(logs: HabitLog[], recentAccuracy: number[], priorAccuracy: number[]): boolean {
  const window = (offset: number) => {
    const days = new Set<string>();
    for (let i = offset; i < offset + 7; i++) days.add(format(subDays(new Date(), i), "yyyy-MM-dd"));
    return logs.filter((l) => days.has(l.log_date));
  };
  const thisWeek = window(0);
  const lastWeek = window(7);
  const hours = (rows: HabitLog[]) => rows.reduce((s, l) => s + Number(l.study_hours || 0), 0);
  const active = (rows: HabitLog[]) => rows.filter((l) => Number(l.study_hours) > 0).length;
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  if (lastWeek.length === 0) return false;
  return (
    hours(thisWeek) < hours(lastWeek) * 0.7 &&
    active(thisWeek) < active(lastWeek) &&
    avg(recentAccuracy) < avg(priorAccuracy) - 3
  );
}
