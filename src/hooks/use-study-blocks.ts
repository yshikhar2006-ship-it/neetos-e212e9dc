import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type BlockStatus = "planned" | "in_progress" | "completed" | "skipped";
export type BlockType = "study" | "revision" | "practice" | "mock_test" | "break" | "coaching" | "custom";

export interface StudyBlock {
  id: string;
  user_id: string;
  topic_id: string | null;
  title: string;
  type: BlockType;
  block_date: string;
  start_minute: number;
  duration_minutes: number;
  status: BlockStatus;
  notes: string | null;
}

export function useStudyBlocks(dateFrom: string, dateTo: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["study-blocks", user?.id, dateFrom, dateTo],
    enabled: !!user,
    queryFn: async (): Promise<StudyBlock[]> => {
      const { data, error } = await supabase
        .from("study_blocks")
        .select("*")
        .eq("user_id", user!.id)
        .gte("block_date", dateFrom)
        .lte("block_date", dateTo)
        .order("block_date")
        .order("start_minute");
      if (error) throw error;
      return (data ?? []) as StudyBlock[];
    },
  });
}

export type NewStudyBlock = Omit<StudyBlock, "id" | "user_id" | "status" | "notes"> &
  Partial<Pick<StudyBlock, "status" | "notes">>;

/** Both Tomorrow Planner and manual Daily Planner edits write this same row shape. */
export function useCreateStudyBlocks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (blocks: NewStudyBlock[]) => {
      const { data, error } = await supabase
        .from("study_blocks")
        .insert(blocks.map((b) => ({ status: "planned" as BlockStatus, ...b, user_id: user!.id })))
        .select();
      if (error) throw error;
      return (data ?? []) as StudyBlock[];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study-blocks"] }),
  });
}

export function useUpdateStudyBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<StudyBlock> & { id: string }) => {
      const { data, error } = await supabase.from("study_blocks").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data as StudyBlock;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: ["study-blocks"] });
      qc.setQueriesData<StudyBlock[]>({ queryKey: ["study-blocks"] }, (old) =>
        (old ?? []).map((b) => (b.id === id ? { ...b, ...patch } : b)),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["study-blocks"] }),
  });
}

export function useDeleteStudyBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("study_blocks").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study-blocks"] }),
  });
}
