import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Flag, Send } from "lucide-react";
import { toast } from "sonner";
import { LoadingSkeleton, EmptyState } from "@/components/shared/state";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAttempt, useAttemptQuestions, useSaveAnswer, useSubmitAttempt } from "@/hooks/use-tests";
import { formatClock } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/practice/live/$attemptId")({
  head: () => ({
    meta: [
      { title: "Test in progress — NEET OS" },
      { name: "description", content: "NTA-style test interface with palette, timer and mark for review." },
      { property: "og:title", content: "Test in progress — NEET OS" },
      { property: "og:description", content: "NTA-style test interface with timer and question palette." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LiveTest,
});

type AnswerMap = Record<string, { selected: number | null; time: number }>;

function LiveTest() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();
  const { data: attempt, isLoading } = useAttempt(attemptId);
  const testId = (attempt as { test_id?: string } | undefined)?.test_id ?? null;
  const { data: questions = [] } = useAttemptQuestions(testId);
  const save = useSaveAnswer();
  const submit = useSubmitAttempt();

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [elapsed, setElapsed] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const questionStart = useRef(Date.now());

  const durationMinutes = (attempt as { duration_minutes?: number } | undefined)?.duration_minutes ?? 0;

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const current = questions[index];
  const answered = Object.values(answers).filter((a) => a.selected !== null).length;

  const doSubmit = useMemo(
    () => () => {
      submit.mutate(
        { attemptId, answers, questions, timeTakenSeconds: elapsed },
        {
          onSuccess: () => {
            toast.success("Test submitted");
            navigate({ to: "/practice/results/$attemptId", params: { attemptId } });
          },
          onError: (e) => toast.error(e.message),
        },
      );
    },
    [attemptId, answers, questions, elapsed, submit, navigate],
  );

  const select = (option: number) => {
    if (!current) return;
    const time = Math.round((Date.now() - questionStart.current) / 1000);
    setAnswers((a) => ({ ...a, [current.question_id]: { selected: option, time } }));
    save.mutate({
      attemptId,
      questionId: current.question_id,
      selectedOption: option,
      isCorrect: option === current.correct_option,
      markedForReview: !!marked[current.question_id],
      timeSpentSeconds: time,
    });
  };

  const goTo = (i: number) => {
    questionStart.current = Date.now();
    setIndex(i);
  };

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (!current) {
    return (
      <EmptyState
        title="This paper has no questions"
        description="The question bank didn't match your filters. Head back to Practice and widen the setup."
      />
    );
  }

  const remaining = Math.max(0, durationMinutes * 60 - elapsed);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <section className="surface p-5" aria-label="Question">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <p className="num text-caption text-muted-foreground">
            Question {index + 1} of {questions.length}
          </p>
          <p className={cn("num font-mono text-subheading font-semibold", remaining < 300 && "text-destructive")}>
            {durationMinutes ? formatClock(remaining) : formatClock(elapsed)}
          </p>
        </div>

        <h1 className="mt-4 text-body font-medium leading-relaxed">{current.question_text}</h1>

        <ul className="mt-5 space-y-2">
          {current.options.map((opt, i) => {
            const selected = answers[current.question_id]?.selected === i;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => select(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                    selected ? "border-primary bg-primary/10" : "border-border hover:bg-accent/60",
                  )}
                >
                  <span className="num grid size-6 shrink-0 place-items-center rounded-full border border-border text-caption">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="min-w-0 flex-1">{opt}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => goTo(Math.max(0, index - 1))} disabled={index === 0}>
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setMarked((m) => ({ ...m, [current.question_id]: !m[current.question_id] }))}
          >
            <Flag className="size-4" aria-hidden /> {marked[current.question_id] ? "Unmark" : "Mark for review"}
          </Button>
          <Button onClick={() => goTo(Math.min(questions.length - 1, index + 1))} disabled={index === questions.length - 1}>
            Save & next
          </Button>
          <Button variant="destructive" className="ml-auto" onClick={() => setConfirmOpen(true)}>
            <Send className="size-4" aria-hidden /> Submit
          </Button>
        </div>
      </section>

      <aside className="surface h-fit p-4" aria-label="Question palette">
        <h2 className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Palette</h2>
        <p className="num mt-2 text-caption text-muted-foreground">
          {answered} answered · {questions.length - answered} left
        </p>
        <ol className="mt-3 grid grid-cols-6 gap-1.5">
          {questions.map((q, i) => {
            const state = marked[q.question_id]
              ? "bg-warning text-warning-foreground"
              : answers[q.question_id]?.selected !== undefined && answers[q.question_id]?.selected !== null
                ? "bg-success text-success-foreground"
                : "bg-muted text-muted-foreground";
            return (
              <li key={q.question_id}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Go to question ${i + 1}`}
                  className={cn(
                    "num grid size-8 w-full place-items-center rounded-md text-caption font-medium transition-transform hover:scale-105",
                    state,
                    i === index && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                  )}
                >
                  {i + 1}
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this test?</AlertDialogTitle>
            <AlertDialogDescription>
              {questions.length - answered} questions are unanswered. Scoring uses NTA rules: +4 correct, −1 incorrect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={doSubmit}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
