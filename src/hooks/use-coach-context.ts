import { useMemo } from "react";
import { addDays, format, subDays } from "date-fns";
import { useProfile } from "@/hooks/use-profile";
import { useHabitLogs, streakFrom } from "@/hooks/use-habits";
import { useTopicProgress } from "@/hooks/use-topic-progress";
import { useAnswerRows, useFlashcardReviews, useTestAttempts } from "@/hooks/use-performance";
import { useFlashcards } from "@/hooks/use-flashcards";
import { useErrorLog } from "@/hooks/use-error-log";
import { usePriorityScores } from "@/hooks/use-priority";
import { useStudyBlocks } from "@/hooks/use-study-blocks";
import { useSubjects, useTopicSubjectMap } from "@/hooks/use-curriculum";
import { productivityScore, burnoutDetected } from "@/lib/utils/productivity";
import { projectScore, rankBand } from "@/lib/utils/prediction";
import { daysUntil, subjectToken } from "@/lib/utils/format";

export interface CoachContext {
  generatedAt: string;
  profile: {
    name: string | null;
    attemptType: string | null;
    examDate: string | null;
    daysToExam: number | null;
    targetScore: number;
    targetCollege: string | null;
    dailyStudyHours: number;
    category: string | null;
    quota: string | null;
  };
  syllabus: {
    topicsTracked: number;
    completed: number;
    mastered: number;
    inProgress: number;
    bySubject: { subject: string; tracked: number; completed: number; coveragePct: number }[];
  };
  practice: {
    attempts: number;
    latestScore: number | null;
    averageScore: number | null;
    bestScore: number | null;
    projectedScore: number;
    confidence: number;
    confidenceLabel: string;
    trendPerTest: number;
    accuracyLast5: number[];
    subjectAccuracy: { subject: string; accuracyPct: number; answered: number }[];
  };
  prediction: { percentile: number; rankLow: number; rankHigh: number } | null;
  revision: {
    totalCards: number;
    dueToday: number;
    reviewsLast7Days: number;
    topicsDueForRevision: number;
  };
  mistakes: {
    open: number;
    total: number;
    byType: { type: string; count: number }[];
  };
  habits: {
    streakDays: number;
    hoursLast7Days: number;
    hoursPrev7Days: number;
    avgSleepHours: number | null;
    avgMood: number | null;
    pomodorosLast7Days: number;
    daysLoggedLast14: number;
    productivityScore: number | null;
    consistency: number;
    efficiency: number;
    revisionDiscipline: number;
    burnoutRisk: boolean;
  };
  plan: {
    todayBlocks: { title: string; type: string; status: string; minutes: number }[];
    tomorrowBlocks: { title: string; type: string; minutes: number }[];
  };
  priorityTopics: {
    topic: string;
    chapter: string;
    subject: string;
    score: number;
    driver: string;
    reason: string | null;
    estimatedMinutes: number;
  }[];
}

