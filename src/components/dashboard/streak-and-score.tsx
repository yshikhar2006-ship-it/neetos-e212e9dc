import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Flame, Gauge } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { streakFrom, useHabitLogs } from "@/hooks/use-habits";
import { useTopicProgress } from "@/hooks/use-topic-progress";
import { useFlashcardReviews } from "@/hooks/use-performance";
import { productivityScore } from "@/lib/utils/productivity";

const SESSION_KEY = "neetos:streak-pulsed";

export function StreakPill() {
  const { data: logs = [] } = useHabitLogs(60);
  const streak = streakFrom(logs);
  const [pulse, setPulse] = useState(false);
  const seen = useRef(false);

  // Scale-pulse once per session, never on every render.
  useEffect(() => {
    if (seen.current || streak === 0 || typeof window === "undefined") return;
    seen.current = true;
    const previous = Number(window.sessionStorage.getItem(SESSION_KEY) ?? "-1");
    if (previous !== streak) {
      window.sessionStorage.setItem(SESSION_KEY, String(streak));
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 500);
      return () => clearTimeout(t);
    }
  }, [streak]);

  return (
    <Link
      to="/habits"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-caption font-medium transition-colors hover:bg-accent",
        pulse && "pulse-once",
      )}
      aria-label={`${streak} day study streak`}
    >
      <Flame className="size-4 text-warning" strokeWidth={1.5} aria-hidden />
      <span className="num">{streak}</span>
      <span className="text-muted-foreground">day streak</span>
    </Link>
  );
}

const LINKS = [
  { key: "consistency", label: "Consistency", to: "/habits", hint: "Days active in the last 14" },
  { key: "efficiency", label: "Efficiency", to: "/syllabus", hint: "Topics completed per hour logged" },
  { key: "revision", label: "Revision discipline", to: "/revision", hint: "Reviews done inside their due window" },
] as const;

export function ProductivityBadge() {
  const { data: logs = [] } = useHabitLogs(30);
  const { data: progress = [] } = useTopicProgress();
  const { data: reviews = [] } = useFlashcardReviews();
  const b = productivityScore(logs, progress, reviews);

  const values: Record<string, number> = {
    consistency: b.consistency,
    efficiency: b.efficiency,
    revision: b.revisionDiscipline,
  };

  return (
    <Popover>
      <PopoverTrigger
        className="precision-card inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-caption font-medium transition-colors hover:bg-accent"
        aria-label="Productivity score breakdown"
      >
        <Gauge className="size-4 text-primary" strokeWidth={1.5} aria-hidden />
        {b.score === null ? (
          <span className="text-muted-foreground">Calculating — check back soon</span>
        ) : (
          <>
            <span className="num">{b.score}</span>
            <span className="text-muted-foreground">productivity</span>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="text-caption font-semibold">Productivity score</p>
        <p className="mt-1 text-caption text-muted-foreground">
          {b.score === null
            ? `Needs 3 days of logged activity — you have ${b.daysLogged}.`
            : "0.4 consistency + 0.35 efficiency + 0.25 revision discipline."}
        </p>
        <div className="mt-3 space-y-3">
          {LINKS.map((l) => (
            <Link key={l.key} to={l.to} className="block rounded-md p-1 transition-colors hover:bg-accent">
              <div className="flex items-center justify-between text-caption">
                <span>{l.label}</span>
                <span className="num">{values[l.key]}%</span>
              </div>
              <Progress value={values[l.key]} className="mt-1 h-1.5" />
              <span className="text-caption text-muted-foreground">{l.hint}</span>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
