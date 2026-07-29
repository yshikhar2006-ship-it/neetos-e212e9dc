import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type TopicStatus = "not_started" | "in_progress" | "completed" | "revised" | "mastered";

export interface TopicProgress {
  id: string;
  user_id: string;
  topic_id: string;
  status: TopicStatus;
  confidence_rating: number;
  last_studied_at: string | null;
  next_revision_due_at: string | null;
  revision_count: number;
}

export function useTopicProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["topic-progress", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<TopicProgress[]> => {
      const { data, error } = await supabase
        .from("user_topic_progress")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as TopicProgress[];
    },
  });
}

export function useUpsertTopicProgress() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      topic_id: string;
      status?: TopicStatus;
      confidence_rating?: number;
    }) => {
      const now = new Date().toISOString();
      const nextRevision =
        input.status && input.status !== "not_started"
          ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString()
          : null;

      const { data, error } = await supabase
        .from("user_topic_progress")
        .upsert(
          {
            user_id: user!.id,
            topic_id: input.topic_id,
            ...(input.status ? { status: input.status, last_studied_at: now } : {}),
            ...(input.confidence_rating !== undefined
              ? { confidence_rating: input.confidence_rating }
              : {}),
            ...(nextRevision ? { next_revision_due_at: nextRevision } : {}),
          },
          { onConflict: "user_id,topic_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as TopicProgress;
    },
    // Optimistic: Subjects and Chapter Tracker must never feel like they are catching up.
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["topic-progress", user?.id] });
      const previous = qc.getQueryData<TopicProgress[]>(["topic-progress", user?.id]);
      qc.setQueryData<TopicProgress[]>(["topic-progress", user?.id], (old = []) => {
        const existing = old.find((p) => p.topic_id === input.topic_id);
        if (existing) {
          return old.map((p) => (p.topic_id === input.topic_id ? { ...p, ...input } : p));
        }
        return [
          ...old,
          {
            id: `optimistic-${input.topic_id}`,
            user_id: user?.id ?? "",
            topic_id: input.topic_id,
            status: input.status ?? "not_started",
            confidence_rating: input.confidence_rating ?? 0,
            last_studied_at: null,
            next_revision_due_at: null,
            revision_count: 0,
          },
        ];
      });
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(["topic-progress", user?.id], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["topic-progress"] });
    },
  });
}
