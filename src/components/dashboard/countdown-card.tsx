import { differenceInCalendarDays, parseISO } from "date-fns";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysUntil, formatDate } from "@/lib/utils/format";

/**
 * Countdown card (Section 2). Pairs the exam countdown with the honest
 * comparison that matters: prep window used vs syllabus actually covered.
 */
export function CountdownCard({
  examDate,
  examYear,
  category,
  quota,
  syllabusPct,
  startDate,
  className,
}: {
  examDate?: string | null;
  examYear?: number;
  category?: string | null;
  quota?: string | null;
  syllabusPct: number;
  startDate?: string | null;
  className?: string;
}) {
  const days = daysUntil(examDate);
  const total = examDate && startDate ? differenceInCalendarDays(parseISO(examDate), parseISO(startDate)) : null;
  const windowUsed = total && total > 0 ? Math.min(100, Math.round(((total - days) / total) * 100)) : null;
  const digits = String(days).split("");

  return (
    <section className={cn("surface focus-glow flex flex-col justify-between p-5", className)} aria-label="Exam countdown">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-caption text-muted-foreground">
            <CalendarClock className="size-4" strokeWidth={1.5} aria-hidden /> Days to NEET {examYear ?? ""}
          </p>
          <p className="mt-2 flex items-baseline gap-0.5 font-mono text-display font-bold leading-none tracking-tight">
            {examDate
              ? digits.map((d, i) => (
                  <span key={i} className="rise-in num" style={{ animationDelay: `${i * 70}ms` }}>
                    {d}
                  </span>
                ))
              : "—"}
          </p>
          <p className="mt-2 text-caption text-muted-foreground">
            {examDate ? formatDate(examDate, "EEEE, d MMMM yyyy") : "Set your exam date in Settings"}
          </p>
        </div>
        <div className="text-right text-caption text-muted-foreground">
          {category ? <p className="rounded-full border border-border px-2 py-0.5">{category}</p> : null}
          {quota ? <p className="mt-1 rounded-full border border-border px-2 py-0.5">{quota}</p> : null}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <Bar label="Prep window used" value={windowUsed ?? 0} unknown={windowUsed === null} tone="neutral" />
        <Bar label="Syllabus complete" value={syllabusPct} tone="primary" />
        {windowUsed !== null ? (
          <p className="text-caption text-muted-foreground">
            {syllabusPct >= windowUsed
              ? `You are ${syllabusPct - windowUsed} points ahead of your own clock.`
              : `Coverage is trailing the clock by ${windowUsed - syllabusPct} points.`}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Bar({ label, value, tone, unknown }: { label: string; value: number; tone: string; unknown?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between text-caption">
        <span className="text-muted-foreground">{label}</span>
        <span className="num">{unknown ? "—" : `${value}%`}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${unknown ? 0 : value}%`, backgroundColor: `var(--color-${tone})` }}
        />
      </div>
    </div>
  );
}
