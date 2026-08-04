import type { SupabaseClient } from "@supabase/supabase-js";
import { parseScheme, scorePaper } from "@/lib/papers/scheme";

/**
 * The commit path. This is the whole integration story from Section 1: once a
 * paper is scored it becomes a normal test_attempts row, so Dashboard,
 * Analytics, Error Log, Priority Scores and Productivity Score need zero
 * special-casing. Everything below is the existing native-test commit path
 * entered from a second door — not a parallel implementation.
 */

type Client = SupabaseClient<any, "public", any>;

interface PaperQuestionRow {
  id: string;
  position: number;
  correct_option: number | null;
  detected_topic_id: string | null;
  detected_subject_id: string | null;
  difficulty: string;
}

export async function commitPaper(
  supabase: Client,
  userId: string,
  paperId: string,
  totalTimeSeconds: number,
) {
  const [paperRes, questionsRes, answersRes] = await Promise.all([
    supabase.from("paper_uploads").select("*").eq("id", paperId).single(),
    supabase
      .from("paper_questions")
      .select("id, position, correct_option, detected_topic_id, detected_subject_id, difficulty")
      .eq("paper_id", paperId)
      .order("position"),
    supabase
      .from("paper_answers")
      .select("paper_question_id, selected_option, marked_for_review")
      .eq("paper_id", paperId),
  ]);

  if (paperRes.error) throw paperRes.error;
  if (questionsRes.error) throw questionsRes.error;
  if (answersRes.error) throw answersRes.error;

  const paper = paperRes.data as {
    id: string;
    title: string;
    subject_id: string | null;
    marking_scheme: unknown;
  };
  const questions = (questionsRes.data ?? []) as PaperQuestionRow[];
  if (questions.length === 0) throw new Error("This paper has no questions to score yet.");

  const answerByQuestion = new Map(
    (answersRes.data ?? []).map((a) => [
      a.paper_question_id as string,
      { selected: a.selected_option as number | null, marked: Boolean(a.marked_for_review) },
    ]),
  );

  const scheme = parseScheme(paper.marking_scheme);
  const result = scorePaper(
    questions.map((q) => ({
      selected_option: answerByQuestion.get(q.id)?.selected ?? null,
      correct_option: q.correct_option,
    })),
    scheme,
  );

  // Resolve topic -> subject for anything the extractor only tagged at topic level.
  const topicIds = [...new Set(questions.map((q) => q.detected_topic_id).filter(Boolean))] as string[];
  const subjectByTopic = new Map<string, string>();
  if (topicIds.length) {
    const { data: topicRows } = await supabase
      .from("topics")
      .select("id, chapters!inner(subject_id)")
      .in("id", topicIds);
    for (const row of topicRows ?? []) {
      const subjectId = (row.chapters as unknown as { subject_id: string })?.subject_id;
      if (subjectId) subjectByTopic.set(row.id as string, subjectId);
    }
  }

  const subjectOf = (q: PaperQuestionRow) =>
    q.detected_subject_id ?? (q.detected_topic_id ? subjectByTopic.get(q.detected_topic_id) : null) ?? paper.subject_id;

  // Same shape as the native attempt's subject_breakdown, so results and
  // analytics read it without branching.
  const breakdown: Record<string, { correct: number; total: number; score: number }> = {};
  for (const q of questions) {
    const key = subjectOf(q) ?? "unknown";
    const entry = breakdown[key] ?? { correct: 0, total: 0, score: 0 };
    entry.total += 1;
    const selected = answerByQuestion.get(q.id)?.selected ?? null;
    if (q.correct_option !== null) {
      if (selected === q.correct_option) {
        entry.correct += 1;
        entry.score += scheme.correct;
      } else if (selected !== null) {
        entry.score += scheme.incorrect;
      } else {
        entry.score += scheme.unattempted;
      }
    }
    breakdown[key] = entry;
  }

  const nowIso = new Date().toISOString();

  const { data: attempt, error: attemptError } = await supabase
    .from("test_attempts")
    .insert({
      user_id: userId,
      test_id: null,
      paper_upload_id: paperId,
      title: paper.title,
      started_at: nowIso,
      submitted_at: nowIso,
      score: Math.round(result.score),
      max_score: Math.round(result.max_score),
      correct_count: result.correct_count,
      incorrect_count: result.incorrect_count,
      unattempted_count: result.unattempted_count,
      accuracy: result.accuracy,
      time_taken_seconds: Math.max(0, Math.round(totalTimeSeconds)),
      subject_breakdown: breakdown,
      status: "submitted",
    })
    .select("id")
    .single();
  if (attemptError) throw attemptError;

  const attemptId = attempt.id as string;

  // Paper tests cannot capture real per-question time — never fabricate it.
  // Speed is presented at the whole-paper level only (Section 8).
  const answerRows = questions.map((q) => {
    const a = answerByQuestion.get(q.id);
    const selected = a?.selected ?? null;
    return {
      attempt_id: attemptId,
      user_id: userId,
      question_id: null,
      paper_question_id: q.id,
      selected_option: selected,
      is_correct: q.correct_option === null ? null : selected === q.correct_option,
      marked_for_review: Boolean(a?.marked),
      time_spent_seconds: 0,
    };
  });

  for (let i = 0; i < answerRows.length; i += 200) {
    const { error } = await supabase.from("test_answers").insert(answerRows.slice(i, i + 200));
    if (error) throw error;
  }

  // Error log: identical to the native wrong-answer path (same enum, same
  // topic_id, same convert-to-flashcard action downstream).
  const errorRows = questions
    .filter((q) => {
      if (q.correct_option === null) return false;
      const selected = answerByQuestion.get(q.id)?.selected ?? null;
      return selected !== q.correct_option;
    })
    .map((q) => {
      const selected = answerByQuestion.get(q.id)?.selected ?? null;
      return {
        user_id: userId,
        question_id: null,
        topic_id: q.detected_topic_id,
        attempt_id: attemptId,
        mistake_type: selected === null ? ("unattempted" as const) : ("conceptual" as const),
        note: `From uploaded paper: ${paper.title} (Q${q.position})`,
      };
    });

  if (errorRows.length) {
    const { error } = await supabase.from("error_log").insert(errorRows);
    if (error) throw error;
  }

  // The one write that makes Section 10 true rather than aspirational:
  // every topic this paper touched moves forward in user_topic_progress, which
  // is what FocusPick, SubjectRing, Priority Scores and the Productivity Score
  // all already read.
  const topicStats = new Map<string, { total: number; correct: number }>();
  for (const q of questions) {
    if (!q.detected_topic_id || q.correct_option === null) continue;
    const s = topicStats.get(q.detected_topic_id) ?? { total: 0, correct: 0 };
    s.total += 1;
    if (answerByQuestion.get(q.id)?.selected === q.correct_option) s.correct += 1;
    topicStats.set(q.detected_topic_id, s);
  }

  if (topicStats.size) {
    const { data: existing } = await supabase
      .from("user_topic_progress")
      .select("topic_id, status, confidence_rating")
      .eq("user_id", userId)
      .in("topic_id", [...topicStats.keys()]);

    const existingByTopic = new Map(
      (existing ?? []).map((p) => [p.topic_id as string, p as { status: string; confidence_rating: number }]),
    );

    const progressRows = [...topicStats.entries()].map(([topicId, s]) => {
      const acc = s.total ? s.correct / s.total : 0;
      const current = existingByTopic.get(topicId);
      const status = nextStatus(current?.status, acc);
      return {
        user_id: userId,
        topic_id: topicId,
        status,
        confidence_rating: Math.max(Number(current?.confidence_rating ?? 0), Math.round(acc * 5)),
        last_studied_at: nowIso,
      };
    });

    const { error } = await supabase
      .from("user_topic_progress")
      .upsert(progressRows, { onConflict: "user_id,topic_id" });
    if (error) throw error;
  }

  // Self-reported paper time counts toward study hours and streak the same way
  // a logged study session does (WeeklyHours, ConsistencyWidget, streak).
  if (totalTimeSeconds > 0) {
    const today = nowIso.slice(0, 10);
    const { data: log } = await supabase
      .from("habit_logs")
      .select("study_hours, pomodoro_count")
      .eq("user_id", userId)
      .eq("log_date", today)
      .maybeSingle();

    const hours = Number((totalTimeSeconds / 3600).toFixed(2));
    await supabase.from("habit_logs").upsert(
      {
        user_id: userId,
        log_date: today,
        study_hours: Number((Number(log?.study_hours ?? 0) + hours).toFixed(2)),
        pomodoro_count: Number(log?.pomodoro_count ?? 0),
      },
      { onConflict: "user_id,log_date" },
    );
  }

  const { error: paperError } = await supabase
    .from("paper_uploads")
    .update({
      status: "ready",
      status_detail: "Scored and added to your attempts",
      processed_at: nowIso,
      total_time_seconds: Math.max(0, Math.round(totalTimeSeconds)),
    })
    .eq("id", paperId);
  if (paperError) throw paperError;

  return { attempt_id: attemptId, ...result };
}

/** Only ever moves a topic forward, never backwards. */
function nextStatus(current: string | undefined, accuracy: number) {
  const order = ["not_started", "in_progress", "completed", "revised", "mastered"];
  const from = order.indexOf(current ?? "not_started");
  const earned = accuracy >= 0.85 ? 2 : accuracy >= 0.5 ? 1 : 1;
  return order[Math.max(from, Math.min(order.length - 1, earned))];
}
