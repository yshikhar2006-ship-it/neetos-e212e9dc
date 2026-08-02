import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { eachDayOfInterval, format, parseISO, subDays } from "date-fns";
import { Flame, Moon, Save, Smile, Timer } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/app-shell";
import { StatCard, ProgressBar } from "@/components/shared/stat-card";
import { HeatmapGrid, LineChart, ChartDataTable } from "@/components/shared/charts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { streakFrom, useHabitLogs, useUpsertHabitLog } from "@/hooks/use-habits";
import { useTopicProgress } from "@/hooks/use-topic-progress";
import { useFlashcardReviews } from "@/hooks/use-performance";
import { productivityScore } from "@/lib/utils/productivity";
import { useProfile } from "@/hooks/use-profile";
import { todayISO } from "@/lib/utils/format";

export const Route = createFileRoute("/_authenticated/habits")({
  head: () => ({
    meta: [
      { title: "Habit Tracker — NEET OS" },
      { name: "description", content: "Streaks, study hours, sleep and mood — the inputs behind every score." },
      { property: "og:title", content: "Habit Tracker — NEET OS" },
      { property: "og:description", content: "Streaks, study hours, sleep and mood — the inputs behind every score." },
    ],
  }),
  component: HabitsPage,
});

const MOODS = ["Rough", "Low", "Okay", "Good", "Great"];

