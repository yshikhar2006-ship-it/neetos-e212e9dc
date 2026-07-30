import { useMemo } from "react";
import { eachDayOfInterval, format, isSameDay, parseISO, subDays } from "date-fns";
import { Link } from "@tanstack/react-router";
import { CalendarDays, LineChart as LineIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChartDataTable, HeatmapGrid, LineChart } from "@/components/shared/charts";
import { useHabitLogs } from "@/hooks/use-habits";
import { useStudyBlocks } from "@/hooks/use-study-blocks";
import { useSubjects } from "@/hooks/use-curriculum";
import { todayISO } from "@/lib/utils/format";

/** Weekly study-hours line chart, sourced from habit_logs (Section 2). */
export function WeeklyHours({ className }: { className?: string }) {
  const { data: logs = [] } = useHabitLogs(14);
  const data = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const log = logs.find((l) => l.log_date === key);
      return { day: format(d, "EEE"), hours: Number(log?.study_hours ?? 0) };
    });
  }, [logs]);

  return (
    <section className={cn("surface p-5", className)} aria-label="Weekly study hours">
      <h2 className="flex items-center gap-2 text-subheading font-semibold">
        <LineIcon className="size-4 text-primary" strokeWidth={1.5} aria-hidden /> Study hours, last 7 days
      </h2>
      <div className="mt-3">
        <LineChart data={data} xKey="day" yKey="hours" height={200} />
      </div>
      <ChartDataTable
        caption="Study hours over the last seven days"
        columns={["Day", "Hours"]}
        rows={data.map((d) => [d.day, d.hours])}
      />
    </section>
  );
}

/** Consistency heatmap — the shared HeatmapGrid on the shared habit_logs data. */
export function ConsistencyWidget({ className, days = 91 }: { className?: string; days?: number }) {
  const { data: logs = [] } = useHabitLogs(days);
  const values = useMemo(() => {
    const map = new Map(logs.map((l) => [l.log_date, Number(l.study_hours ?? 0)]));
    return eachDayOfInterval({ start: subDays(new Date(), days - 1), end: new Date() }).map((d) => {
      const key = format(d, "yyyy-MM-dd");
      return { date: key, value: map.get(key) ?? 0, label: `${format(d, "d MMM")}: ${map.get(key) ?? 0}h studied` };
    });
  }, [logs, days]);

  return (
    <section className={cn("surface p-5", className)} aria-label="Study consistency">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-subheading font-semibold">Consistency</h2>
        <Link to="/habits" className="text-caption text-primary underline-offset-2 hover:underline">
          Habit tracker
        </Link>
      </div>
      <div className="mt-4">
        <HeatmapGrid values={values} />
      </div>
    </section>
  );
}

/** 7-day mini calendar strip with per-subject dots and mock badges. */
export function MiniCalendar({ className }: { className?: string }) {
  const start = format(subDays(new Date(), 3), "yyyy-MM-dd");
  const end = format(subDays(new Date(), -3), "yyyy-MM-dd");
  const { data: blocks = [] } = useStudyBlocks(start, end);
  const { data: subjects = [] } = useSubjects();
  const today = todayISO();

  const days = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) });

  return (
    <section className={cn("surface p-5", className)} aria-label="Week at a glance">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-subheading font-semibold">
          <CalendarDays className="size-4 text-primary" strokeWidth={1.5} aria-hidden /> This week
        </h2>
        <Link to="/calendar" className="text-caption text-primary underline-offset-2 hover:underline">
          Calendar
        </Link>
      </div>
      <ol className="mt-4 grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const dayBlocks = blocks.filter((b) => b.block_date === key);
          const tones = new Set(
            dayBlocks
              .map((b) => subjects.find((s) => b.title.toLowerCase().includes(s.name.toLowerCase()))?.slug)
              .filter(Boolean) as string[],
          );
          const hasMock = dayBlocks.some((b) => b.type === "mock_test");
          return (
            <li
              key={key}
              className={cn(
                "relative rounded-lg border p-2 text-center",
                isSameDay(d, new Date()) ? "border-primary bg-primary/10" : "border-border",
              )}
            >
              <span className="block text-caption text-muted-foreground">{format(d, "EEEEE")}</span>
              <span className="num block text-caption font-medium">{format(d, "d")}</span>
              <span className="mt-1 flex h-2 items-center justify-center gap-0.5">
                {[...tones].slice(0, 4).map((t) => (
                  <span key={t} className="size-1.5 rounded-full" style={{ backgroundColor: `var(--color-${t})` }} />
                ))}
              </span>
              {hasMock ? (
                <span className="absolute -right-1 -top-1 rounded-full bg-warning px-1 text-[9px] font-semibold text-warning-foreground">
                  M
                </span>
              ) : null}
              <span className="sr-only">
                {format(d, "d MMM")}: {dayBlocks.length} blocks{hasMock ? ", mock scheduled" : ""}
              </span>
            </li>
          );
        })}
      </ol>
      {today ? null : null}
    </section>
  );
}
