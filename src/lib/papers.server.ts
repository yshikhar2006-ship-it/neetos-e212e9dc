/**
 * Server-only vision pipeline for offline paper extraction.
 *
 * Classic character-level OCR is the wrong tool for NEET papers — chemical
 * structures, physics diagrams and mathematical notation appear constantly and
 * template OCR flattens or drops all three. Everything here is a staged,
 * vision-language pass instead, with per-field confidence so the review UI can
 * ask the student about one field rather than a whole question.
 *
 * Providers sit behind this module only: swapping the vision provider is a
 * change here and nowhere else — no schema change, no UI change.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

/** Tiered routing: clean single-column pages must not pay for the heavy pass. */
export const MODEL_TIERS = {
  fast: "google/gemini-3.6-flash",
  heavy: "google/gemini-3.6-pro",
} as const;

export type ModelTier = keyof typeof MODEL_TIERS;

export interface FieldConfidence {
  text: number;
  options: number;
  difficulty: number;
  topic?: number;
}

export interface ExtractedQuestion {
  position: number;
  question_text: string;
  options: string[];
  correct_option: number | null;
  difficulty: "easy" | "medium" | "hard";
  marks: number | null;
  latex: string | null;
  has_diagram: boolean;
  confidence: number;
  field_confidence: FieldConfidence;
}

export interface PageExtraction {
  quality: "clean" | "dense" | "poor";
  language: string;
  section_name: string | null;
  negative_marking: string | null;
  answer_key: { position: number; correct_option: number }[];
  questions: ExtractedQuestion[];
}

const LAYOUT_AND_CONTENT_PROMPT = `You read photographed or scanned Indian competitive-exam question papers (NEET, coaching-institute daily/weekly tests).

Work in two stages internally:
1. LAYOUT: identify the page structure first — header/footer, section names, question blocks, option blocks, diagrams, tables, printed answer keys. Respect two-column layouts and inset figures so questions are never read out of order.
2. CONTENT: extract each question block.

Rules that matter:
- Preserve mathematical, physics and chemistry notation as LaTeX inside $...$ rather than flattening it to plain text. "H2SO4" must become $H_2SO_4$; a fraction must not become "a/b" if it is rendered as a fraction.
- If a question depends on a diagram or figure, set has_diagram true and still transcribe every readable label. Never invent a description of a figure you cannot see clearly.
- Options are usually four but can be more or fewer. Transcribe them in printed order, without the (a)/(1) prefix.
- correct_option is a 0-based index and must be null unless the page itself prints the answer (a printed key, a circled official answer, a highlighted correct option). Never guess it from your own knowledge of the subject.
- If the page contains a printed answer key table, also fill answer_key with { position, correct_option } entries (correct_option 0-based).
- difficulty is your read of the question's demand: easy | medium | hard.
- Confidence is 0..1 and must be honest and per-field. Low confidence on text is different from low confidence on difficulty. If a page is blurry, cropped or in shadow, say so with low confidence rather than producing confident-looking guesses.
- language: the detected language of the page ("en", "hi", "en+hi", etc).

Return STRICT JSON only, no prose, no markdown fence:
{"quality":"clean|dense|poor","language":"en","section_name":null,"negative_marking":null,"answer_key":[],"questions":[{"position":1,"question_text":"","options":[""],"correct_option":null,"difficulty":"medium","marks":null,"latex":null,"has_diagram":false,"confidence":0.0,"field_confidence":{"text":0.0,"options":0.0,"difficulty":0.0}}]}`;

function parseJsonBlock(raw: string): unknown {
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("The vision model did not return readable JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callGateway(
  apiKey: string,
  model: string,
  messages: unknown[],
): Promise<string> {
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({ model, messages, temperature: 0.1 }),
  });

  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (res.status === 402) throw new Error("CREDITS_EXHAUSTED");
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // Log provider detail server-side only; never surface it to the student.
    console.error("[paper-vision] gateway error", res.status, detail.slice(0, 500));
    throw new Error("VISION_FAILED");
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("VISION_FAILED");
  return content;
}

function normalizeQuestions(raw: unknown): PageExtraction {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const rawQuestions = Array.isArray(obj.questions) ? obj.questions : [];

  const questions: ExtractedQuestion[] = rawQuestions.map((q, i) => {
    const item = (q ?? {}) as Record<string, unknown>;
    const fc = (item.field_confidence ?? {}) as Record<string, unknown>;
    const clamp = (v: unknown, fallback = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;
    };
    const options = Array.isArray(item.options) ? item.options.map((o) => String(o ?? "")) : [];
    const difficultyRaw = String(item.difficulty ?? "medium").toLowerCase();
    const difficulty = (["easy", "medium", "hard"].includes(difficultyRaw) ? difficultyRaw : "medium") as
      | "easy"
      | "medium"
      | "hard";
    const correct = Number(item.correct_option);

    return {
      position: Number.isFinite(Number(item.position)) ? Number(item.position) : i + 1,
      question_text: String(item.question_text ?? "").trim(),
      options,
      correct_option: Number.isFinite(correct) && correct >= 0 && correct < options.length ? correct : null,
      difficulty,
      marks: Number.isFinite(Number(item.marks)) ? Number(item.marks) : null,
      latex: item.latex ? String(item.latex) : null,
      has_diagram: Boolean(item.has_diagram),
      confidence: clamp(item.confidence, 0.5),
      field_confidence: {
        text: clamp(fc.text, clamp(item.confidence, 0.5)),
        options: clamp(fc.options, clamp(item.confidence, 0.5)),
        difficulty: clamp(fc.difficulty, 0.4),
      },
    };
  });

  const qualityRaw = String(obj.quality ?? "clean");
  const answerKeyRaw = Array.isArray(obj.answer_key) ? obj.answer_key : [];

  return {
    quality: (["clean", "dense", "poor"].includes(qualityRaw) ? qualityRaw : "clean") as PageExtraction["quality"],
    language: String(obj.language ?? "en"),
    section_name: obj.section_name ? String(obj.section_name) : null,
    negative_marking: obj.negative_marking ? String(obj.negative_marking) : null,
    answer_key: answerKeyRaw
      .map((k) => {
        const e = (k ?? {}) as Record<string, unknown>;
        return { position: Number(e.position), correct_option: Number(e.correct_option) };
      })
      .filter((k) => Number.isFinite(k.position) && Number.isFinite(k.correct_option)),
    questions,
  };
}