function HabitsPage() {
  const { data: logs = [] } = useHabitLogs(180);
  const { data: progress = [] } = useTopicProgress();
  const { data: reviews = [] } = useFlashcardReviews();
  const { data: profile } = useProfile();
  const upsert = useUpsertHabitLog();

  const today = todayISO();
  const todayLog = logs.find((l) => l.log_date === today);

  const [hours, setHours] = useState<string>(todayLog ? String(todayLog.study_hours) : "");
  const [sleep, setSleep] = useState<string>(todayLog?.sleep_hours != null ? String(todayLog.sleep_hours) : "");
  const [mood, setMood] = useState<number>(todayLog?.mood ?? 3);
  const [note, setNote] = useState<string>(todayLog?.note ?? "");

  const streak = useMemo(() => streakFrom(logs), [logs]);
  const productivity = useMemo(() => productivityScore(logs, progress, reviews), [logs, progress, reviews]);

  const byDate = useMemo(() => new Map(logs.map((l) => [l.log_date, l])), [logs]);
  const heatmap = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 118), end: new Date() });
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const value = Number(byDate.get(key)?.study_hours ?? 0);
      return { date: key, value, label: `${format(d, "d MMM")}: ${value}h studied` };
    });
  }, [byDate]);

  const last30 = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const log = byDate.get(key);
      return {
        label: format(d, "d MMM"),
        hours: Number(log?.study_hours ?? 0),
        sleep: Number(log?.sleep_hours ?? 0),
      };
    });
  }, [byDate]);

  const weekHours = last30.slice(-7).reduce((s, d) => s + d.hours, 0);
  const target = (profile?.daily_study_hours ?? 6) * 7;
  const avgSleep = (() => {
    const rows = logs.filter((l) => l.sleep_hours != null).slice(-14);
    return rows.length ? Number((rows.reduce((s, l) => s + Number(l.sleep_hours), 0) / rows.length).toFixed(1)) : 0;
  })();

  const save = () => {
    upsert.mutate(
      {
        log_date: today,
        study_hours: Number(hours || 0),
        sleep_hours: sleep === "" ? null : Number(sleep),
        mood,
        note: note.trim() || null,
        pomodoro_count: todayLog?.pomodoro_count ?? 0,
      },
      {
        onSuccess: () => toast.success("Today's log saved."),
        onError: () => toast.error("Could not save today's log."),
      },
    );
  };

  return (
    <>
      <PageHeader title="Habit Tracker" description="Consistency, sleep and mood — logged daily, used everywhere." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current streak" value={streak} suffix="days" icon={Flame} accent={streak ? "success" : "warning"} />
        <StatCard label="Hours this week" value={weekHours.toFixed(1)} suffix={`/ ${target}`} icon={Timer} />
        <StatCard label="Avg sleep (14d)" value={avgSleep || "—"} suffix={avgSleep ? "h" : undefined} icon={Moon} accent="primary" />
        <StatCard
          label="Productivity score"
          value={productivity.score ?? "—"}
          icon={Smile}
          accent={(productivity.score ?? 0) >= 70 ? "success" : "warning"}
          hint={productivity.score == null ? "Log 3+ days to unlock" : `${productivity.daysLogged}/14 days logged`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="surface p-5">
          <h2 className="text-subheading font-semibold">Log today</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="habit-hours" className="text-caption font-medium">
                Study hours
              </label>
              <Input id="habit-hours" type="number" min={0} max={18} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} placeholder="6" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="habit-sleep" className="text-caption font-medium">
                Sleep hours
              </label>
              <Input id="habit-sleep" type="number" min={0} max={14} step={0.5} value={sleep} onChange={(e) => setSleep(e.target.value)} placeholder="7" />
            </div>
            <div className="space-y-2">
              <span className="text-caption font-medium">Mood — {MOODS[mood - 1]}</span>
              <Slider value={[mood]} min={1} max={5} step={1} onValueChange={([v]) => setMood(v ?? 3)} aria-label="Mood" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="habit-note" className="text-caption font-medium">
                Note
              </label>
              <Textarea id="habit-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What worked, what didn't." />
            </div>
            <Button onClick={save} disabled={upsert.isPending} className="w-full">
              <Save className="size-4" aria-hidden /> Save today
            </Button>
          </div>
        </section>

        <section className="surface p-5 lg:col-span-2">
          <h2 className="text-subheading font-semibold">Study heatmap</h2>
          <p className="mt-1 text-caption text-muted-foreground">Last 17 weeks of logged study hours.</p>
          <HeatmapGrid values={heatmap} className="mt-4" />

          <div className="mt-6 space-y-3">
            <h3 className="text-caption font-medium text-muted-foreground">Hours vs sleep — last 30 days</h3>
            <LineChart
              data={last30}
              xKey="label"
              yKeys={[
                { key: "hours", tone: "primary", label: "Study hours" },
                { key: "sleep", tone: "botany", label: "Sleep hours" },
              ]}
              height={220}
            />
            <ChartDataTable
              caption="Study and sleep hours by day"
              columns={["Day", "Study hours", "Sleep hours"]}
              rows={last30.map((d) => [d.label, d.hours, d.sleep])}
            />
          </div>
        </section>
      </div>

      <section className="surface mt-6 p-5">
        <h2 className="text-subheading font-semibold">Productivity breakdown</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Metric label="Consistency" value={productivity.consistency} tone="primary" />
          <Metric label="Efficiency" value={productivity.efficiency} tone="success" />
          <Metric label="Revision discipline" value={productivity.revisionDiscipline} tone="warning" />
        </div>
      </section>

      <section className="surface mt-6 p-5">
        <h2 className="text-subheading font-semibold">Recent logs</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-caption">
            <thead className="bg-muted/60">
              <tr>
                {["Date", "Hours", "Sleep", "Mood", "Note"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs
                .slice()
                .reverse()
                .slice(0, 14)
                .map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="num px-3 py-2">{format(parseISO(l.log_date), "d MMM")}</td>
                    <td className="num px-3 py-2">{l.study_hours}</td>
                    <td className="num px-3 py-2">{l.sleep_hours ?? "—"}</td>
                    <td className="px-3 py-2">{l.mood ? MOODS[l.mood - 1] : "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{l.note ?? "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "primary" | "success" | "warning" }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-caption text-muted-foreground">{label}</span>
        <span className="num text-body font-semibold">{value}</span>
      </div>
      <ProgressBar value={value} tone={tone} label={label} className="mt-2" />
    </div>
  );
}
