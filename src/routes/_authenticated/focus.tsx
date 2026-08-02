import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Ban, Timer } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/app-shell";
import { StatCard } from "@/components/shared/stat-card";
import { PomodoroTimer } from "@/components/shared/pomodoro-timer";
import { FilterBar } from "@/components/shared/filter-bar";
import { Button } from "@/components/ui/button";
import { streakFrom, useHabitLogs, useUpsertHabitLog } from "@/hooks/use-habits";
import { useStudyBlocks } from "@/hooks/use-study-blocks";
import { usePriorityScores } from "@/hooks/use-priority";
import { todayISO } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/focus")({
  head: () => ({
    meta: [
      { title: "Focus Tools — NEET OS" },
      { name: "description", content: "Pomodoro sessions, focus mode and today's study statistics." },
      { property: "og:title", content: "Focus Tools — NEET OS" },
      { property: "og:description", content: "Pomodoro sessions, focus mode and today's study statistics." },
    ],
  }),
  component: FocusPage,
});

const PRESETS = [
  { value: "25", label: "25 / 5" },
  { value: "50", label: "50 / 10" },
  { value: "90", label: "90 / 15" },
];

function FocusPage() {
  const today = todayISO();
  const { data: logs = [] } = useHabitLogs(60);
  const { data: blocks = [] } = useStudyBlocks(today, today);
  const { data: priority = [] } = usePriorityScores(5);
  const upsert = useUpsertHabitLog();

  const [preset, setPreset] = useState("25");
  const [focusMode, setFocusMode] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);

  const todayLog = logs.find((l) => l.log_date === today);
  const streak = useMemo(() => streakFrom(logs), [logs]);
  const focusMinutes = Number(preset);
  const breakMinutes = preset === "25" ? 5 : preset === "50" ? 10 : 15;

  const tasks = useMemo(
    () => [
      ...blocks.map((b) => ({ id: b.id, label: b.title })),
      ...priority.slice(0, 3).map((p) => ({ id: p.id, label: p.topics?.name ?? "Priority topic" })),
    ],
    [blocks, priority],
  );
  const activeTask = tasks.find((t) => t.id === taskId);

  const onSessionComplete = (minutes: number) => {
    upsert.mutate(
      {
        log_date: today,
        study_hours: Number((Number(todayLog?.study_hours ?? 0) + minutes / 60).toFixed(2)),
        pomodoro_count: (todayLog?.pomodoro_count ?? 0) + 1,
      },
      { onError: () => toast.error("Session finished but the log didn't save.") },
    );
  };

  return (
    <div className={cn(focusMode && "mx-auto max-w-2xl")}>
      <PageHeader
        title="Focus Tools"
        description="One timer, one task, and the numbers that come out of it."
        actions={
          <Button variant={focusMode ? "default" : "outline"} onClick={() => setFocusMode((f) => !f)}>
            <Ban className="size-4" aria-hidden /> {focusMode ? "Exit focus mode" : "Focus mode"}
          </Button>
        }
      />

      {!focusMode ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Pomodoros today" value={todayLog?.pomodoro_count ?? 0} icon={Timer} accent="primary" />
          <StatCard label="Hours today" value={Number(todayLog?.study_hours ?? 0)} suffix="h" />
          <StatCard label="Streak" value={streak} suffix="days" accent={streak ? "success" : "warning"} />
        </div>
      ) : null}

      <section className="surface mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-subheading font-semibold">Pomodoro</h2>
          <FilterBar label="Session length" options={PRESETS} value={preset} onChange={setPreset} />
        </div>

        {tasks.length ? (
          <div className="mt-4">
            <span className="text-caption font-medium text-muted-foreground">What are you working on?</span>
            <FilterBar
              className="mt-2"
              label="Focus task"
              value={taskId ?? "none"}
              onChange={(v) => setTaskId(v === "none" ? null : v)}
              options={[{ value: "none", label: "Unassigned" }, ...tasks.map((t) => ({ value: t.id, label: t.label }))]}
            />
          </div>
        ) : null}

        <PomodoroTimer
          key={preset}
          focusMinutes={focusMinutes}
          breakMinutes={breakMinutes}
          taskLabel={activeTask?.label}
          onSessionComplete={onSessionComplete}
          className="mt-5"
        />
      </section>

      {!focusMode ? (
        <section className="surface mt-6 p-5">
          <h2 className="text-subheading font-semibold">Today, {format(new Date(), "d MMM")}</h2>
          <ul className="mt-3 space-y-2">
            {blocks.length ? (
              blocks.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                  <span className="min-w-0 truncate text-body">{b.title}</span>
                  <span className="num shrink-0 text-caption text-muted-foreground">{b.duration_minutes} min · {b.status}</span>
                </li>
              ))
            ) : (
              <li className="text-caption text-muted-foreground">No blocks planned for today. Plan one in the Planner.</li>
            )}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
