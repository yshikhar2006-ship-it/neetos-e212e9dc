import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { NTA, scoreAttempt, type ScoredAnswer } from "@/lib/utils/scoring";

export type TestType = "full_mock" | "chapter_wise" | "custom" | "pyq" | "diagnostic";

export interface TestConfig {
  title: string;
  type: TestType;
  subjectIds: string[];
  chapterIds?: string[];
  totalQuestions: number;
  durationMinutes: number;
  pyqOnly?: boolean;
  difficulty?: "all" | "easy" | "medium" | "hard";
}

export interface AttemptQuestion {
  position: number;
  question_id: string;
  question_text: string;
  options: string[];
  correct_option: number;
  explanation: string | null;
  difficulty: string;
  is_pyq: boolean;
  subject_id: string | null;
  chapter_id: string | null;
  topic_id: string | null;
}

/** Builds a paper from the shared question bank and opens an attempt. */
export function useStartTest() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (config: TestConfig) => {
      let q = supabase.from("questions").select("id");
      if (config.subjectIds.length) q = q.in("subject_id", config.subjectIds);
      if (config.chapterIds?.length) q = q.in("chapter_id", config.chapterIds);
      if (config.pyqOnly) q = q.eq("is_pyq", true);
      if (config.difficulty && config.difficulty !== "all") q = q.eq("difficulty", config.difficulty);

      const { data: pool, error: poolError } = await q.limit(1000);
      if (poolError) throw poolError;
      if (!pool || pool.length === 0) {
        throw new Error("No questions match this configuration yet. Try widening the filters.");
      }

      const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, config.totalQuestions);

      const { data: test, error: testError } = await supabase
        .from("tests")
        .insert({
          user_id: user!.id,
          title: config.title,
          type: config.type,
          total_questions: shuffled.length,
          duration_minutes: config.durationMinutes,
          is_public: false,
          config: config as unknown as Record<string, unknown>,
        })
        .select()
        .single();
      if (testError) throw testError;

      const { error: tqError } = await supabase.from("test_questions").insert(
        shuffled.map((row, i) => ({ test_id: test.id, question_id: row.id, position: i + 1 })),
      );
      if (tqError) throw tqError;

      const { data: attempt, error: attemptError } = await supabase
        .from("test_attempts")
        .insert({
          user_id: user!.id,
          test_id: test.id,
          title: config.title,
          max_score: shuffled.length * NTA.CORRECT,
          unattempted_count: shuffled.length,
          status: "in_progress",
        })
        .select()
        .single();
      if (attemptError) throw attemptError;

      return attempt as { id: string; test_id: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["test-attempts"] }),
  });
}

export function useAttempt(attemptId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["attempt", attemptId],
    enabled: !!user && !!attemptId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("*")
        .eq("id", attemptId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useAttemptQuestions(testId?: string | null) {
  return useQuery({
    queryKey: ["attempt-questions", testId],
    enabled: !!testId,
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<AttemptQuestion[]> => {
      const { data, error } = await supabase
        .from("test_questions")
        .select(
          "position, question_id, questions!inner(question_text, options, correct_option, explanation, difficulty, is_pyq, subject_id, chapter_id, topic_id)",
        )
        .eq("test_id", testId!)
        .order("position");
      if (error) throw error;
      return (data ?? []).map((row) => {
        const q = row.questions as unknown as Omit<AttemptQuestion, "position" | "question_id" | "options"> & {
          options: unknown;
        };
        return {
          position: row.position as number,
          question_id: row.question_id as string,
          ...q,
          options: (q.options as string[]) ?? [],
        };
      });
    },
  });
}

export interface AttemptAnswerInput {
  attemptId: string;
  questionId: string;
  selectedOption: number | null;
  isCorrect: boolean | null;
  markedForReview: boolean;
  timeSpentSeconds: number;
}

export function useSaveAnswer() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: AttemptAnswerInput) => {
      const { error } = await supabase.from("test_answers").upsert(
        {
          attempt_id: input.attemptId,
          user_id: user!.id,
          question_id: input.questionId,
          selected_option: input.selectedOption,
          is_correct: input.isCorrect,
          marked_for_review: input.markedForReview,
          time_spent_seconds: input.timeSpentSeconds,
        },
        { onConflict: "attempt_id,question_id" },
      );
      if (error) throw error;
    },
  });
}

export function useSubmitAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      attemptId,
      answers,
      questions,
      timeTakenSeconds,
    }: {
      attemptId: string;
      answers: Record<string, { selected: number | null; time: number }>;
      questions: AttemptQuestion[];
      timeTakenSeconds: number;
    }) => {
      const scored: ScoredAnswer[] = questions.map((q) => {
        const a = answers[q.question_id];
        return {
          selected: a?.selected ?? null,
          correct: q.correct_option,
        } as ScoredAnswer;
      });
      const result = scoreAttempt(scored, questions.length);

      const breakdown: Record<string, { correct: number; total: number; score: number }> = {};
      for (const q of questions) {
        const key = q.subject_id ?? "unknown";
        const entry = breakdown[key] ?? { correct: 0, total: 0, score: 0 };
        entry.total += 1;
        const selected = answers[q.question_id]?.selected ?? null;
        if (selected === q.correct_option) {
          entry.correct += 1;
          entry.score += NTA.CORRECT;
        } else if (selected !== null) {
          entry.score += NTA.INCORRECT;
        }
        breakdown[key] = entry;
      }

      const { error } = await supabase
        .from("test_attempts")
        .update({
          submitted_at: new Date().toISOString(),
          score: result.score,
          max_score: questions.length * NTA.CORRECT,
          correct_count: result.correct,
          incorrect_count: result.incorrect,
          unattempted_count: result.unattempted,
          accuracy: result.accuracy,
          time_taken_seconds: timeTakenSeconds,
          subject_breakdown: breakdown,
          status: "submitted",
        })
        .eq("id", attemptId);
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-attempts"] });
      qc.invalidateQueries({ queryKey: ["attempt"] });
      qc.invalidateQueries({ queryKey: ["answer-rows"] });
    },
  });
}

export function useAttemptAnswers(attemptId: string) {
  return useQuery({
    queryKey: ["attempt-answers", attemptId],
    enabled: !!attemptId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_answers")
        .select("question_id, selected_option, is_correct, time_spent_seconds, marked_for_review")
        .eq("attempt_id", attemptId);
      if (error) throw error;
      return data ?? [];
    },
  });
}
