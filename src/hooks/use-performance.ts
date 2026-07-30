import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface TestAttempt {
  id: string;
  title: string;
  submitted_at: string | null;
  started_at: string;
  score: number;
  max_score: number;
  accuracy: number;
  correct_count: number;
  incorrect_count: number;
  unattempted_count: number;
  time_taken_seconds: number;
  subject_breakdown: Record<string, { correct?: number; total?: number; score?: number }> | null;
  status: string;
}

export function useTestAttempts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["test-attempts", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<TestAttempt[]> => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select("*")
        .eq("user_id", user!.id)
        .order("started_at");
      if (error) throw error;
      return (data ?? []) as unknown as TestAttempt[];
    },
  });
}

export interface AnswerRow {
  is_correct: boolean | null;
  selected_option: number | null;
  time_spent_seconds: number;
  created_at: string;
  topic_id: string | null;
  chapter_id: string | null;
  subject_id: string | null;
  difficulty: string;
  is_pyq: boolean;
}

/** Every answer the student has ever given, denormalised for analytics. */
export function useAnswerRows() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["answer-rows", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AnswerRow[]> => {
      const { data, error } = await supabase
        .from("test_answers")
        .select(
          "is_correct, selected_option, time_spent_seconds, created_at, questions!inner(topic_id, chapter_id, subject_id, difficulty, is_pyq)",
        )
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((row) => {
        const q = row.questions as unknown as {
          topic_id: string | null;
          chapter_id: string | null;
          subject_id: string | null;
          difficulty: string;
          is_pyq: boolean;
        };
        return {
          is_correct: row.is_correct as boolean | null,
          selected_option: row.selected_option as number | null,
          time_spent_seconds: (row.time_spent_seconds as number) ?? 0,
          created_at: row.created_at as string,
          ...q,
        };
      });
    },
  });
}

export interface QuestionCoverageRow {
  chapter_id: string | null;
  subject_id: string | null;
  is_pyq: boolean;
  id: string;
}

export function useQuestionBank() {
  return useQuery({
    queryKey: ["question-bank"],
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<QuestionCoverageRow[]> => {
      const { data, error } = await supabase.from("questions").select("id, chapter_id, subject_id, is_pyq");
      if (error) throw error;
      return (data ?? []) as QuestionCoverageRow[];
    },
  });
}

export interface FlashcardReview {
  id: string;
  flashcard_id: string;
  rating: number;
  ease_factor: number;
  interval_days: number;
  reviewed_at: string;
}

export function useFlashcardReviews() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["flashcard-reviews", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<FlashcardReview[]> => {
      const { data, error } = await supabase
        .from("flashcard_reviews")
        .select("id, flashcard_id, rating, ease_factor, interval_days, reviewed_at")
        .eq("user_id", user!.id)
        .order("reviewed_at");
      if (error) throw error;
      return (data ?? []) as FlashcardReview[];
    },
  });
}
