import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ListTodo, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStudyBlocks, useUpdateStudyBlock, type StudyBlock } from "@/hooks/use-study-blocks";
import { useSubjects } from "@/hooks/use-curriculum";
import { formatDuration, minuteToLabel, todayISO } from "@/lib/utils/format";

/** Today's Tasks (Section 2) — the one widget allowed a genuine celebration. */
export function TodayTasks({ className }: { className?: string }) {
  const today = todayISO();
  const { data: blocks = [], isLoading } = useStudyBlocks(today, today);
  const { data: subjects = [] } = useSubjects();
  const update = useUpdateStudyBlock();
  const [collapsing, setCollapsing] = useState<string[]>([]);

  const done = blocks.filter((b) => b.status === "completed").length;
  const allDone = blocks.length > 0 && done === blocks.length;

  const toneFor = (b: StudyBlock) => {
    const subject = subjects.find((s) => b.title.toLowerCase().includes(s.name.toLowerCase()));
    return subject?.slug ?? "primary";
  };

  const complete = (b: StudyBlock) => {
    const next = b.status === "completed" ? "planned" : "completed";
    if (next === "completed") {
      setCollapsing((c) => [...c, b.id]);
      setTimeout(() => setCollapsing((c) => c.filter((id) => id !== b.id)), 420);
    }
    update.mutate({ id: b.id, status: next });
  };

  return (
    <section className={cn("surface flex flex-col p-5", className)} aria-label="Today's tasks">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-subheading font-semibold">
          <ListTodo className="size-4 text-primary" strokeWidth={1.5} aria-hidden /> Today's tasks
        </h2>
        <span className="num text-caption text-muted-foreground">
          {done} of {blocks.length} done
        </span>
      </div>

      {allDone ? (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-success/40 bg-success/10 p-3 text-caption">
          <PartyPopper className="size-5 text-success" strokeWidth={1.5} aria-hidden />
          <p>Every block done. That's a complete day — bank it and rest.</p>
        </div>
      ) : null}

      <ul className="mt-4 flex-1 space-y-2">
        {blocks.map((b) => (
          <li
            key={b.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-border px-3 py-2 transition-all duration-300",
              collapsing.includes(b.id) && "scale-[0.98] opacity-60",
            )}
          >
            <button
              type="button"
              onClick={() => complete(b)}
              aria-label={b.status === "completed" ? `Reopen ${b.title}` : `Complete ${b.title}`}
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-md border transition-colors",
                b.status === "completed" ? "border-success bg-success/20" : "border-input hover:border-primary",
              )}
            >
              {b.status === "completed" ? (
                <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
                  <path
                    d="M4 12.5 9.5 18 20 6"
                    fill="none"
                    stroke="var(--color-success)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="24"
                    style={{ animation: "draw-check 320ms ease-out both" }}
                  />
                </svg>
              ) : null}
            </button>
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: `var(--color-${toneFor(b)})` }}
              aria-hidden
            />
            <span className={cn("min-w-0 flex-1 truncate text-caption", b.status === "completed" && "text-muted-foreground line-through")}>
              {b.title}
            </span>
            <span className="num shrink-0 rounded-full bg-muted px-2 py-0.5 text-caption text-muted-foreground">
              {formatDuration(b.duration_minutes)}
            </span>
            <span className="num hidden shrink-0 text-caption text-muted-foreground sm:block">
              {minuteToLabel(b.start_minute)}
            </span>
          </li>
        ))}

        {!isLoading && blocks.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border p-4 text-caption text-muted-foreground">
            Nothing scheduled today. Build a plan and the checklist fills itself.
          </li>
        ) : null}
      </ul>

      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/planner">Open planner</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/today">Full checklist</Link>
        </Button>
      </div>
    </section>
  );
}
