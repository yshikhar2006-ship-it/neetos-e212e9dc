import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { eachDayOfInterval, format, parseISO, subDays } from "date-fns";
import { Activity, Clock, Crosshair, Target, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";
import { StatCard, ProgressBar } from "@/components/shared/stat-card";
import { SubjectBadge } from "@/components/shared/subject-badge";
import {
  ChartDataTable,
  DonutChart,
  GroupedBarChart,
  HeatmapGrid,
  LineChart,
  QuadrantScatter,
  SubjectRadarChart,
} from "@/components/shared/charts";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAnswerRows, useTestAttempts } from "@/hooks/use-performance";
import { useErrorLog, MISTAKE_TYPES, type MistakeType } from "@/hooks/use-error-log";
import { useHabitLogs } from "@/hooks/use-habits";
import { useSubjects } from "@/hooks/use-curriculum";
import { usePriorityScores, useStrongestTopics } from "@/hooks/use-priority";
import { estimateRank } from "@/lib/utils/scoring";
import { formatDate, pct, subjectToken } from "@/lib/utils/format";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — NEET OS" },
      { name: "description", content: "Score trends, accuracy, time per question and weak areas." },
      { property: "og:title", content: "Analytics — NEET OS" },
      { property: "og:description", content: "Score trends, accuracy, time per question and weak areas." },
    ],
  }),
  component: AnalyticsPage,
});

const RANGES = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "All time" },
];

const MISTAKE_LABEL: Record<MistakeType, string> = {
  conceptual: "Conceptual",
  silly: "Silly",
  calculation: "Calculation",
  time_pressure: "Time pressure",
  misread: "Misread",
  guessed: "Guessed",
  unattempted: "Unattempted",
};

