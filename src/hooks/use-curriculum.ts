import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Subject {
  id: string;
  name: string;
  slug: string;
  color_token: string;
  icon: string | null;
  sort_order: number;
}

export interface Chapter {
  id: string;
  subject_id: string;
  unit_id: string;
  name: string;
  slug: string;
  class_level: number;
  weightage_score: number;
  avg_questions: number;
  sort_order: number;
}

export interface Topic {
  id: string;
  chapter_id: string;
  name: string;
  slug: string;
  ncert_reference: string | null;
  difficulty: string;
  estimated_minutes: number;
  sort_order: number;
}

const HOUR = 1000 * 60 * 60;

/** Curriculum tables change rarely and are read constantly — cache them hard. */
export function useSubjects() {
  return useQuery({
    queryKey: ["subjects"],
    staleTime: 12 * HOUR,
    gcTime: 24 * HOUR,
    queryFn: async (): Promise<Subject[]> => {
      const { data, error } = await supabase.from("subjects").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Subject[];
    },
  });
}

export function useChapters(subjectId?: string) {
  return useQuery({
    queryKey: ["chapters", subjectId ?? "all"],
    staleTime: 12 * HOUR,
    gcTime: 24 * HOUR,
    queryFn: async (): Promise<Chapter[]> => {
      let q = supabase.from("chapters").select("*").order("sort_order");
      if (subjectId) q = q.eq("subject_id", subjectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Chapter[];
    },
  });
}

export function useTopics(chapterId?: string) {
  return useQuery({
    queryKey: ["topics", chapterId ?? "all"],
    enabled: chapterId !== undefined,
    staleTime: 12 * HOUR,
    gcTime: 24 * HOUR,
    queryFn: async (): Promise<Topic[]> => {
      let q = supabase.from("topics").select("*").order("sort_order");
      if (chapterId) q = q.eq("chapter_id", chapterId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Topic[];
    },
  });
}

export interface TopicSubjectRef {
  id: string;
  subject_id: string;
}

/** Flat topic -> subject map, used to roll progress rows up to subject level. */
export function useTopicSubjectMap() {
  return useQuery({
    queryKey: ["topic-subject-map"],
    staleTime: HOUR,
    queryFn: async (): Promise<TopicSubjectRef[]> => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, chapters!inner(subject_id)");
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id as string,
        subject_id: (row.chapters as unknown as { subject_id: string }).subject_id,
      }));
    },
  });
}
