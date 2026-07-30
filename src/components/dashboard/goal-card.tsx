import { Link } from "@tanstack/react-router";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import { useTestAttempts } from "@/hooks/use-performance";

/** Goal card (Section 2) — target, progress toward it, and the exact mark gap. */
export function GoalCard({ className }: { className?: string }) {
  const { data: profile } = useProfile();
  const { data: attempts = [] } = useTestAttempts();

  const scored = attempts.filter((a) => a.submitted_at);
  const best = scored.reduce((m, a) => Math.max(m, a.score), 0);
  const target = profile?.target_score ?? 650;
  const progress = Math.min(100, Math.round((best / target) * 100));
  const gap = Math.max(0, target - best);

  return (
    <Link
      to="/goals"
      className={cn("precision-card surface block p-5", className)}
      aria-label="Goal progress"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-subheading font-semibold">
          <Target className="size-4 text-primary" strokeWidth={1.5} aria-hidden /> Goal
        </h2>
        <span className="num text-caption text-muted-foreground">{progress}%</span>
      </div>
      <p className="mt-2 text-caption text-muted-foreground">
        {profile?.target_college ? profile.target_college : "Set a dream college in Goals"}
      </p>
      <p className="mt-3 num font-display text-heading font-bold">
        {best}
        <span className="text-body font-normal text-muted-foreground"> / {target}</span>
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-caption text-muted-foreground">
        {scored.length === 0
          ? "No mock logged yet — your first attempt sets the baseline."
          : `${gap} marks to go, based on your best mock so far.`}
      </p>
    </Link>
  );
}
