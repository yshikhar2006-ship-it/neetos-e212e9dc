import { Atom, CheckCircle2, Circle, CircleDot, FlaskConical, Leaf, Rabbit, Sparkles, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { subjectToken, type SubjectSlug } from "@/lib/utils/format";
import type { TopicStatus } from "@/hooks/use-topic-progress";

const SUBJECT_META: Record<SubjectSlug, { label: string; icon: LucideIcon; className: string; dot: string }> = {
  physics: { label: "Physics", icon: Atom, className: "text-physics border-physics/40 bg-physics/10", dot: "bg-physics" },
  chemistry: {
    label: "Chemistry",
    icon: FlaskConical,
    className: "text-chemistry border-chemistry/40 bg-chemistry/10",
    dot: "bg-chemistry",
  },
  botany: { label: "Botany", icon: Leaf, className: "text-botany border-botany/40 bg-botany/10", dot: "bg-botany" },
  zoology: { label: "Zoology", icon: Rabbit, className: "text-zoology border-zoology/40 bg-zoology/10", dot: "bg-zoology" },
};

export function subjectMeta(slug?: string | null) {
  return SUBJECT_META[subjectToken(slug)];
}

/** Colour is never the only signal: icon + label always travel with it. */
export function SubjectBadge({
  slug,
  size = "md",
  className,
}: {
  slug?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = subjectMeta(slug);
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-medium",
        meta.className,
        size === "sm" ? "px-1.5 py-0.5 text-caption" : "px-2 py-1 text-caption",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}

export function SubjectDot({ slug, className }: { slug?: string | null; className?: string }) {
  return <span className={cn("inline-block size-2 rounded-full", subjectMeta(slug).dot, className)} aria-hidden />;
}

const STATUS_META: Record<TopicStatus, { label: string; icon: LucideIcon; className: string }> = {
  not_started: { label: "Not started", icon: Circle, className: "text-muted-foreground border-border bg-muted" },
  in_progress: { label: "In progress", icon: CircleDot, className: "text-warning border-warning/40 bg-warning/10" },
  completed: { label: "Completed", icon: CheckCircle2, className: "text-success border-success/40 bg-success/10" },
  revised: { label: "Revised", icon: Sparkles, className: "text-primary border-primary/40 bg-primary/10" },
  mastered: { label: "Mastered", icon: Star, className: "text-primary border-primary/50 bg-primary/15" },
};

export const TOPIC_STATUSES = Object.keys(STATUS_META) as TopicStatus[];
export const statusMeta = (status: TopicStatus) => STATUS_META[status] ?? STATUS_META.not_started;

export function StatusPill({
  status,
  className,
}: {
  status: TopicStatus;
  className?: string;
}) {
  const meta = statusMeta(status);
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-caption font-medium",
        meta.className,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}
