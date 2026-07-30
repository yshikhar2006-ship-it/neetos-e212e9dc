import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { computePriorityScores } from "@/lib/priority.functions";

export interface PriorityScore {
  id: string;
  topic_id: string;
  score: number;
  weightage: number;
  mastery: number;
  recency_multiplier: number;
  reason: string | null;
  driver: "weightage" | "confidence" | "revision" | "accuracy";
  computed_at: string;
  topics?: {
    id: string;
    name: string;
    estimated_minutes: number;
    chapters: { id: string; name: string; subject_id: string; weightage_score: number };
  };
}

/** The single source of truth for "weak" across the whole app (Section 8). */
export function usePriorityScores(limit = 50) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["priority-scores", user?.id, limit],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PriorityScore[]> => {
      const { data, error } = await supabase
        .from("priority_scores")
        .select(
          "id, topic_id, score, weightage, mastery, recency_multiplier, reason, driver, computed_at, topics!inner(id, name, estimated_minutes, chapters!inner(id, name, subject_id, weightage_score))",
        )
        .eq("user_id", user!.id)
        .order("score", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as PriorityScore[];
    },
  });
}

/** Lowest-priority (i.e. strongest) topics — used by Analytics' strongest list. */
export function useStrongestTopics(limit = 5) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["priority-scores-strong", user?.id, limit],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PriorityScore[]> => {
      const { data, error } = await supabase
        .from("priority_scores")
        .select(
          "id, topic_id, score, weightage, mastery, recency_multiplier, reason, driver, computed_at, topics!inner(id, name, estimated_minutes, chapters!inner(id, name, subject_id, weightage_score))",
        )
        .eq("user_id", user!.id)
        .gt("mastery", 0.5)
        .order("score", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as PriorityScore[];
    },
  });
}

export function useRecomputePriority() {
  const qc = useQueryClient();
  const run = useServerFn(computePriorityScores);
  return useMutation({
    mutationFn: () => run({ data: undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["priority-scores"] });
      qc.invalidateQueries({ queryKey: ["priority-scores-strong"] });
    },
  });
}
