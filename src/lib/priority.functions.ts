import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { rankTopics, type TopicInput } from "@/lib/priority.server";

/**
 * Recommendation engine entry point (Section 5.1).
 * Callable on demand (after a test submission, or from the dashboard) and
 * writes the ranked result to priority_scores — every consumer reads that table.
 */
export const computePriorityScores = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [topicsRes, progressRes, answersRes] = await Promise.all([
      supabase.from("topics").select("id, name, chapter_id, chapters!inner(id, name, subject_id, weightage_score)"),
      supabase
        .from("user_topic_progress")
        .select("topic_id, status, confidence_rating, last_studied_at, next_revision_due_at")
        .eq("user_id", userId),
      supabase.from("test_answers").select("is_correct, questions!inner(topic_id)").eq("user_id", userId),
    ]);

    if (topicsRes.error) throw topicsRes.error;
    if (progressRes.error) throw progressRes.error;
    if (answersRes.error) throw answersRes.error;

    const progressByTopic = new Map(
      (progressRes.data ?? []).map((p) => [p.topic_id as string, p]),
    );

    const stats = new Map<string, { attempts: number; correct: number }>();
    for (const row of answersRes.data ?? []) {
      const topicId = (row.questions as unknown as { topic_id: string | null })?.topic_id;
      if (!topicId) continue;
      const s = stats.get(topicId) ?? { attempts: 0, correct: 0 };
      s.attempts += 1;
      if (row.is_correct) s.correct += 1;
      stats.set(topicId, s);
    }

    const inputs: TopicInput[] = (topicsRes.data ?? []).map((t) => {
      const chapter = t.chapters as unknown as { id: string; name: string; subject_id: string; weightage_score: number };
      const p = progressByTopic.get(t.id as string);
      const s = stats.get(t.id as string) ?? { attempts: 0, correct: 0 };
      return {
        topic_id: t.id as string,
        subject_id: chapter.subject_id,
        chapter_id: chapter.id,
        topic_name: t.name as string,
        chapter_name: chapter.name,
        weightage: Number(chapter.weightage_score) || 1,
        confidence: Number(p?.confidence_rating ?? 0),
        status: (p?.status as string) ?? "not_started",
        last_studied_at: (p?.last_studied_at as string | null) ?? null,
        next_revision_due_at: (p?.next_revision_due_at as string | null) ?? null,
        attempts: s.attempts,
        correct: s.correct,
      };
    });

    // Keep the write bounded: only the meaningful head of the ranking is stored.
    const ranked = rankTopics(inputs).slice(0, 400);
    const computedAt = new Date().toISOString();
    const rows = ranked.map((r) => ({ ...r, user_id: userId, computed_at: computedAt }));

    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase
        .from("priority_scores")
        .upsert(rows.slice(i, i + 200), { onConflict: "user_id,topic_id" });
      if (error) throw error;
    }

    return { computed: rows.length, computed_at: computedAt };
  });