export interface CoachData {
  context: CoachContext | null;
  isLoading: boolean;
  isError: boolean;
  hasAnyData: boolean;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/**
 * Single aggregation point for every AI Coach surface — insight cards, suggested
 * prompts and the model context block all read this one object.
 */
export function useCoachContext(): CoachData {
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const profileQ = useProfile();
  const habitsQ = useHabitLogs(60);
  const progressQ = useTopicProgress();
  const attemptsQ = useTestAttempts();
  const answersQ = useAnswerRows();
  const reviewsQ = useFlashcardReviews();
  const cardsQ = useFlashcards();
  const errorsQ = useErrorLog();
  const priorityQ = usePriorityScores(12);
  const blocksQ = useStudyBlocks(today, tomorrow);
  const subjectsQ = useSubjects();
  const topicMapQ = useTopicSubjectMap();

  const queries = [
    profileQ,
    habitsQ,
    progressQ,
    attemptsQ,
    answersQ,
    reviewsQ,
    cardsQ,
    errorsQ,
    priorityQ,
    blocksQ,
    subjectsQ,
    topicMapQ,
  ];
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  const context = useMemo<CoachContext | null>(() => {
    const profile = profileQ.data;
    const subjects = subjectsQ.data ?? [];
    if (!profile) return null;

    const logs = habitsQ.data ?? [];
    const progress = progressQ.data ?? [];
    const attempts = attemptsQ.data ?? [];
    const answers = answersQ.data ?? [];
    const reviews = reviewsQ.data ?? [];
    const cards = cardsQ.data ?? [];
    const errors = errorsQ.data ?? [];
    const priority = priorityQ.data ?? [];
    const blocks = blocksQ.data ?? [];
    const topicMap = topicMapQ.data ?? [];

    const subjectById = new Map(subjects.map((s) => [s.id, s]));
    const subjectOfTopic = new Map(topicMap.map((t) => [t.id, t.subject_id]));

    // Syllabus roll-up
    const bySubject = subjects.map((s) => {
      const rows = progress.filter((p) => subjectOfTopic.get(p.topic_id) === s.id);
      const completed = rows.filter((p) => ["completed", "revised", "mastered"].includes(p.status)).length;
      return {
        subject: s.name,
        tracked: rows.length,
        completed,
        coveragePct: rows.length ? Math.round((completed / rows.length) * 100) : 0,
      };
    });

    // Practice
    const submitted = attempts.filter((a) => a.submitted_at);
    const projection = projectScore(attempts);
    const accuracyLast5 = submitted.slice(0, 5).map((a) => Math.round(Number(a.accuracy)));
    const subjectAccuracy = subjects.map((s) => {
      const rows = answers.filter((a) => a.subject_id === s.id && a.selected_option !== null);
      const correct = rows.filter((a) => a.is_correct).length;
      return {
        subject: s.name,
        accuracyPct: rows.length ? Math.round((correct / rows.length) * 100) : 0,
        answered: rows.length,
      };
    });

    const band = projection.samples ? rankBand(projection.projected, projection.confidence) : null;

    // Revision
    const nowMs = Date.now();
    const dueToday = cards.filter((c) => new Date(c.next_review_at).getTime() <= nowMs).length;
    const weekAgo = subDays(new Date(), 7).getTime();
    const reviewsLast7Days = reviews.filter((r) => new Date(r.reviewed_at).getTime() >= weekAgo).length;
    const topicsDue = progress.filter(
      (p) => p.next_revision_due_at && new Date(p.next_revision_due_at).getTime() <= nowMs,
    ).length;

    // Mistakes
    const byTypeMap = new Map<string, number>();
    errors.forEach((e) => byTypeMap.set(e.mistake_type, (byTypeMap.get(e.mistake_type) ?? 0) + 1));

    // Habits
    const dayWindow = (offset: number) => {
      const days = new Set<string>();
      for (let i = offset; i < offset + 7; i++) days.add(format(subDays(new Date(), i), "yyyy-MM-dd"));
      return logs.filter((l) => days.has(l.log_date));
    };
    const thisWeek = dayWindow(0);
    const prevWeek = dayWindow(7);
    const hoursOf = (rows: typeof logs) => Number(rows.reduce((s, l) => s + Number(l.study_hours || 0), 0).toFixed(1));
    const sleepValues = thisWeek.map((l) => Number(l.sleep_hours)).filter((v) => Number.isFinite(v) && v > 0);
    const moodValues = thisWeek.map((l) => Number(l.mood)).filter((v) => Number.isFinite(v) && v > 0);
    const breakdown = productivityScore(logs, progress, reviews);
    const recentAcc = submitted.slice(0, 3).map((a) => Number(a.accuracy));
    const priorAcc = submitted.slice(3, 6).map((a) => Number(a.accuracy));

    return {
      generatedAt: new Date().toISOString(),
      profile: {
        name: profile.full_name,
        attemptType: profile.attempt_type,
        examDate: profile.exam_date,
        daysToExam: profile.exam_date ? daysUntil(profile.exam_date) : null,
        targetScore: profile.target_score,
        targetCollege: profile.target_college,
        dailyStudyHours: profile.daily_study_hours,
        category: profile.category,
        quota: profile.quota,
      },
      syllabus: {
        topicsTracked: progress.length,
        completed: progress.filter((p) => ["completed", "revised", "mastered"].includes(p.status)).length,
        mastered: progress.filter((p) => p.status === "mastered").length,
        inProgress: progress.filter((p) => p.status === "in_progress").length,
        bySubject,
      },
      practice: {
        attempts: submitted.length,
        latestScore: projection.samples ? projection.latest : null,
        averageScore: projection.samples ? projection.average : null,
        bestScore: projection.samples ? projection.best : null,
        projectedScore: projection.projected,
        confidence: projection.confidence,
        confidenceLabel: projection.confidenceLabel,
        trendPerTest: projection.slopePerTest,
        accuracyLast5,
        subjectAccuracy,
      },
      prediction: band
        ? { percentile: band.percentile, rankLow: band.rank_low, rankHigh: band.rank_high }
        : null,
      revision: {
        totalCards: cards.length,
        dueToday,
        reviewsLast7Days,
        topicsDueForRevision: topicsDue,
      },
      mistakes: {
        open: errors.filter((e) => !e.resolved).length,
        total: errors.length,
        byType: [...byTypeMap.entries()]
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count),
      },
      habits: {
        streakDays: streakFrom(logs),
        hoursLast7Days: hoursOf(thisWeek),
        hoursPrev7Days: hoursOf(prevWeek),
        avgSleepHours: sleepValues.length ? Number(avg(sleepValues).toFixed(1)) : null,
        avgMood: moodValues.length ? Number(avg(moodValues).toFixed(1)) : null,
        pomodorosLast7Days: thisWeek.reduce((s, l) => s + (l.pomodoro_count ?? 0), 0),
        daysLoggedLast14: breakdown.daysLogged,
        productivityScore: breakdown.score,
        consistency: breakdown.consistency,
        efficiency: breakdown.efficiency,
        revisionDiscipline: breakdown.revisionDiscipline,
        burnoutRisk: burnoutDetected(logs, recentAcc, priorAcc),
      },
      plan: {
        todayBlocks: blocks
          .filter((b) => b.block_date === today)
          .map((b) => ({ title: b.title, type: b.type, status: b.status, minutes: b.duration_minutes })),
        tomorrowBlocks: blocks
          .filter((b) => b.block_date === tomorrow)
          .map((b) => ({ title: b.title, type: b.type, minutes: b.duration_minutes })),
      },
      priorityTopics: priority.map((p) => {
        const subjectId = p.topics?.chapters?.subject_id;
        return {
          topic: p.topics?.name ?? "Topic",
          chapter: p.topics?.chapters?.name ?? "Chapter",
          subject: subjectId ? (subjectById.get(subjectId)?.name ?? subjectToken(null)) : "—",
          score: Number(Number(p.score).toFixed(1)),
          driver: p.driver,
          reason: p.reason,
          estimatedMinutes: p.topics?.estimated_minutes ?? 30,
        };
      }),
    };
  }, [
    profileQ.data,
    habitsQ.data,
    progressQ.data,
    attemptsQ.data,
    answersQ.data,
    reviewsQ.data,
    cardsQ.data,
    errorsQ.data,
    priorityQ.data,
    blocksQ.data,
    subjectsQ.data,
    topicMapQ.data,
    today,
    tomorrow,
  ]);

  const hasAnyData = Boolean(
    context &&
      (context.syllabus.topicsTracked > 0 ||
        context.practice.attempts > 0 ||
        context.habits.daysLoggedLast14 > 0 ||
        context.revision.totalCards > 0),
  );

  return { context, isLoading, isError, hasAnyData };
}
