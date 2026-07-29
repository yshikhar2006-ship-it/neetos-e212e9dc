import { CalendarDays } from "lucide-react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format";

export function CountdownWidget({
  examDate,
  compact = false,
  className,
}: {
  examDate?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const target = examDate ? parseISO(examDate) : null;
  const days = target ? Math.max(0, differenceInCalendarDays(target, new Date())) : null;
  const weeks = days !== null ? Math.floor(days / 7) : null;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg bg-accent/60 px-3 py-2 text-caption",
          className,
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 truncate text-muted-foreground">
          {days === null ? (
            "Set your exam date"
          ) : (
            <>
              <span className="num font-semibold text-foreground">{days}</span> days to NEET
            </>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("surface p-5", className)}>
      <div className="flex items-center gap-2 text-caption font-medium text-muted-foreground">
        <CalendarDays className="size-4 text-primary" aria-hidden />
        NEET {target ? formatDate(examDate, "yyyy") : ""} countdown
      </div>
      <div className="mt-3 flex items-end gap-3">
        <span className="num text-display font-semibold leading-none text-foreground">
          {days ?? "—"}
        </span>
        <span className="pb-1 text-subheading text-muted-foreground">days left</span>
      </div>
      <p className="mt-2 text-caption text-muted-foreground">
        {days === null
          ? "Add your exam date in Settings to start the countdown."
          : `That's ${weeks} weeks — exam day is ${formatDate(examDate, "EEEE, d MMMM yyyy")}.`}
      </p>
    </div>
  );
}