function AnalyticsPage() {
  const [range, setRange] = useState("90");
  const days = Number(range);

  const { data: attempts = [], isLoading: attemptsLoading } = useTestAttempts();
  const { data: answers = [] } = useAnswerRows();
  const { data: subjects = [] } = useSubjects();
  const { data: logs = [] } = useHabitLogs(Math.max(days, 91));
  const { data: errors = [] } = useErrorLog();
  const { data: weak = [] } = usePriorityScores(8);
  const { data: strong = [] } = useStrongestTopics(5);

  const since = useMemo(() => subDays(new Date(), days), [days]);

  const submitted = useMemo(
    () =>
      attempts
        .filter((a) => a.submitted_at && parseISO(a.submitted_at) >= since)
        .sort((a, b) => (a.submitted_at! < b.submitted_at! ? -1 : 1)),
    [attempts, since],
  );

  const rangedAnswers = useMemo(
    () => answers.filter((a) => parseISO(a.created_at) >= since),
    [answers, since],
  );

  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  /* ---------------- Overview ---------------- */
  const scoreSeries = useMemo(
    () =>
      submitted.map((a) => ({
        date: formatDate(a.submitted_at, "d MMM"),
        score: a.score,
        accuracy: Number(a.accuracy ?? 0),
      })),
    [submitted],
  );

  const latest = submitted.at(-1);
  const previous = submitted.at(-2);
  const avgScore = submitted.length
    ? Math.round(submitted.reduce((s, a) => s + a.score, 0) / submitted.length)
    : 0;
  const bestScore = submitted.reduce((m, a) => Math.max(m, a.score), 0);
  const totalAttempted = rangedAnswers.filter((a) => a.selected_option !== null).length;
  const totalCorrect = rangedAnswers.filter((a) => a.is_correct).length;
  const accuracy = pct(totalCorrect, totalAttempted || 1);
  const rank = estimateRank(latest?.score ?? avgScore);

  const answerSplit = useMemo(
    () => [
      { name: "Correct", value: rangedAnswers.filter((a) => a.is_correct).length, tone: "success" },
      {
        name: "Incorrect",
        value: rangedAnswers.filter((a) => a.selected_option !== null && !a.is_correct).length,
        tone: "destructive",
      },
      { name: "Skipped", value: rangedAnswers.filter((a) => a.selected_option === null).length, tone: "muted" },
    ],
    [rangedAnswers],
  );

  /* ---------------- Subjects ---------------- */
  const subjectStats = useMemo(
    () =>
      subjects.map((s) => {
        const rows = rangedAnswers.filter((a) => a.subject_id === s.id);
        const attempted = rows.filter((a) => a.selected_option !== null);
        const correct = attempted.filter((a) => a.is_correct).length;
        const avgTime = rows.length
          ? Math.round(rows.reduce((t, a) => t + a.time_spent_seconds, 0) / rows.length)
          : 0;
        const byDifficulty = (d: string) => {
          const set = attempted.filter((a) => a.difficulty === d);
          return set.length ? pct(set.filter((a) => a.is_correct).length, set.length) : 0;
        };
        return {
          id: s.id,
          slug: s.slug,
          name: s.name,
          attempted: attempted.length,
          accuracy: attempted.length ? pct(correct, attempted.length) : 0,
          avgTime,
          easy: byDifficulty("easy"),
          medium: byDifficulty("medium"),
          hard: byDifficulty("hard"),
        };
      }),
    [subjects, rangedAnswers],
  );

  const radarData = useMemo(
    () =>
      subjectStats.map((s) => ({
        subject: s.name,
        accuracy: s.accuracy,
        volume: Math.min(100, s.attempted),
      })),
    [subjectStats],
  );

  /* ---------------- Time ---------------- */
  const heatValues = useMemo(() => {
    const map = new Map(logs.map((l) => [l.log_date, Number(l.study_hours ?? 0)]));
    return eachDayOfInterval({ start: subDays(new Date(), Math.min(days, 182) - 1), end: new Date() }).map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const value = map.get(key) ?? 0;
      return { date: key, value, label: `${format(d, "d MMM")}: ${value}h studied` };
    });
  }, [logs, days]);

  const speedScatter = useMemo(
    () =>
      subjectStats
        .filter((s) => s.attempted > 0)
        .map((s) => ({ x: s.avgTime, y: s.accuracy, name: s.name, tone: subjectToken(s.slug) })),
    [subjectStats],
  );

  const paceSeries = useMemo(
    () =>
      submitted.map((a) => {
        const attemptedCount = (a.correct_count ?? 0) + (a.incorrect_count ?? 0);
        return {
          date: formatDate(a.submitted_at, "d MMM"),
          seconds: attemptedCount ? Math.round(a.time_taken_seconds / attemptedCount) : 0,
        };
      }),
    [submitted],
  );

  /* ---------------- Mistakes ---------------- */
  const mistakeCounts = useMemo(
    () =>
      MISTAKE_TYPES.map((t) => ({
        type: t,
        label: MISTAKE_LABEL[t],
        count: errors.filter((e) => e.mistake_type === t).length,
        open: errors.filter((e) => e.mistake_type === t && !e.resolved).length,
      })).sort((a, b) => b.count - a.count),
    [errors],
  );

  const mistakeColumns: Column<(typeof mistakeCounts)[number]>[] = [
    { key: "label", header: "Mistake type", sortValue: (r) => r.label, render: (r) => r.label },
    { key: "count", header: "Logged", numeric: true, sortValue: (r) => r.count, render: (r) => r.count },
    { key: "open", header: "Unresolved", numeric: true, sortValue: (r) => r.open, render: (r) => r.open },
    {
      key: "share",
      header: "Share",
      render: (r) => <ProgressBar value={pct(r.count, errors.length || 1)} className="min-w-24" />,
    },
  ];

  if (!attemptsLoading && attempts.length === 0 && answers.length === 0) {
    return (
      <>
        <PageHeader title="Analytics" description="Score trends, accuracy, time per question and weak areas." />
        <EmptyState
          icon={TrendingUp}
          title="No performance data yet"
          description="Take your first mock or chapter test and this dashboard fills in automatically."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Score trends, accuracy, time per question and weak areas."
        actions={<FilterBar label="Date range" options={RANGES} value={range} onChange={setRange} />}
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 flex w-full flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="mistakes">Mistakes</TabsTrigger>
        </TabsList>

        {/* ---------- Overview ---------- */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Latest score"
              value={latest?.score ?? 0}
              suffix={`/ ${latest?.max_score ?? 720}`}
              icon={Target}
              trend={latest && previous ? latest.score - previous.score : undefined}
              hint={latest ? formatDate(latest.submitted_at) : "No submitted test yet"}
            />
            <StatCard label="Average score" value={avgScore} suffix="pts" icon={Activity} hint={`${submitted.length} tests`} />
            <StatCard label="Best score" value={bestScore} suffix="pts" accent="success" icon={TrendingUp} />
            <StatCard
              label="Accuracy"
              value={accuracy}
              suffix="%"
              icon={Crosshair}
              hint={`${totalCorrect}/${totalAttempted} attempted correct`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <section className="surface min-w-0 p-5 lg:col-span-8" aria-label="Score trend">
              <h2 className="text-subheading font-semibold">Score and accuracy trend</h2>
              {scoreSeries.length > 1 ? (
                <>
                  <div className="mt-3">
                    <LineChart
                      data={scoreSeries}
                      xKey="date"
                      yKeys={[
                        { key: "score", tone: "primary", label: "Score" },
                        { key: "accuracy", tone: "success", label: "Accuracy %" },
                      ]}
                      height={260}
                    />
                  </div>
                  <ChartDataTable
                    caption="Score and accuracy per submitted test"
                    columns={["Date", "Score", "Accuracy %"]}
                    rows={scoreSeries.map((s) => [s.date, s.score, s.accuracy])}
                  />
                </>
              ) : (
                <p className="mt-6 text-caption text-muted-foreground">
                  Submit at least two tests in this range to see a trend line.
                </p>
              )}
            </section>

            <section className="surface min-w-0 p-5 lg:col-span-4" aria-label="Answer split">
              <h2 className="text-subheading font-semibold">Answer split</h2>
              <div className="mt-3">
                <DonutChart data={answerSplit} height={200} />
              </div>
              <ul className="mt-3 space-y-1.5">
                {answerSplit.map((d) => (
                  <li key={d.name} className="flex items-center justify-between text-caption">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className="size-2 rounded-full" style={{ backgroundColor: `var(--color-${d.tone})` }} />
                      {d.name}
                    </span>
                    <span className="num font-medium">{d.value}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="surface min-w-0 p-5 lg:col-span-6" aria-label="Rank projection">
              <h2 className="text-subheading font-semibold">Projected rank</h2>
              <p className="num mt-3 text-heading font-semibold">
                {rank.rank_low.toLocaleString("en-IN")} – {rank.rank_high.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-caption text-muted-foreground">
                Estimated from a score of {latest?.score ?? avgScore} · {rank.percentile}th percentile. This is an
                estimate, not a guarantee.
              </p>
            </section>

            <section className="surface min-w-0 p-5 lg:col-span-6" aria-label="Priority topics">
              <h2 className="text-subheading font-semibold">Highest-priority topics</h2>
              <ul className="mt-3 space-y-2">
                {weak.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-caption">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.topics?.name ?? "Topic"}</span>
                      <span className="block truncate text-muted-foreground">{p.reason ?? p.driver}</span>
                    </span>
                    <span className="num shrink-0 font-medium text-primary">{Number(p.score).toFixed(1)}</span>
                  </li>
                ))}
                {weak.length === 0 ? (
                  <li className="text-caption text-muted-foreground">Recompute priorities from the dashboard first.</li>
                ) : null}
              </ul>
            </section>
          </div>
        </TabsContent>

        {/* ---------- Subjects ---------- */}
        <TabsContent value="subjects" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {subjectStats.map((s) => (
              <StatCard
                key={s.id}
                label={s.name}
                value={s.accuracy}
                suffix="% accuracy"
                accent={subjectToken(s.slug)}
                hint={`${s.attempted} questions · ${s.avgTime}s avg`}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <section className="surface min-w-0 p-5 lg:col-span-6" aria-label="Accuracy by difficulty">
              <h2 className="text-subheading font-semibold">Accuracy by difficulty</h2>
              <div className="mt-3">
                <GroupedBarChart
                  data={subjectStats.map((s) => ({ subject: s.name, easy: s.easy, medium: s.medium, hard: s.hard }))}
                  xKey="subject"
                  series={[
                    { key: "easy", label: "Easy", tone: "success" },
                    { key: "medium", label: "Medium", tone: "warning" },
                    { key: "hard", label: "Hard", tone: "destructive" },
                  ]}
                  domain={[0, 100]}
                />
              </div>
              <ChartDataTable
                caption="Accuracy percentage by subject and difficulty"
                columns={["Subject", "Easy", "Medium", "Hard"]}
                rows={subjectStats.map((s) => [s.name, s.easy, s.medium, s.hard])}
              />
            </section>

            <section className="surface min-w-0 p-5 lg:col-span-6" aria-label="Subject comparison">
              <h2 className="text-subheading font-semibold">Subject comparison</h2>
              <div className="mt-3">
                <SubjectRadarChart
                  data={radarData}
                  series={[
                    { key: "accuracy", label: "Accuracy %", tone: "primary" },
                    { key: "volume", label: "Practice volume", tone: "success" },
                  ]}
                />
              </div>
            </section>

            <section className="surface min-w-0 p-5 lg:col-span-6" aria-label="Strongest topics">
              <h2 className="text-subheading font-semibold">Strongest topics</h2>
              <ul className="mt-3 space-y-2">
                {strong.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-caption">
                    <span className="min-w-0 truncate font-medium">{p.topics?.name ?? "Topic"}</span>
                    <span className="num shrink-0 text-success">{Math.round(Number(p.mastery) * 100)}% mastery</span>
                  </li>
                ))}
                {strong.length === 0 ? (
                  <li className="text-caption text-muted-foreground">Not enough data yet.</li>
                ) : null}
              </ul>
            </section>

            <section className="surface min-w-0 p-5 lg:col-span-6" aria-label="Weakest subject detail">
              <h2 className="text-subheading font-semibold">Where to spend the next hour</h2>
              <ul className="mt-3 space-y-3">
                {[...subjectStats]
                  .filter((s) => s.attempted > 0)
                  .sort((a, b) => a.accuracy - b.accuracy)
                  .slice(0, 3)
                  .map((s) => (
                    <li key={s.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <SubjectBadge slug={s.slug} size="sm" />
                        <span className="num text-caption text-muted-foreground">{s.accuracy}%</span>
                      </div>
                      <ProgressBar value={s.accuracy} />
                    </li>
                  ))}
                {subjectStats.every((s) => s.attempted === 0) ? (
                  <li className="text-caption text-muted-foreground">Practise a few questions to unlock this.</li>
                ) : null}
              </ul>
            </section>
          </div>
        </TabsContent>

        {/* ---------- Time ---------- */}
        <TabsContent value="time" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Total study hours"
              value={logs.reduce((t, l) => t + Number(l.study_hours ?? 0), 0).toFixed(1)}
              suffix="h"
              icon={Clock}
              hint={`Across ${logs.length} logged days`}
            />
            <StatCard
              label="Avg per active day"
              value={
                logs.length
                  ? (logs.reduce((t, l) => t + Number(l.study_hours ?? 0), 0) / logs.length).toFixed(1)
                  : "0.0"
              }
              suffix="h"
            />
            <StatCard
              label="Pomodoros"
              value={logs.reduce((t, l) => t + Number(l.pomodoro_count ?? 0), 0)}
              suffix="sessions"
            />
          </div>

          <section className="surface p-5" aria-label="Study consistency heatmap">
            <h2 className="text-subheading font-semibold">Consistency</h2>
            <div className="mt-4">
              <HeatmapGrid values={heatValues} />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <section className="surface min-w-0 p-5 lg:col-span-6" aria-label="Speed versus accuracy">
              <h2 className="text-subheading font-semibold">Speed vs accuracy</h2>
              <p className="mt-1 text-caption text-muted-foreground">
                Top-left is ideal: fast and accurate. Bottom-right needs work.
              </p>
              <div className="mt-3">
                <QuadrantScatter data={speedScatter} xReference={60} />
              </div>
              <ChartDataTable
                caption="Average seconds per question against accuracy, by subject"
                columns={["Subject", "Avg seconds", "Accuracy %"]}
                rows={speedScatter.map((d) => [d.name, d.x, d.y])}
              />
            </section>

            <section className="surface min-w-0 p-5 lg:col-span-6" aria-label="Pace per test">
              <h2 className="text-subheading font-semibold">Pace per test</h2>
              {paceSeries.length > 1 ? (
                <>
                  <div className="mt-3">
                    <LineChart data={paceSeries} xKey="date" yKey="seconds" tone="warning" height={240} />
                  </div>
                  <ChartDataTable
                    caption="Average seconds per attempted question per test"
                    columns={["Date", "Seconds / question"]}
                    rows={paceSeries.map((p) => [p.date, p.seconds])}
                  />
                </>
              ) : (
                <p className="mt-6 text-caption text-muted-foreground">Submit more tests to compare pace over time.</p>
              )}
            </section>
          </div>
        </TabsContent>

        {/* ---------- Mistakes ---------- */}
        <TabsContent value="mistakes" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Mistakes logged" value={errors.length} icon={Crosshair} />
            <StatCard
              label="Unresolved"
              value={errors.filter((e) => !e.resolved).length}
              accent="warning"
              hint="Clear these in the Error Log"
            />
            <StatCard
              label="Turned into flashcards"
              value={errors.filter((e) => e.converted_to_flashcard).length}
              accent="success"
            />
          </div>

          <section className="surface p-5" aria-label="Mistake breakdown">
            <h2 className="text-subheading font-semibold">Mistake breakdown</h2>
            <div className="mt-4">
              <DataTable
                rows={mistakeCounts}
                columns={mistakeColumns}
                rowKey={(r) => r.type}
                defaultSort={{ key: "count", dir: "desc" }}
                emptyMessage="No mistakes logged yet."
              />
            </div>
          </section>

          <section className="surface p-5" aria-label="Subjects driving mistakes">
            <h2 className="text-subheading font-semibold">Incorrect answers by subject</h2>
            <div className="mt-3">
              <GroupedBarChart
                data={subjects.map((s) => ({
                  subject: subjectById.get(s.id)?.name ?? s.name,
                  incorrect: rangedAnswers.filter(
                    (a) => a.subject_id === s.id && a.selected_option !== null && !a.is_correct,
                  ).length,
                  skipped: rangedAnswers.filter((a) => a.subject_id === s.id && a.selected_option === null).length,
                }))}
                xKey="subject"
                series={[
                  { key: "incorrect", label: "Incorrect", tone: "destructive" },
                  { key: "skipped", label: "Skipped", tone: "warning" },
                ]}
              />
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}
