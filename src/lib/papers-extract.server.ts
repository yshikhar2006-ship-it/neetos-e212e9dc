import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyTopics, extractPage, needsReview, type PageExtraction, type TopicCandidate } from "@/lib/papers.server";

type Client = SupabaseClient<any, "public", any>;

/**
 * Per-page extraction. Retries are per-page and per-step, never "start the
 * whole paper over": a single failed page in a 20-page upload must never cost
 * the other 19 their completed work. A page that already succeeded is served
 * from its cached extraction and never re-run through the vision pipeline.
 */
export async function extractOnePage(
  supabase: Client,
  apiKey: string,
  paperId: string,
  pageId: string,
  force: boolean,
) {
  const [paperRes, pageRes] = await Promise.all([
    supabase.from("paper_uploads").select("id, title, subject_id, page_count").eq("id", paperId).single(),
    supabase.from("paper_pages").select("*").eq("id", pageId).single(),
  ]);
  if (paperRes.error) throw paperRes.error;
  if (pageRes.error) throw pageRes.error;

  const paper = paperRes.data as { subject_id: string | null; page_count: number };
  const page = pageRes.data as {
    id: string;
    page_number: number;
    storage_path: string;
    extraction_status: string;
    extraction_cache: unknown;
  };

  await supabase
    .from("paper_uploads")
    .update({ status: "processing", status_detail: `Reading page ${page.page_number} of ${paper.page_count}` })
    .eq("id", paperId);

  let extraction: PageExtraction;
  let tier = "cache";

  if (!force && page.extraction_status === "done" && page.extraction_cache) {
    extraction = page.extraction_cache as PageExtraction;
  } else {
    const { data: signed, error: signError } = await supabase.storage
      .from("paper-pages")
      .createSignedUrl(page.storage_path, 3600);
    if (signError || !signed?.signedUrl) throw new Error("Could not open this page image");

    let subjectName: string | null = null;
    if (paper.subject_id) {
      const { data: subject } = await supabase
        .from("subjects")
        .select("name")
        .eq("id", paper.subject_id)
        .maybeSingle();
      subjectName = (subject?.name as string) ?? null;
    }

    try {
      const run = await extractPage(apiKey, signed.signedUrl, {
        subjectName,
        pageNumber: page.page_number,
        pageCount: paper.page_count,
      });
      extraction = run.extraction;
      tier = run.tier;
    } catch (err) {
      const code = err instanceof Error ? err.message : "VISION_FAILED";
      await supabase.from("paper_pages").update({ extraction_status: "failed" }).eq("id", pageId);
      await supabase
        .from("paper_uploads")
        .update({ status_detail: `Page ${page.page_number} couldn't be read — you can retry just that page` })
        .eq("id", paperId);
      throw new Error(code);
    }

    await supabase
      .from("paper_pages")
      .update({ extraction_status: "done", extraction_cache: extraction as unknown as Record<string, unknown> })
      .eq("id", pageId);
  }

  // Classification against the real curriculum tree, scoped to the paper's
  // declared subject when it has one.
  let candidates: TopicCandidate[] = [];
  const topicQuery = supabase
    .from("topics")
    .select("id, name, chapters!inner(name, subject_id)")
    .limit(1200);
  const { data: topicRows } = paper.subject_id
    ? await topicQuery.eq("chapters.subject_id", paper.subject_id)
    : await topicQuery;

  candidates = (topicRows ?? []).map((t) => {
    const chapter = t.chapters as unknown as { name: string; subject_id: string };
    return {
      id: t.id as string,
      name: t.name as string,
      chapter_name: chapter.name,
      subject_id: chapter.subject_id,
    };
  });

  let matches: { topic_id: string | null; confidence: number }[] = extraction.questions.map(() => ({
    topic_id: null,
    confidence: 0,
  }));
  try {
    matches = await classifyTopics(
      apiKey,
      extraction.questions.map((q) => ({ question_text: q.question_text, options: q.options })),
      candidates,
    );
  } catch (err) {
    console.error("[paper-extract] topic classification failed; questions flagged for review", err);
  }

  const subjectByTopic = new Map(candidates.map((c) => [c.id, c.subject_id]));
  const keyByPosition = new Map(extraction.answer_key.map((k) => [k.position, k.correct_option]));

  // Replace this page's questions so a retry is idempotent.
  await supabase.from("paper_questions").delete().eq("paper_id", paperId).eq("page_id", pageId);

  const { data: maxRow } = await supabase
    .from("paper_questions")
    .select("position")
    .eq("paper_id", paperId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const offset = Number(maxRow?.position ?? 0);

  const rows = extraction.questions.map((q, i) => {
    const match = matches[i] ?? { topic_id: null, confidence: 0 };
    const fields = { ...q.field_confidence, topic: match.confidence };
    return {
      paper_id: paperId,
      page_id: pageId,
      position: offset + i + 1,
      question_text: q.question_text,
      options: q.options,
      correct_option: q.correct_option ?? keyByPosition.get(q.position) ?? null,
      detected_topic_id: match.topic_id,
      detected_subject_id: match.topic_id ? (subjectByTopic.get(match.topic_id) ?? paper.subject_id) : paper.subject_id,
      confidence_score: q.confidence,
      field_confidence: fields,
      needs_review: needsReview(fields),
      diagram_storage_path: q.has_diagram ? page.storage_path : null,
      difficulty: q.difficulty,
      marks: q.marks,
    };
  });

  if (rows.length) {
    const { error } = await supabase.from("paper_questions").insert(rows);
    if (error) throw error;
  }

  return {
    page_number: page.page_number,
    questions: rows.length,
    needs_review: rows.filter((r) => r.needs_review).length,
    tier,
    language: extraction.language,
  };
}

/**
 * Renumbers questions into true paper order and decides whether the student has
 * to review anything before the paper is usable.
 */
export async function finalizePaper(supabase: Client, paperId: string) {
  const { data: pages } = await supabase
    .from("paper_pages")
    .select("id, page_number, extraction_status, extraction_cache")
    .eq("paper_id", paperId)
    .order("page_number");

  const pageOrder = new Map((pages ?? []).map((p) => [p.id as string, p.page_number as number]));
  const failed = (pages ?? []).filter((p) => p.extraction_status === "failed").length;

  const { data: questions } = await supabase
    .from("paper_questions")
    .select("id, page_id, position, needs_review")
    .eq("paper_id", paperId);

  const ordered = [...(questions ?? [])].sort((a, b) => {
    const pa = pageOrder.get(a.page_id as string) ?? 999;
    const pb = pageOrder.get(b.page_id as string) ?? 999;
    return pa - pb || (a.position as number) - (b.position as number);
  });

  for (let i = 0; i < ordered.length; i++) {
    if ((ordered[i].position as number) !== i + 1) {
      await supabase.from("paper_questions").update({ position: i + 1 }).eq("id", ordered[i].id as string);
    }
  }

  const reviewCount = ordered.filter((q) => q.needs_review).length;
  const language =
    ((pages ?? []).map((p) => (p.extraction_cache as { language?: string } | null)?.language).find(Boolean) as
      | string
      | undefined) ?? null;

  const status = ordered.length === 0 && failed ? "failed" : reviewCount > 0 ? "needs_review" : "ready";
  const detail =
    status === "failed"
      ? "We couldn't read this paper — retry the failed pages"
      : reviewCount > 0
        ? `${reviewCount} question${reviewCount === 1 ? "" : "s"} need your confirmation`
        : "Ready to answer";

  await supabase
    .from("paper_uploads")
    .update({
      status,
      status_detail: detail,
      detected_language: language,
      processed_at: new Date().toISOString(),
    })
    .eq("id", paperId);

  return { questions: ordered.length, needs_review: reviewCount, failed_pages: failed, status };
}
