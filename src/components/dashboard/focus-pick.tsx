import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePriorityScores, useRecomputePriority } from "@/hooks/use-priority";
import { useSubjects } from "@/hooks/use-curriculum";
import { subjectToken } from "@/lib/utils/format";
import { SubjectIcon } from "@/components/shared/subject-icons";

/**
 * AI Focus Pick (Section 2 + 5.1).
 * Reads the top-ranked row from priority_scores; it never computes its own
 * ranking, and it always shows the reasoning behind the pick.
 */
export function FocusPick({ className }: { className?: string }) {
  const { data: scores = [], isLoading } = usePriorityScores(5);
  const { data: subjects = [] } = useSubjects();
  const recompute = useRecomputePriority();
  const top = scores[0];
  const [visibleId, setVisibleId] = useState<string | undefined>(top?.topic_id);

  // Cross-fade rather than swap abruptly.
  useEffect(() => {
    if (top?.topic_id && top.topic_id !== visibleId) {
      const t = setTimeout(() => setVisibleId(top.topic_id), 60);
      return () => clearTimeout(t);
    }
  }, [top?.topic_id, visibleId]);

  // First visit with no computed ranking yet: compute it silently, once.
  useEffect(() => {
    if (!isLoading && scores.length === 0 && recompute.isIdle) recompute.mutate();
  }, [isLoading, scores.length, recompute]);

  const subject = subjects.find((s) => s.id === top?.topics?.chapters.subject_id);
  const tone = subjectToken(subject?.slug);

  return (
    <section
      className={cn("surface focus-glow relative flex flex-col p-5", className)}
      aria-label="AI focus pick"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-subheading font-semibold">
          <Sparkles className="size-4 text-primary" strokeWidth={1.5} aria-hidden /> Focus pick
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Recompute recommendation"
          onClick={() => recompute.mutate()}
          disabled={recompute.isPending}
        >
          <RefreshCw className={cn("size-4", recompute.isPending && "animate-spin")} aria-hidden />
        </Button>
      </div>

      {!top ? (
        <div className="mt-4 flex flex-1 flex-col justify-between gap-4">
          <p className="text-caption text-muted-foreground">
            {recompute.isPending
              ? "Ranking your syllabus by weightage, mastery and recency…"
              : "Nothing ranked yet. Start your first session and the engine takes over from there."}
          </p>
          <Button asChild>
            <Link to="/syllabus">Start your first session</Link>
          </Button>
        </div>
      ) : (
        <div
          key={visibleId}
          className="mt-4 flex flex-1 flex-col justify-between gap-4 transition-opacity duration-300"
          style={{ opacity: visibleId === top.topic_id ? 1 : 0 }}
        >
          <div>
            <div className="flex items-center gap-2 text-caption text-muted-foreground">
              <SubjectIcon slug={subject?.slug} className="size-4" />
              {subject?.name ?? "Syllabus"} · {top.topics?.chapters.name}
            </div>
            <p className="mt-1 font-display text-subheading font-bold">{top.topics?.name}</p>
            <p className="mt-2 text-caption text-muted-foreground">{top.reason}</p>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-caption">
              <div>
                <dt className="text-muted-foreground">Weightage</dt>
                <dd className="num font-medium">{top.weightage}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Mastery</dt>
                <dd className="num font-medium">{Math.round(Number(top.mastery) * 100)}%</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Urgency</dt>
                <dd className="num font-medium">×{Number(top.recency_multiplier).toFixed(2)}</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/focus" search={{ topic: top.topic_id } as never}>
                Start focused session
              </Link>
            </Button>
            {/* Confidence-driven picks hand off to the diagnostic view instead. */}
            <Button variant="outline" asChild>
              <Link to={top.driver === "confidence" ? "/syllabus/confidence" : "/syllabus/topics"}>
                {top.driver === "confidence" ? "Why — confidence gap" : "See topic detail"}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
