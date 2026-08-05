import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  Images,
  Loader2,
  RefreshCw,
  ScanLine,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  parseAnswerKey,
  useCaptureWrongOnly,
  useCommitPaper,
  useImportAnswerKey,
  usePageUrls,
  usePaper,
  usePaperAnswers,
  usePaperPages,
  usePaperQuestions,
  useProcessPaper,
  useSavePaperAnswer,
  useUpdatePaperQuestion,
  type PaperQuestion,
} from "@/hooks/use-papers";
import { schemeLabel, scorePaper } from "@/lib/papers/scheme";

export const Route = createFileRoute("/_authenticated/papers/$paperId")({
  head: () => ({
    meta: [
      { title: "Paper workspace — NEET OS" },
      {
        name: "description",
        content:
          "Review the questions read from your offline paper, capture your answers and score it into your analytics.",
      },
      { property: "og:title", content: "Paper workspace — NEET OS" },
      {
        property: "og:description",
        content: "Review, answer and score an uploaded offline test paper.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaperWorkspace,
});

const LETTERS = ["A", "B", "C", "D", "E"];

function PaperWorkspace() {
  const { paperId } = Route.useParams();
  const navigate = useNavigate();

  const { data: paper, isLoading } = usePaper(paperId);
  const { data: pages = [] } = usePaperPages(paperId);
  const { data: questions = [] } = usePaperQuestions(paperId);
  const { data: answers = [] } = usePaperAnswers(paperId);
  const { data: pageUrls = {} } = usePageUrls(pages);

  const process = useProcessPaper(paperId);
  const updateQuestion = useUpdatePaperQuestion(paperId);
  const saveAnswer = useSavePaperAnswer(paperId);
  const wrongOnly = useCaptureWrongOnly(paperId);
  const importKey = useImportAnswerKey(paperId);
  const commit = useCommitPaper(paperId);

  const [tab, setTab] = useState("review");
  const [minutes, setMinutes] = useState(60);
  const [wrongInput, setWrongInput] = useState("");
  const [skippedInput, setSkippedInput] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const autoRan = useRef(false);

  // A queued paper has pages in Storage but nothing read yet — start on open,
  // exactly once per mount, so the student never has to press "process".
  useEffect(() => {
    if (autoRan.current) return;
    if (!paper || pages.length === 0) return;
    if (paper.status !== "queued") return;
    autoRan.current = true;
    void process.run(pages).catch(() => toast.error("Reading this paper failed. You can retry below."));
  }, [paper, pages, process]);

  const answerByQuestion = useMemo(
    () => new Map(answers.map((a) => [a.paper_question_id, a])),
    [answers],
  );

  const needingReview = questions.filter((q) => q.needs_review);
  const withKey = questions.filter((q) => q.correct_option !== null);
  const answered = questions.filter(
    (q) => (answerByQuestion.get(q.id)?.selected_option ?? null) !== null,
  ).length;

  const preview = useMemo(
    () =>
      scorePaper(
        questions.map((q) => ({
          selected_option: answerByQuestion.get(q.id)?.selected_option ?? null,
          correct_option: q.correct_option,
        })),
        paper?.marking_scheme ?? { correct: 4, incorrect: -1, unattempted: 0 },
      ),
    [questions, answerByQuestion, paper?.marking_scheme],
  );

  const failedPages = pages.filter((p) => p.extraction_status === "failed");

  if (isLoading || !paper) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" aria-hidden />
      </div>
    );
  }

  const parsePositions = (raw: string) =>
    raw
      .split(/[^0-9]+/)
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n > 0);

  return (
    <div>
      <PageHeader
        title={paper.title}
        description={`${paper.page_count} page${paper.page_count === 1 ? "" : "s"} · scoring ${schemeLabel(
          paper.marking_scheme,
        )}${paper.detected_language ? ` · ${paper.detected_language}` : ""}`}
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link to="/papers">All papers</Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={process.running || pages.length === 0}
              onClick={() =>
                void process
                  .run(failedPages.length ? failedPages : pages, { force: failedPages.length === 0 })
                  .then(() => toast.success("Paper re-read"))
                  .catch(() => toast.error("Re-reading failed"))
              }
            >
              <RefreshCw className="mr-2 size-4" aria-hidden />
              {failedPages.length ? `Retry ${failedPages.length} failed page(s)` : "Re-read paper"}
            </Button>
          </>
        }
      />

      {process.running ? (
        <Card className="mb-6">
          <CardContent className="space-y-2 pt-6">
            <div className="flex items-center gap-2 text-body">
              <ScanLine className="size-4 text-primary" aria-hidden />
              {process.label || "Reading your paper"}
            </div>
            <Progress value={process.total ? Math.round((process.done / process.total) * 100) : 0} />
            <p className="text-caption text-muted-foreground">
              Page {Math.min(process.done + 1, process.total)} of {process.total}. Pages already read are
              never re-run.
            </p>
          </CardContent>
        </Card>
      ) : paper.status_detail ? (
        <p className="mb-6 flex items-center gap-2 text-caption text-muted-foreground">
          {paper.status === "failed" ? (
            <AlertTriangle className="size-4 text-destructive" aria-hidden />
          ) : paper.status === "ready" ? (
            <CheckCircle2 className="size-4 text-success" aria-hidden />
          ) : (
            <Sparkles className="size-4 text-primary" aria-hidden />
          )}
          {paper.status_detail}
        </p>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <StatCard label="Questions read" value={questions.length} icon={Images} />
        <StatCard label="Need review" value={needingReview.length} icon={AlertTriangle} accent="warning" />
        <StatCard label="Answer key known" value={`${withKey.length}/${questions.length}`} icon={ClipboardPaste} />
        <StatCard label="Answered" value={`${answered}/${questions.length}`} icon={CheckCircle2} accent="success" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="review">Review{needingReview.length ? ` (${needingReview.length})` : ""}</TabsTrigger>
          <TabsTrigger value="answer">Answer</TabsTrigger>
          <TabsTrigger value="key">Answer key</TabsTrigger>
          <TabsTrigger value="score">Score</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
        </TabsList>

        <TabsContent value="review">
          {questions.length === 0 ? (
            <EmptyState
              icon={ScanLine}
              title="Nothing read yet"
              description="Once the pages are read, anything the reader wasn't sure about lands here for you to confirm."
            />
          ) : needingReview.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Every question is confirmed"
              description="The reader was confident about all questions on this paper. Head to Answer to record what you picked."
              actionLabel="Go to Answer"
              onAction={() => setTab("answer")}
            />
          ) : (
            <ul className="space-y-4">
              {needingReview.map((q) => (
                <ReviewCard
                  key={q.id}
                  question={q}
                  onSave={(patch) =>
                    updateQuestion.mutate(
                      { id: q.id, patch: { ...patch, needs_review: false } },
                      { onSuccess: () => toast.success(`Q${q.position} confirmed`) },
                    )
                  }
                />
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="answer">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-subheading">Fast capture — wrong questions only</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-caption text-muted-foreground">
                Most students only remember what they got wrong. List those question numbers and everything
                else is recorded as correct.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wrong">Wrong question numbers</Label>
                  <Input
                    id="wrong"
                    value={wrongInput}
                    onChange={(e) => setWrongInput(e.target.value)}
                    placeholder="3, 7, 12, 45"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skipped">Left blank (optional)</Label>
                  <Input
                    id="skipped"
                    value={skippedInput}
                    onChange={(e) => setSkippedInput(e.target.value)}
                    placeholder="18, 44"
                  />
                </div>
              </div>
              <Button
                disabled={wrongOnly.isPending || withKey.length === 0}
                onClick={() =>
                  wrongOnly.mutate(
                    {
                      questions,
                      wrongPositions: parsePositions(wrongInput),
                      unattemptedPositions: parsePositions(skippedInput),
                    },
                    {
                      onSuccess: (n) => toast.success(`Recorded answers for ${n} questions`),
                      onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
                    },
                  )
                }
              >
                Apply wrong-only capture
              </Button>
            </CardContent>
          </Card>

          {questions.length === 0 ? (
            <EmptyState icon={ScanLine} title="No questions to answer yet" />
          ) : (
            <ul className="space-y-2">
              {questions.map((q) => {
                const a = answerByQuestion.get(q.id);
                return (
                  <li
                    key={q.id}
                    className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <span className="w-8 shrink-0 text-body font-semibold tabular-nums">{q.position}</span>
                    <p className="min-w-0 flex-1 text-caption text-muted-foreground line-clamp-2">
                      {q.question_text}
                    </p>
                    <div className="flex items-center gap-1">
                      {(q.options.length ? q.options : ["A", "B", "C", "D"]).map((_, i) => {
                        const selected = a?.selected_option === i;
                        return (
                          <Button
                            key={i}
                            size="icon"
                            variant={selected ? "default" : "outline"}
                            aria-label={`Question ${q.position} option ${LETTERS[i]}`}
                            aria-pressed={selected}
                            onClick={() =>
                              saveAnswer.mutate({
                                questionId: q.id,
                                selected: selected ? null : i,
                                marked: a?.marked_for_review ?? false,
                              })
                            }
                          >
                            {LETTERS[i]}
                          </Button>
                        );
                      })}
                      {q.correct_option === null ? (
                        <Badge variant="secondary" className="ml-1 bg-warning/15 text-warning">
                          no key
                        </Badge>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="key">
          <Card>
            <CardHeader>
              <CardTitle className="text-subheading">Import the printed answer key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-caption text-muted-foreground">
                Paste the key in any usual format — <code>1-A 2-C 3-B</code>, <code>1. A, 2. C</code> or a
                plain <code>ACBD…</code> string. Questions without a key are excluded from scoring instead of
                being counted wrong.
              </p>
              <Textarea
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                rows={6}
                placeholder="1-A 2-C 3-B 4-D …"
              />
              <Button
                disabled={importKey.isPending || !keyInput.trim()}
                onClick={() => {
                  const parsed = parseAnswerKey(keyInput, questions.length);
                  if (parsed.length === 0) {
                    toast.error("Couldn't read any answers from that. Try 1-A 2-C style.");
                    return;
                  }
                  importKey.mutate(
                    { questions, key: parsed },
                    {
                      onSuccess: (n) => toast.success(`Answer key applied to ${n} questions`),
                      onError: (e) => toast.error(e instanceof Error ? e.message : "Import failed"),
                    },
                  );
                }}
              >
                Apply answer key
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="score">
          <Card>
            <CardHeader>
              <CardTitle className="text-subheading">Score this paper</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <dl className="grid gap-3 sm:grid-cols-4">
                <Metric label="Provisional score" value={`${preview.score} / ${preview.max_score}`} />
                <Metric label="Correct" value={preview.correct_count} />
                <Metric label="Wrong" value={preview.incorrect_count} />
                <Metric label="Accuracy" value={`${preview.accuracy}%`} />
              </dl>

              <div className="max-w-xs space-y-2">
                <Label htmlFor="minutes">Time you took (minutes)</Label>
                <Input
                  id="minutes"
                  type="number"
                  min={0}
                  max={1440}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                />
                <p className="text-caption text-muted-foreground">
                  Paper tests can't capture per-question time, so speed is tracked for the whole paper only.
                  This also counts toward today's study hours.
                </p>
              </div>

              <Button
                disabled={commit.isPending || preview.scorable_count === 0}
                onClick={() =>
                  commit.mutate(Math.max(0, minutes) * 60, {
                    onSuccess: (result) => {
                      toast.success("Paper scored and added to your attempts");
                      navigate({
                        to: "/practice/results/$attemptId",
                        params: { attemptId: result.attempt_id },
                      });
                    },
                    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not score"),
                  })
                }
              >
                {commit.isPending ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
                Score &amp; add to my analytics
              </Button>
              {preview.scorable_count === 0 ? (
                <p className="text-caption text-warning">
                  No answer key yet — import the key or set correct answers in Review before scoring.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((p) => (
              <li key={p.id} className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="aspect-[3/4] bg-muted">
                  {pageUrls[p.storage_path] ? (
                    <img
                      src={pageUrls[p.storage_path]}
                      alt={`Page ${p.page_number} of ${paper.title}`}
                      loading="lazy"
                      className="size-full object-contain"
                    />
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-2 p-2 text-caption">
                  <span>Page {p.page_number}</span>
                  <Badge
                    variant="secondary"
                    className={
                      p.extraction_status === "failed"
                        ? "bg-destructive/15 text-destructive"
                        : p.extraction_status === "done"
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                    }
                  >
                    {p.extraction_status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="text-subheading font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function ReviewCard({
  question,
  onSave,
}: {
  question: PaperQuestion;
  onSave: (patch: Partial<Pick<PaperQuestion, "question_text" | "options" | "correct_option">>) => void;
}) {
  const [text, setText] = useState(question.question_text);
  const [options, setOptions] = useState<string[]>(
    question.options.length ? question.options : ["", "", "", ""],
  );
  const [correct, setCorrect] = useState<number | null>(question.correct_option);

  const lowFields = Object.entries(question.field_confidence)
    .filter(([, v]) => Number(v) < 0.8)
    .map(([k]) => k);

  return (
    <li className="rounded-xl border border-warning/40 bg-warning/5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-body font-semibold">Question {question.position}</span>
        <span className="text-caption text-muted-foreground">
          {lowFields.length ? `Unsure about: ${lowFields.join(", ")}` : "Low overall confidence"}
        </span>
      </div>

      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="mb-3" />

      <ul className="mb-3 space-y-2">
        {options.map((opt, i) => (
          <li key={i} className="flex items-center gap-2">
            <Button
              size="icon"
              variant={correct === i ? "default" : "outline"}
              aria-label={`Mark option ${LETTERS[i]} correct`}
              aria-pressed={correct === i}
              onClick={() => setCorrect(correct === i ? null : i)}
            >
              {LETTERS[i]}
            </Button>
            <Input
              value={opt}
              onChange={(e) =>
                setOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))
              }
              placeholder={`Option ${LETTERS[i]}`}
            />
          </li>
        ))}
      </ul>

      <Button
        size="sm"
        onClick={() =>
          onSave({
            question_text: text.trim(),
            options: options.map((o) => o.trim()),
            correct_option: correct,
          })
        }
      >
        Confirm question
      </Button>
    </li>
  );
}
