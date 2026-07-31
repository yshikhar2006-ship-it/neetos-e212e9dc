import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { isBefore, parseISO } from "date-fns";
import { BrainCircuit, CheckCircle2, Circle, ListTodo, NotebookPen, Target } from "lucide-react";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { useStudyBlocks, useUpdateStudyBlock } from "@/hooks/use-study-blocks";
import { useTopicProgress } from "@/hooks/use-topic-progress";
import { useFlashcards } from "@/hooks/use-flashcards";
import { usePriorityScores } from "@/hooks/use-priority";
import { formatDuration, minuteToLabel, todayISO } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({
    meta: [
      { title: "Today's Tasks — NEET OS" },
      { name: "description", content: "A single checklist for everything due today." },
      { property: "og:title", content: "Today's Tasks — NEET OS" },
      { property: "og:description", content: "A single checklist for everything due today." },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const today = todayISO();
  const { data: blocks = [] } = useStudyBlocks(today, today);
  const { data: progress = [] } = useTopicProgress();
  const { data: cards = [] } = useFlashcards();
  const { data: priority = [] } = usePriorityScores(3);
  const update = useUpdateStudyBlock();

  const dueCards = useMemo(
    () => cards.filter((c) => isBefore(parseISO(c.next_review_at), new Date())),
    [cards],
  );
  const dueRevision = useMemo(
    () =>
      progress.filter(
        (p) => p.next_revision_due_at && isBefore(parseISO(p.next_revision_due_at), new Date()),
      ),
    [progress],
  );

  const done = blocks.filter((b) => b.status === "completed").length;
  const sorted = [...blocks].sort((a, b) => a.start_minute - b.start_minute);

  return (
    <>
      <PageHeader
        title="Today's Tasks"
        description="A single checklist for everything due today."
        actions={
          <Button asChild variant="outline">
            <Link to="/planner">Edit plan</Link>
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Blocks completed" value={`${done}/${blocks.length}`} icon={ListTodo} />
        <StatCard label="Cards due" value={dueCards.length} icon={BrainCircuit} />
        <StatCard label="Topics to revise" value={dueRevision.length} icon={NotebookPen} />
      </div>

      <section className="surface p-5" aria-label="Study blocks today">
        <h2 className="text-subheading font-semibold">Study blocks</h2>
        {sorted.length === 0 ? (
          <EmptyState
            className="mt-4"
            title="No blocks scheduled today"
            description="Build a plan in the Daily Planner, or let Auto-plan fill the day from your priority list."
          />
        ) : (
          <ul className="mt-4 space-y-2">
            {sorted.map((b) => {
              const complete = b.status === "completed";
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() =>
                      update.mutate({ id: b.id, status: complete ? "planned" : "completed" })
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-accent/60",
                      complete && "opacity-60",
                    )}
                  >
                    {complete ? (
                      <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
                    ) : (
                      <Circle className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <span className={cn("min-w-0 flex-1 truncate font-medium", complete && "line-through")}>
                      {b.title}
                    </span>
                    <span className="num shrink-0 text-caption text-muted-foreground">
                      {minuteToLabel(b.start_minute)} · {formatDuration(b.duration_minutes)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="surface p-5" aria-label="Revision queue">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-subheading font-semibold">
              <BrainCircuit className="size-4 text-primary" aria-hidden /> Due for revision
            </h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/revision">Open hub</Link>
            </Button>
          </div>
          <p className="mt-3 text-caption text-muted-foreground">
            {dueCards.length} flashcards and {dueRevision.length} topics are past their scheduled review.
          </p>
          <Button className="mt-4" asChild disabled={dueCards.length === 0}>
            <Link to="/revision/flashcards">Review {dueCards.length} cards</Link>
          </Button>
        </section>

        <section className="surface p-5" aria-label="Priority topics">
          <h2 className="flex items-center gap-2 text-subheading font-semibold">
            <Target className="size-4 text-primary" aria-hidden /> Highest-impact topics
          </h2>
          <ul className="mt-3 space-y-2">
            {priority.map((p) => (
              <li key={p.id} className="rounded-lg border border-border p-3">
                <p className="truncate text-caption font-medium">{p.topics?.name}</p>
                <p className="mt-1 text-caption text-muted-foreground">{p.reason ?? p.driver}</p>
              </li>
            ))}
            {priority.length === 0 ? (
              <li className="text-caption text-muted-foreground">
                Log progress or a mock to unlock recommendations.
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </>
  );
}
