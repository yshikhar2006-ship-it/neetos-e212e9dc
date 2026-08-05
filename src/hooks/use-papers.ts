import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  commitPaperAttempt,
  extractPaperPage,
  finalizePaperExtraction,
} from "@/lib/papers.functions";
import { NTA_SCHEME, type MarkingScheme } from "@/lib/papers/scheme";
import {
  DEFAULT_EDIT,
  perceptualHash,
  renderPage,
  type PendingPage,
} from "@/lib/papers/image-tools";

export type PaperStatus = "queued" | "processing" | "needs_review" | "ready" | "failed";
export type PaperSourceType = "pdf" | "images" | "camera";
export type CaptureMethod =
  | "manual"
  | "wrong_only"
  | "omr_scan"
  | "answer_sheet_scan"
  | "answer_key_import";

export interface PaperUpload {
  id: string;
  title: string;
  subject_id: string | null;
  coaching_institute: string | null;
  folder: string | null;
  source_type: PaperSourceType;
  status: PaperStatus;
  status_detail: string | null;
  page_count: number;
  marking_scheme: MarkingScheme;
  detected_language: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  total_time_seconds: number | null;
  processed_at: string | null;
  created_at: string;
}

export interface PaperPage {
  id: string;
  paper_id: string;
  page_number: number;
  storage_path: string;
  rotation: number;
  extraction_status: string;
  perceptual_hash: string | null;
}

export interface PaperQuestion {
  id: string;
  paper_id: string;
  page_id: string | null;
  position: number;
  question_text: string;
  options: string[];
  correct_option: number | null;
  detected_topic_id: string | null;
  detected_subject_id: string | null;
  confidence_score: number;
  field_confidence: Record<string, number>;
  needs_review: boolean;
  difficulty: string;
  marks: number | null;
  diagram_storage_path: string | null;
}

export interface PaperAnswer {
  id: string;
  paper_question_id: string;
  selected_option: number | null;
  marked_for_review: boolean;
  capture_method: CaptureMethod;
}

const BUCKET = "paper-pages";

function normalizeQuestion(row: Record<string, unknown>): PaperQuestion {
  return {
    ...(row as unknown as PaperQuestion),
    options: Array.isArray(row.options) ? (row.options as string[]) : [],
    field_confidence:
      row.field_confidence && typeof row.field_confidence === "object"
        ? (row.field_confidence as Record<string, number>)
        : {},
  };
}

export function usePapers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["papers", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paper_uploads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p) => ({
        ...p,
        marking_scheme: (p.marking_scheme ?? NTA_SCHEME) as MarkingScheme,
      })) as PaperUpload[];
    },
  });
}

export function usePaper(paperId: string | undefined) {
  return useQuery({
    queryKey: ["paper", paperId],
    enabled: Boolean(paperId),
    // While the vision pipeline runs, the row's status/detail is the progress bar.
    refetchInterval: (query) =>
      query.state.data && ["queued", "processing"].includes((query.state.data as PaperUpload).status)
        ? 2500
        : false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paper_uploads")
        .select("*")
        .eq("id", paperId!)
        .single();
      if (error) throw error;
      return {
        ...data,
        marking_scheme: (data.marking_scheme ?? NTA_SCHEME) as MarkingScheme,
      } as PaperUpload;
    },
  });
}

export function usePaperPages(paperId: string | undefined) {
  return useQuery({
    queryKey: ["paper-pages", paperId],
    enabled: Boolean(paperId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paper_pages")
        .select("*")
        .eq("paper_id", paperId!)
        .order("page_number");
      if (error) throw error;
      return (data ?? []) as PaperPage[];
    },
  });
}

export function usePaperQuestions(paperId: string | undefined) {
  return useQuery({
    queryKey: ["paper-questions", paperId],
    enabled: Boolean(paperId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paper_questions")
        .select("*")
        .eq("paper_id", paperId!)
        .order("position");
      if (error) throw error;
      return (data ?? []).map((r) => normalizeQuestion(r as Record<string, unknown>));
    },
  });
}

export function usePaperAnswers(paperId: string | undefined) {
  return useQuery({
    queryKey: ["paper-answers", paperId],
    enabled: Boolean(paperId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paper_answers")
        .select("id, paper_question_id, selected_option, marked_for_review, capture_method")
        .eq("paper_id", paperId!);
      if (error) throw error;
      return (data ?? []) as PaperAnswer[];
    },
  });
}

/** Signed URLs for private page images, cached briefly. */
export function usePageUrls(pages: PaperPage[] | undefined) {
  const paths = (pages ?? []).map((p) => p.storage_path);
  return useQuery({
    queryKey: ["paper-page-urls", paths],
    enabled: paths.length > 0,
    staleTime: 45 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
      }
      return map;
    },
  });
}

