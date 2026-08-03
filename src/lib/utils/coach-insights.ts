import type { CoachContext } from "@/hooks/use-coach-context";

export type InsightTone = "primary" | "success" | "warning" | "danger" | "muted";

export interface CoachInsight {
  id: string;
  category: "daily" | "weakness" | "revision" | "productivity" | "prediction" | "motivation";
  title: string;
  detail: string;
  tone: InsightTone;
  /** Prompt sent to the coach when the student asks for a deeper answer. */
  prompt: string;
  link?: { to: string; label: string };
}

const pctChange = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);

/**
 * Deterministic, data-grounded insight cards. These never call the model — they
 * are computed from the same context object the model receives, so the cards and
 * the chat can never disagree.
 */
export function buildInsights(ctx: CoachContext): CoachInsight[] {
  const insights: CoachInsight[] = [];
  const { profile, practice, revision, mistakes, habits, plan, priorityTopics, prediction, syllabus } = ctx;

  // 1. Daily recommendation
  const top = priorityTopics[0];
  if (top) {
    insights.push({
      id: "daily",
      category: "daily",
      title: `Start with ${top.topic}`,
      detail: `${top.subject} · ${top.chapter} — priority ${top.score}, driven by ${top.driver}. Budget about ${top.estimatedMinutes} min.${plan.todayBlocks.length ? ` You already have ${plan.todayBlocks.length} block(s) planned today.` : " Nothing is on today's planner yet."}`,
      tone: "primary",
      prompt: "Give me a focused study plan for the rest of today based on my priority topics, planned blocks and energy levels.",
      link: { to: "/planner", label: "Open planner" },
    });
  } else {
    insights.push({
      id: "daily",
      category: "daily",
      title: "Set your baseline first",
      detail:
        "No priority topics have been computed yet. Mark chapter progress in Syllabus and finish one mock so recommendations can be grounded in your real data.",
      tone: "muted",
      prompt: "I am just starting out. What should my first week on NEET OS look like?",
      link: { to: "/syllabus", label: "Open syllabus" },
    });
  }

  // 2. Weak chapter detection
  const weakSubject = [...practice.subjectAccuracy]
    .filter((s) => s.answered >= 5)
    .sort((a, b) => a.accuracyPct - b.accuracyPct)[0];
  const weakChapters = priorityTopics.slice(0, 3).map((p) => p.chapter);
  if (weakSubject || weakChapters.length) {
    insights.push({
      id: "weakness",
      category: "weakness",
      title: weakSubject ? `${weakSubject.subject} is your weakest subject` : "Weak chapters detected",
      detail: [
        weakSubject ? `${weakSubject.accuracyPct}% accuracy across ${weakSubject.answered} answered questions.` : null,
        weakChapters.length ? `Highest-priority chapters: ${[...new Set(weakChapters)].join(", ")}.` : null,
      ]
        .filter(Boolean)
        .join(" "),
      tone: weakSubject && weakSubject.accuracyPct < 50 ? "danger" : "warning",
      prompt: "Which chapters are dragging my score down, and how should I repair them over the next 10 days?",
      link: { to: "/analytics", label: "See analytics" },
    });
  }

  // 3. Revision suggestion
  insights.push({
    id: "revision",
    category: "revision",
    title:
      revision.dueToday > 0
        ? `${revision.dueToday} flashcard${revision.dueToday === 1 ? "" : "s"} due now`
        : revision.topicsDueForRevision > 0
          ? `${revision.topicsDueForRevision} topic${revision.topicsDueForRevision === 1 ? "" : "s"} due for revision`
          : "Revision queue is clear",
    detail:
      revision.totalCards === 0
        ? "You have no flashcards yet. Converting your Error Log entries into cards is the fastest way to stop repeating mistakes."
        : `${revision.reviewsLast7Days} reviews in the last 7 days across ${revision.totalCards} cards. ${revision.topicsDueForRevision} topic(s) are past their spaced-repetition due date.`,
    tone: revision.dueToday > 20 ? "warning" : revision.dueToday > 0 ? "primary" : "success",
    prompt: "Plan my revision for this week using spaced repetition, my due cards and my weakest chapters.",
    link: { to: "/revision", label: "Open revision hub" },
  });

  // 4. Productivity insight
  const hoursDelta = pctChange(habits.hoursLast7Days, habits.hoursPrev7Days);
  insights.push({
    id: "productivity",
    category: "productivity",
    title: habits.burnoutRisk
      ? "Burnout signals detected"
      : habits.productivityScore !== null
        ? `Productivity score ${habits.productivityScore}/100`
        : "Not enough logged days yet",
    detail: habits.burnoutRisk
      ? `Hours, active days and accuracy are all falling together (${habits.hoursLast7Days}h this week vs ${habits.hoursPrev7Days}h last week). Prioritise sleep and light revision over new chapters.`
      : habits.productivityScore !== null
        ? `Consistency ${habits.consistency}%, efficiency ${habits.efficiency}%, revision discipline ${habits.revisionDiscipline}%. ${habits.hoursLast7Days}h logged this week${hoursDelta !== null ? ` (${hoursDelta >= 0 ? "+" : ""}${hoursDelta}% vs last week)` : ""}.`
        : `Only ${habits.daysLoggedLast14} of the last 14 days are logged. Log at least 3 days so your score can be computed honestly.`,
    tone: habits.burnoutRisk ? "danger" : habits.productivityScore === null ? "muted" : habits.productivityScore >= 65 ? "success" : "warning",
    prompt: "Analyse my study habits, sleep and focus sessions. Where am I losing time and what should I change?",
    link: { to: "/habits", label: "Open habit tracker" },
  });

  // 5. Performance prediction
  insights.push({
    id: "prediction",
    category: "prediction",
    title:
      practice.attempts > 0
        ? `Projected ${practice.projectedScore}/720`
        : "No mock data to project from",
    detail:
      practice.attempts > 0
        ? `${practice.attempts} submitted mock(s). Latest ${practice.latestScore}, best ${practice.bestScore}, trend ${practice.trendPerTest >= 0 ? "+" : ""}${practice.trendPerTest} marks per test. Confidence ${practice.confidence}% (${practice.confidenceLabel}).${prediction ? ` Rank band ${prediction.rankLow.toLocaleString("en-IN")}–${prediction.rankHigh.toLocaleString("en-IN")}.` : ""}`
        : "Take one full mock so score projection and rank bands become meaningful. Until then every prediction would be guesswork.",
    tone:
      practice.attempts === 0
        ? "muted"
        : practice.projectedScore >= profile.targetScore
          ? "success"
          : "warning",
    prompt: "Based on my mock trend, will I hit my target score by exam day? What has to change numerically?",
    link: { to: "/cutoffs", label: "Open rank predictor" },
  });

  // 6. Motivation, grounded in real numbers
  const coverage = syllabus.topicsTracked
    ? Math.round((syllabus.completed / syllabus.topicsTracked) * 100)
    : 0;
  insights.push({
    id: "motivation",
    category: "motivation",
    title: habits.streakDays > 1 ? `${habits.streakDays}-day streak` : "Build your streak today",
    detail: [
      profile.daysToExam !== null ? `${profile.daysToExam} days to exam.` : null,
      `${syllabus.completed}/${syllabus.topicsTracked || 0} tracked topics done (${coverage}%).`,
      mistakes.open > 0 ? `${mistakes.open} open mistake(s) waiting in the Error Log.` : "No open mistakes — clean slate.",
    ]
      .filter(Boolean)
      .join(" "),
    tone: habits.streakDays >= 7 ? "success" : "primary",
    prompt: "Give me an honest, motivating read on my progress this month — what is genuinely working?",
    link: { to: "/dashboard", label: "Open dashboard" },
  });

  return insights;
}

export function buildSuggestedPrompts(ctx: CoachContext): string[] {
  const prompts = [
    "What should I study today?",
    "Plan my day tomorrow, hour by hour.",
    "Which are my weakest chapters right now?",
    "Build this week's revision schedule.",
  ];
  if (ctx.practice.attempts > 0) prompts.push("Analyse my last mock test in detail.");
  if (ctx.mistakes.open > 0) prompts.push(`Help me clear my ${ctx.mistakes.open} open mistakes.`);
  if (ctx.habits.burnoutRisk) prompts.push("I feel burnt out. Give me a lighter recovery week.");
  if (ctx.profile.targetCollege) prompts.push(`Am I on track for ${ctx.profile.targetCollege}?`);
  if (ctx.revision.dueToday > 0) prompts.push("How do I clear my due flashcards fast without cramming?");
  return prompts.slice(0, 8);
}

export const TONE_CLASS: Record<InsightTone, string> = {
  primary: "border-primary/40 bg-primary/5",
  success: "border-success/40 bg-success/5",
  warning: "border-warning/40 bg-warning/5",
  danger: "border-destructive/40 bg-destructive/5",
  muted: "border-border bg-muted/40",
};