/** Average of the fields we actually gate the review step on. */
function pageConfidence(extraction: PageExtraction) {
  if (extraction.questions.length === 0) return 0;
  const sum = extraction.questions.reduce(
    (s, q) => s + Math.min(q.field_confidence.text, q.field_confidence.options),
    0,
  );
  return sum / extraction.questions.length;
}

/**
 * Stage 1+2 for a single page, with tiered routing: every page starts on the
 * fast pass and only escalates when the page reports dense diagrams / poor
 * scan quality, or comes back with low first-pass confidence.
 */
export async function extractPage(
  apiKey: string,
  imageUrl: string,
  context: { subjectName?: string | null; pageNumber: number; pageCount: number },
): Promise<{ extraction: PageExtraction; tier: ModelTier }> {
  const messages = [
    { role: "system", content: LAYOUT_AND_CONTENT_PROMPT },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Page ${context.pageNumber} of ${context.pageCount}.${
            context.subjectName ? ` The student says this paper is ${context.subjectName}.` : ""
          } Extract every question on this page.`,
        },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  ];

  const first = normalizeQuestions(parseJsonBlock(await callGateway(apiKey, MODEL_TIERS.fast, messages)));
  const needsEscalation =
    first.quality !== "clean" ||
    pageConfidence(first) < 0.75 ||
    first.questions.some((q) => q.has_diagram && q.field_confidence.text < 0.85);

  if (!needsEscalation) return { extraction: first, tier: "fast" };

  try {
    const second = normalizeQuestions(parseJsonBlock(await callGateway(apiKey, MODEL_TIERS.heavy, messages)));
    // Keep whichever pass actually read the page better.
    return pageConfidence(second) >= pageConfidence(first)
      ? { extraction: second, tier: "heavy" }
      : { extraction: first, tier: "fast" };
  } catch (err) {
    console.error("[paper-vision] escalation failed, keeping fast pass", err);
    return { extraction: first, tier: "fast" };
  }
}

export interface TopicCandidate {
  id: string;
  name: string;
  chapter_name: string;
  subject_id: string;
}

export interface TopicMatch {
  index: number;
  topic_id: string | null;
  confidence: number;
}

/**
 * Classifies questions against the real curriculum tree — never a freeform
 * guess. The model may only pick an id from the candidate list, or decline.
 */
export async function classifyTopics(
  apiKey: string,
  questions: { question_text: string; options: string[] }[],
  candidates: TopicCandidate[],
): Promise<TopicMatch[]> {
  if (questions.length === 0 || candidates.length === 0) {
    return questions.map((_, index) => ({ index, topic_id: null, confidence: 0 }));
  }

  const catalogue = candidates
    .map((c) => `${c.id} :: ${c.chapter_name} > ${c.name}`)
    .join("\n");

  const list = questions
    .map((q, i) => `[${i}] ${q.question_text.slice(0, 600)}\nOptions: ${q.options.join(" | ").slice(0, 300)}`)
    .join("\n\n");

  const content = await callGateway(apiKey, MODEL_TIERS.fast, [
    {
      role: "system",
      content: `You map exam questions onto an existing NEET curriculum tree.
You may ONLY return topic ids that appear verbatim in the candidate list. If nothing fits, return null for that question — a null is far better than a wrong topic, because a wrong topic corrupts the student's weak-area analytics.
Confidence is 0..1. Return STRICT JSON only: {"matches":[{"index":0,"topic_id":"uuid-or-null","confidence":0.0}]}`,
    },
    { role: "user", content: `Candidate topics:\n${catalogue}\n\nQuestions:\n${list}` },
  ]);

  const parsed = parseJsonBlock(content) as { matches?: unknown };
  const valid = new Set(candidates.map((c) => c.id));
  const raw = Array.isArray(parsed.matches) ? parsed.matches : [];

  const byIndex = new Map<number, TopicMatch>();
  for (const m of raw) {
    const e = (m ?? {}) as Record<string, unknown>;
    const index = Number(e.index);
    if (!Number.isFinite(index)) continue;
    const id = e.topic_id ? String(e.topic_id) : "";
    const confidence = Number(e.confidence);
    byIndex.set(index, {
      index,
      topic_id: valid.has(id) ? id : null,
      confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0,
    });
  }

  return questions.map((_, index) => byIndex.get(index) ?? { index, topic_id: null, confidence: 0 });
}

/** A question is only usable unreviewed when text, options and topic all landed. */
export const REVIEW_THRESHOLD = 0.8;
export const TOPIC_REVIEW_THRESHOLD = 0.6;

export function needsReview(fields: FieldConfidence) {
  return (
    fields.text < REVIEW_THRESHOLD ||
    fields.options < REVIEW_THRESHOLD ||
    (fields.topic ?? 0) < TOPIC_REVIEW_THRESHOLD
  );
}