export interface CreatePaperInput {
  title: string;
  subjectId: string | null;
  institute: string | null;
  folder: string | null;
  sourceType: PaperSourceType;
  scheme: MarkingScheme;
  pages: PendingPage[];
}

/**
 * Uploads every prepared page, then creates the paper row. Pages are
 * compressed in the browser first so Storage never holds a 6 MB phone capture.
 */
export function useCreatePaper() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  const mutation = useMutation({
    mutationFn: async (input: CreatePaperInput) => {
      if (!user) throw new Error("You need to be signed in to upload a paper.");
      if (input.pages.length === 0) throw new Error("Add at least one page first.");

      setProgress({ done: 0, total: input.pages.length });

      const { data: paper, error: paperError } = await supabase
        .from("paper_uploads")
        .insert({
          user_id: user.id,
          title: input.title,
          subject_id: input.subjectId,
          coaching_institute: input.institute,
          folder: input.folder,
          source_type: input.sourceType,
          page_count: input.pages.length,
          marking_scheme: input.scheme as unknown as Record<string, number>,
          status: "queued",
          status_detail: "Uploading pages",
        })
        .select("id")
        .single();
      if (paperError) throw paperError;

      const paperId = paper.id as string;
      const pageRows: {
        paper_id: string;
        user_id: string;
        page_number: number;
        storage_path: string;
        rotation: number;
        perceptual_hash: string | null;
      }[] = [];

      for (let i = 0; i < input.pages.length; i++) {
        const page = input.pages[i];
        const blob = await renderPage(page.file, page.edit ?? DEFAULT_EDIT);
        const path = `${user.id}/${paperId}/${String(i + 1).padStart(3, "0")}.jpg`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: "image/jpeg", upsert: true });
        if (upErr) throw upErr;

        pageRows.push({
          paper_id: paperId,
          user_id: user.id,
          page_number: i + 1,
          storage_path: path,
          rotation: page.edit?.rotation ?? 0,
          perceptual_hash: page.perceptualHash ?? (await perceptualHash(page.file)) || null,
        });
        setProgress({ done: i + 1, total: input.pages.length });
      }

      const { error: pagesError } = await supabase.from("paper_pages").insert(pageRows);
      if (pagesError) throw pagesError;

      return paperId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["papers"] });
    },
  });

  return { ...mutation, progress };
}

/**
 * Drives the per-page vision pipeline from the client so a failed page costs
 * only that page. Retry re-runs exactly the pages that failed.
 */
export function useProcessPaper(paperId: string | undefined) {
  const qc = useQueryClient();
  const extract = useServerFn(extractPaperPage);
  const finalize = useServerFn(finalizePaperExtraction);
  const [state, setState] = useState<{
    running: boolean;
    done: number;
    total: number;
    failed: string[];
    label: string;
  }>({ running: false, done: 0, total: 0, failed: [], label: "" });

  const run = useCallback(
    async (pages: PaperPage[], opts?: { force?: boolean }) => {
      if (!paperId || pages.length === 0) return;
      setState({ running: true, done: 0, total: pages.length, failed: [], label: "Reading page 1" });
      const failed: string[] = [];

      for (let i = 0; i < pages.length; i++) {
        setState((s) => ({ ...s, label: `Reading page ${pages[i].page_number}`, done: i }));
        try {
          await extract({ data: { paperId, pageId: pages[i].id, force: opts?.force ?? false } });
        } catch {
          failed.push(pages[i].id);
        }
        setState((s) => ({ ...s, done: i + 1, failed: [...failed] }));
      }

      setState((s) => ({ ...s, label: "Putting the paper together" }));
      const result = await finalize({ data: { paperId } });

      setState({ running: false, done: pages.length, total: pages.length, failed, label: "" });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["paper", paperId] }),
        qc.invalidateQueries({ queryKey: ["paper-pages", paperId] }),
        qc.invalidateQueries({ queryKey: ["paper-questions", paperId] }),
        qc.invalidateQueries({ queryKey: ["papers"] }),
      ]);
      return result;
    },
    [paperId, extract, finalize, qc],
  );

  return { run, ...state };
}

/** Review fixes: text, options, correct answer, topic, confirm. */
export function useUpdatePaperQuestion(paperId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<
        Pick<
          PaperQuestion,
          "question_text" | "options" | "correct_option" | "detected_topic_id" | "needs_review" | "difficulty"
        >
      >;
    }) => {
      const { error } = await supabase
        .from("paper_questions")
        .update(patch as unknown as Record<string, unknown>)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paper-questions", paperId] });
      qc.invalidateQueries({ queryKey: ["paper", paperId] });
    },
  });
}

