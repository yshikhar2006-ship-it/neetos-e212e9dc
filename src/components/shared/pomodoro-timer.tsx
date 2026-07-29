import { useCallback, useEffect, useRef, useState } from "react";
import { Coffee, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/utils/format";

type Phase = "focus" | "break";

export function PomodoroTimer({
  focusMinutes = 25,
  breakMinutes = 5,
  taskLabel,
  onSessionComplete,
  className,
}: {
  focusMinutes?: number;
  breakMinutes?: number;
  taskLabel?: string;
  onSessionComplete?: (minutes: number) => void;
  className?: string;
}) {
  const [phase, setPhase] = useState<Phase>("focus");
  const [remaining, setRemaining] = useState(focusMinutes * 60);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const completeRef = useRef(onSessionComplete);
  completeRef.current = onSessionComplete;

  const total = (phase === "focus" ? focusMinutes : breakMinutes) * 60;

  const reset = useCallback(
    (next: Phase = phase) => {
      setPhase(next);
      setRemaining((next === "focus" ? focusMinutes : breakMinutes) * 60);
      setRunning(false);
    },
    [phase, focusMinutes, breakMinutes],
  );

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r > 1) return r - 1;
        clearInterval(id);
        setRunning(false);
        if (phase === "focus") {
          setCompleted((c) => c + 1);
          completeRef.current?.(focusMinutes);
          toast.success("Focus session done", { description: "Take a short break — you earned it." });
          setPhase("break");
          return breakMinutes * 60;
        }
        toast("Break over", { description: "Ready for the next block?" });
        setPhase("focus");
        return focusMinutes * 60;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase, focusMinutes, breakMinutes]);

  const progress = ((total - remaining) / total) * 100;

  return (
    <div className={cn("surface p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {phase === "focus" ? (
            <Timer className="size-4 shrink-0 text-primary" aria-hidden />
          ) : (
            <Coffee className="size-4 shrink-0 text-success" aria-hidden />
          )}
          <span className="truncate text-caption font-medium text-muted-foreground">
            {phase === "focus" ? (taskLabel ?? "Focus session") : "Break"}
          </span>
        </div>
        <span className="num text-caption text-muted-foreground">{completed} done today</span>
      </div>

      <div className="mt-4 text-center">
        <span
          className="num text-display font-semibold tabular-nums text-foreground"
          aria-live="polite"
        >
          {formatClock(remaining)}
        </span>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-out",
            phase === "focus" ? "bg-primary" : "bg-success",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <Button onClick={() => setRunning((r) => !r)} className="min-w-28">
          {running ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
          {running ? "Pause" : "Start"}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Reset timer" onClick={() => reset("focus")}>
          <RotateCcw className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
