import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, CircleSlash, Target, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/app-shell";
import { StatCard } from "@/components/shared/stat-card";
import { LoadingSkeleton } from "@/components/shared/state";
import { DonutChart } from "@/components/shared/charts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAttempt, useAttemptAnswers, useAttemptQuestions } from "@/hooks/use-tests";
import { useSubjects } from "@/hooks/use-curriculum";
import { useLogError } from "@/hooks/use-error-log";
import { estimateRank } from "@/lib/utils/scoring";
import { formatDuration, subjectToken } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/practice/results/$attemptId")({
  head: () => ({
    meta: [
      { title: "Test results — NEET OS" },
      { name: "description", content: "NTA score, accuracy, subject split and per-question review." },
      { property: "og:title", content: "Test results — NEET OS" },
      { property: "og:description", content: "NTA score, accuracy, subject split and per-question review." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const { attemptId } = Route.useParams();
  const { data: attempt, isLoading } = useAttempt(attemptId);
  const testId = (attempt as { test_id?: string } | undefined)?.test_id ?? null;
  const { data: questions = [] } = useAttemptQuestions(testId);
  const { data: answers = [] } = useAttemptAnswers(attemptId);
  const { data: subjects = [] } = useSubjects();
  const logError = useLogError();

  const answerMap = useMemo(
    () => new Map(answers.map((a) => [a.question_id as string, a])),
    [answers],
  );

  const a = attempt as
    | {
        score: number;
        max_score: number;
        accuracy: number;
        correct_count: number;
        incorrect_count: number;
        unattempted_count: number;
        time_taken_seconds: number;
        subject_breakdown: Record<string, { correct: number; total: number; score: number }> | null;
        title: string;
      }
    | undefined;

  if (isLoading || !a) return <LoadingSkeleton rows={4} />;

  const rank = estimateRank(Math.round((a.score / Math.max(a.max_score, 1)) * 720));
  const donut = [
    { label: "Correct", value: a.correct_count, tone: "success" },
    { label: "Incorrect", value: a.incorrect_count, tone: "destructive" },
    { label: "Skipped", value: a.unattempted_count, tone: "muted-foreground" },
  ];

  return (
    <>
      <PageHeader
        title={a.title}
        description="Scored with NTA rules: +4 correct, −1 incorrect, 0 unattempted."
        actions={
          <Button variant="outline" asChild>
            <Link to="/practice">Back to practice</Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <StatCard className="lg:col-span-3" label="Score" value={a.score} suffix={`/ ${a.max_score}`} icon={Target} />
        <StatCard className="lg:col-span-3" label="Accuracy" value={`${a.accuracy}%`} icon={CheckCircle2} />
        <StatCard
          className="lg:col-span-3"
          label="Time taken"
          value={formatDuration(Math.round(a.time_taken_seconds / 60))}
          icon={CircleSlash}
        />
        <StatCard
          className="lg:col-span-3"
          label="Est. rank"
          value={`${rank.rank_low.toLocaleString("en-IN")}–${rank.rank_high.toLocaleString("en-IN")}`}
          icon={XCircle}
          hint={`${rank.percentile}th percentile (estimate)`}
        />

        <section className="surface p-5 lg:col-span-5" aria-label="Answer split">
          <h2 className="text-subheading font-semibold">Answer split</h2>
          <div className="mt-3">
            <DonutChart data={donut} />
          </div>
        </section>

        <section className="surface p-5 lg:col-span-7" aria-label="Subject breakdown">
          <h2 className="text-subheading font-semibold">Subject breakdown</h2>
          <ul className="mt-4 space-y-3">
            {Object.entries(a.subject_breakdown ?? {}).map(([sid, v]) => {
              const subject = subjects.find((s) => s.id === sid);
              const acc = v.total ? Math.round((v.correct / v.total) * 100) : 0;
              return (
                <li key={sid}>
                  <div className="flex items-center justify-between text-caption">
                    <span>{subject?.name ?? "Unclassified"}</span>
                    <span className="num text-muted-foreground">
                      {v.correct}/{v.total} · {v.score} marks
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${acc}%`,
                        backgroundColor: subject ? `var(--color-${subjectToken(subject.slug)})` : "var(--color-primary)",
                      }}
                    />
                  </div>
                </li>
              );
            })}
            {Object.keys(a.subject_breakdown ?? {}).length === 0 ? (
              <li className="text-caption text-muted-foreground">No subject data for this paper.</li>
            ) : null}
          </ul>
        </section>

        <section className="surface p-5 lg:col-span-12" aria-label="Question review">
          <h2 className="text-subheading font-semibold">Question review</h2>
          <ol className="mt-4 space-y-3">
            {questions.map((q) => {
              const ans = answerMap.get(q.question_id);
              const selected = (ans?.selected_option ?? null) as number | null;
              const correct = selected === q.correct_option;
              return (
                <li key={q.question_id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="num text-caption text-muted-foreground">Q{q.position}</p>
                    <Badge variant={selected === null ? "secondary" : correct ? "default" : "destructive"}>
                      {selected === null ? "Skipped" : correct ? "Correct" : "Incorrect"}
                    </Badge>
                  </div>
                  <p className="mt-2 font-medium">{q.question_text}</p>
                  <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                    {q.options.map((opt, i) => (
                      <li
                        key={i}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-caption",
                          i === q.correct_option && "border-success bg-success/10",
                          i === selected && i !== q.correct_option && "border-destructive bg-destructive/10",
                          i !== q.correct_option && i !== selected && "border-border",
                        )}
                      >
                        <span className="num mr-2">{String.fromCharCode(65 + i)}</span>
                        {opt}
                      </li>
                    ))}
                  </ul>
                  {q.explanation ? (
                    <p className="mt-3 rounded-lg bg-muted/60 p-3 text-caption text-muted-foreground">{q.explanation}</p>
                  ) : null}
                  {!correct ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() =>
                        logError.mutate(
                          {
                            question_id: q.question_id,
                            topic_id: q.topic_id,
                            attempt_id: attemptId,
                            mistake_type: selected === null ? "unattempted" : "conceptual",
                          },
                          { onSuccess: () => toast.success("Added to error log") },
                        )
                      }
                    >
                      Add to error log
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </>
  );
}
