import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/* ---------------------------------- Notes --------------------------------- */

export interface Note {
  id: string;
  title: string;
  content: { text?: string } | null;
  subject_id: string | null;
  topic_id: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function useNotes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notes", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Note[]> => {
      const { data, error } = await supabase
        .from("notes")
        .select("id, title, content, subject_id, topic_id, is_pinned, created_at, updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Note[];
    },
  });
}

export function useSaveNote() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      title: string;
      text: string;
      subject_id?: string | null;
      topic_id?: string | null;
      is_pinned?: boolean;
    }) => {
      const payload = {
        user_id: user!.id,
        title: input.title,
        content: { text: input.text },
        subject_id: input.subject_id ?? null,
        topic_id: input.topic_id ?? null,
        is_pinned: input.is_pinned ?? false,
        updated_at: new Date().toISOString(),
      };
      const query = input.id
        ? supabase.from("notes").update(payload).eq("id", input.id).select().single()
        : supabase.from("notes").insert(payload).select().single();
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Note;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}

/* -------------------------------- Bookmarks ------------------------------- */

export interface Bookmark {
  id: string;
  label: string;
  resource_type: string;
  url: string | null;
  topic_id: string | null;
  created_at: string;
}

export function useBookmarks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["bookmarks", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Bookmark[]> => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("id, label, resource_type, url, topic_id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Bookmark[];
    },
  });
}

export function useCreateBookmark() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { label: string; resource_type: string; url?: string | null; topic_id?: string | null }) => {
      const { data, error } = await supabase
        .from("bookmarks")
        .insert({
          user_id: user!.id,
          label: input.label,
          resource_type: input.resource_type,
          url: input.url ?? null,
          topic_id: input.topic_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Bookmark;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmarks"] }),
  });
}

export function useDeleteBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookmarks").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmarks"] }),
  });
}

/* ------------------------------ Doubt journal ----------------------------- */

export type DoubtStatus = "open" | "resolved";

export interface Doubt {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  topic_id: string | null;
  resolved_at: string | null;
  created_at: string;
}

export function useDoubts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["doubts", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Doubt[]> => {
      const { data, error } = await supabase
        .from("doubt_journal")
        .select("id, question, answer, status, topic_id, resolved_at, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Doubt[];
    },
  });
}

export function useCreateDoubt() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { question: string; topic_id?: string | null }) => {
      const { data, error } = await supabase
        .from("doubt_journal")
        .insert({ user_id: user!.id, question: input.question, topic_id: input.topic_id ?? null, status: "open" })
        .select()
        .single();
      if (error) throw error;
      return data as Doubt;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doubts"] }),
  });
}

export function useUpdateDoubt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; answer?: string | null; status?: DoubtStatus }) => {
      const { data, error } = await supabase
        .from("doubt_journal")
        .update({
          ...patch,
          resolved_at: patch.status === "resolved" ? new Date().toISOString() : patch.status ? null : undefined,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Doubt;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doubts"] }),
  });
}

export function useDeleteDoubt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("doubt_journal").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doubts"] }),
  });
}
