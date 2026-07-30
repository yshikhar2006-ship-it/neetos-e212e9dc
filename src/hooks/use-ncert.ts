import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface NcertSection {
  id: string;
  topic_id: string;
  ncert_class: number;
  page_or_section_label: string;
  order_index: number;
  chapter_id: string;
  chapter_name: string;
  subject_id: string;
  topic_name: string;
}

export function useNcertSections() {
  return useQuery({
    queryKey: ["ncert-sections"],
    staleTime: 6 * 60 * 60 * 1000,
    queryFn: async (): Promise<NcertSection[]> => {
      const { data, error } = await supabase
        .from("ncert_sections")
        .select(
          "id, topic_id, ncert_class, page_or_section_label, order_index, topics!inner(name, chapter_id, chapters!inner(id, name, subject_id))",
        )
        .order("order_index");
      if (error) throw error;
      return (data ?? []).map((row) => {
        const topic = row.topics as unknown as {
          name: string;
          chapter_id: string;
          chapters: { id: string; name: string; subject_id: string };
        };
        return {
          id: row.id as string,
          topic_id: row.topic_id as string,
          ncert_class: row.ncert_class as number,
          page_or_section_label: row.page_or_section_label as string,
          order_index: row.order_index as number,
          topic_name: topic.name,
          chapter_id: topic.chapters.id,
          chapter_name: topic.chapters.name,
          subject_id: topic.chapters.subject_id,
        };
      });
    },
  });
}

export interface NcertProgressRow {
  id: string;
  ncert_section_id: string;
  is_read: boolean;
  read_at: string | null;
}

export function useNcertProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ncert-progress", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<NcertProgressRow[]> => {
      const { data, error } = await supabase
        .from("user_ncert_progress")
        .select("id, ncert_section_id, is_read, read_at")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as NcertProgressRow[];
    },
  });
}

export function useToggleNcertSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["ncert-progress", user?.id];

  return useMutation({
    mutationFn: async ({ sectionId, isRead }: { sectionId: string; isRead: boolean }) => {
      const { data, error } = await supabase
        .from("user_ncert_progress")
        .upsert(
          {
            user_id: user!.id,
            ncert_section_id: sectionId,
            is_read: isRead,
            read_at: isRead ? new Date().toISOString() : null,
          },
          { onConflict: "user_id,ncert_section_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as NcertProgressRow;
    },
    // Reading checklists must feel instant.
    onMutate: async ({ sectionId, isRead }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<NcertProgressRow[]>(key);
      qc.setQueryData<NcertProgressRow[]>(key, (old = []) => {
        const existing = old.find((r) => r.ncert_section_id === sectionId);
        if (existing) return old.map((r) => (r.ncert_section_id === sectionId ? { ...r, is_read: isRead } : r));
        return [...old, { id: `optimistic-${sectionId}`, ncert_section_id: sectionId, is_read: isRead, read_at: null }];
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["ncert-progress"] }),
  });
}
