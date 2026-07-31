import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type MistakeType =
  | "conceptual"
  | "silly"
  | "calculation"
  | "time_pressure"
  | "misread"
  | "guessed"
  | "unattempted";

export const MISTAKE_TYPES: MistakeType[] = [
  "conceptual",
  "silly",
  "calculation",
  "time_pressure",
  "misread",
  "guessed",
  "unattempted",
];

export interface ErrorEntry {
  id: string;
  user_id: string;
  question_id: string | null;
  topic_id: string | null;
  attempt_id: string | null;
  mistake_type: MistakeType;
  note: string | null;
  resolved: boolean;
  converted_to_flashcard: boolean;
  created_at: string;
}

export function useErrorLog() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["error-log", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ErrorEntry[]> => {
      const { data, error } = await supabase
        .from("error_log")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ErrorEntry[];
    },
  });
}

export type NewErrorEntry = Partial<Pick<ErrorEntry, "question_id" | "topic_id" | "attempt_id" | "note">> & {
  mistake_type: MistakeType;
};

export function useLogError() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: NewErrorEntry) => {
      const { data, error } = await supabase
        .from("error_log")
        .insert({ ...entry, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as ErrorEntry;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["error-log"] }),
  });
}

export function useUpdateErrorEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ErrorEntry> & { id: string }) => {
      const { error } = await supabase.from("error_log").update(patch).eq("id", id);
      if (error) throw error;
      return id;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: ["error-log"] });
      qc.setQueriesData<ErrorEntry[]>({ queryKey: ["error-log"] }, (old) =>
        (old ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["error-log"] }),
  });
}

export function useDeleteErrorEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("error_log").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["error-log"] }),
  });
}

/** Questions referenced by error-log rows, for the notebook detail view. */
export function useErrorQuestions(ids: string[]) {
  const key = [...ids].sort().join(",");
  return useQuery({
    queryKey: ["error-questions", key],
    enabled: ids.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, question_text, options, correct_option, explanation, subject_id, topic_id, difficulty")
        .in("id", ids);
      if (error) throw error;
      return data ?? [];
    },
  });
}
