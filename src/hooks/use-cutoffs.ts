import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface CutoffRow {
  id: string;
  college_name: string;
  course: string;
  category: string;
  quota: string;
  state: string | null;
  year: number;
  closing_rank: number;
  closing_score: number | null;
}

/** Historical closing ranks — reference data, cached hard. */
export function useCutoffs() {
  return useQuery({
    queryKey: ["cutoff-data"],
    staleTime: 12 * 60 * 60 * 1000,
    queryFn: async (): Promise<CutoffRow[]> => {
      const { data, error } = await supabase
        .from("cutoff_data")
        .select("id, college_name, course, category, quota, state, year, closing_rank, closing_score")
        .order("closing_rank");
      if (error) throw error;
      return (data ?? []) as CutoffRow[];
    },
  });
}

export interface RankPrediction {
  id: string;
  based_on_score: number;
  predicted_percentile: number;
  rank_low: number;
  rank_high: number;
  category: string | null;
  narrative: string | null;
  created_at: string;
}

export function useRankPredictions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["rank-predictions", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<RankPrediction[]> => {
      const { data, error } = await supabase
        .from("rank_predictions")
        .select("id, based_on_score, predicted_percentile, rank_low, rank_high, category, narrative, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RankPrediction[];
    },
  });
}

/** Snapshots the current prediction so students can watch it move over time. */
export function useSaveRankPrediction() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      based_on_score: number;
      predicted_percentile: number;
      rank_low: number;
      rank_high: number;
      category?: string | null;
      narrative?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("rank_predictions")
        .insert({ ...input, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as RankPrediction;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rank-predictions"] }),
  });
}