export function useSavePaperAnswer(paperId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      questionId: string;
      selected: number | null;
      marked?: boolean;
      method?: CaptureMethod;
    }) => {
      if (!user || !paperId) throw new Error("Not ready");
      const { error } = await supabase.from("paper_answers").upsert(
        {
          user_id: user.id,
          paper_id: paperId,
          paper_question_id: input.questionId,
          selected_option: input.selected,
          marked_for_review: input.marked ?? false,
          capture_method: input.method ?? "manual",
        },
        { onConflict: "paper_id,paper_question_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paper-answers", paperId] }),
  });
}

/**
 * Wrong-only capture: the fastest real-world path. The student names the
 * questions they got wrong; everything else is recorded as correct.
 */
export function useCaptureWrongOnly(paperId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      questions,
      wrongPositions,
      unattemptedPositions,
    }: {
      questions: PaperQuestion[];
      wrongPositions: number[];
      unattemptedPositions: number[];
    }) => {
      if (!user || !paperId) throw new Error("Not ready");
      const wrong = new Set(wrongPositions);
      const skipped = new Set(unattemptedPositions);

      const rows = questions
        .filter((q) => q.correct_option !== null)
        .map((q) => {
          let selected: number | null = q.correct_option!;
          if (skipped.has(q.position)) selected = null;
          else if (wrong.has(q.position)) {
            // Any option other than the key marks it wrong without inventing
            // a specific claim about what the student actually chose.
            selected = q.correct_option === 0 ? 1 : 0;
          }
          return {
            user_id: user.id,
            paper_id: paperId,
            paper_question_id: q.id,
            selected_option: selected,
            marked_for_review: false,
            capture_method: "wrong_only" as CaptureMethod,
          };
        });

      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await supabase
          .from("paper_answers")
          .upsert(rows.slice(i, i + 200), { onConflict: "paper_id,paper_question_id" });
        if (error) throw error;
      }
      return rows.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paper-answers", paperId] }),
  });
}

/** Answer-key import: "1-A 2-C 3-B" or "1 A, 2 C" or a bare "ACBD..." string. */
export function parseAnswerKey(raw: string, total: number) {
  const letters = ["A", "B", "C", "D", "E"];
  const out: { position: number; correct_option: number }[] = [];
  const pairRegex = /(\d{1,3})\s*[-.:)\s]\s*([A-Ea-e1-5])/g;
  let match: RegExpExecArray | null;
  while ((match = pairRegex.exec(raw)) !== null) {
    const position = Number(match[1]);
    const token = match[2].toUpperCase();
    const index = letters.indexOf(token);
    const option = index >= 0 ? index : Number(token) - 1;
    if (position >= 1 && position <= total && option >= 0 && option <= 4) {
      out.push({ position, correct_option: option });
    }
  }
  if (out.length === 0) {
    const bare = raw.replace(/[^A-Ea-e]/g, "").toUpperCase();
    for (let i = 0; i < Math.min(bare.length, total); i++) {
      out.push({ position: i + 1, correct_option: letters.indexOf(bare[i]) });
    }
  }
  return out.filter((o) => o.correct_option >= 0);
}

export function useImportAnswerKey(paperId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      questions,
      key,
    }: {
      questions: PaperQuestion[];
      key: { position: number; correct_option: number }[];
    }) => {
      const byPosition = new Map(questions.map((q) => [q.position, q]));
      let applied = 0;
      for (const entry of key) {
        const q = byPosition.get(entry.position);
        if (!q) continue;
        const { error } = await supabase
          .from("paper_questions")
          .update({ correct_option: entry.correct_option })
          .eq("id", q.id);
        if (error) throw error;
        applied += 1;
      }
      return applied;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paper-questions", paperId] });
    },
  });
}

export function useCommitPaper(paperId: string | undefined) {
  const qc = useQueryClient();
  const commit = useServerFn(commitPaperAttempt);
  return useMutation({
    mutationFn: async (totalTimeSeconds: number) => {
      if (!paperId) throw new Error("Not ready");
      return commit({ data: { paperId, totalTimeSeconds } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["papers"] });
      qc.invalidateQueries({ queryKey: ["paper", paperId] });
      qc.invalidateQueries({ queryKey: ["test-attempts"] });
      qc.invalidateQueries({ queryKey: ["error-log"] });
      qc.invalidateQueries({ queryKey: ["habit-logs"] });
      qc.invalidateQueries({ queryKey: ["topic-progress"] });
    },
  });
}

export function usePaperMutations() {
  const qc = useQueryClient();

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("paper_uploads").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["papers"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("paper_uploads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["papers"] }),
  });

  return { update, remove };
}
