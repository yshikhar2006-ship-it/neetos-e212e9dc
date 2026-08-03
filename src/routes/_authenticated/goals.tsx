import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Award, Building2, CheckCircle2, Circle, Save, Sparkles, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/shared/state";
import { StatCard, ProgressBar, ProgressRing } from "@/components/shared/stat-card";
import { LineChart } from "@/components/shared/charts";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useTestAttempts } from "@/hooks/use-performance";
import { useTopicProgress } from "@/hooks/use-topic-progress";
import { useHabitLogs, streakFrom } from "@/hooks/use-habits";
import { useCutoffs, useRankPredictions, useSaveRankPrediction, type RankPrediction } from "@/hooks/use-cutoffs";
import { projectScore, rankBand, collegeChance, CHANCE_META } from "@/lib/utils/prediction";
import { daysUntil, pct } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title: "Goals — NEET OS" },
      { name: "description", content: "Target college, target rank, target score, milestones and goal history in one place." },
      { property: "og:title", content: "Goals — NEET OS" },
      { property: "og:description", content: "Target college, target rank, target score, milestones and goal history in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GoalsPage,
});

interface Milestone {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  progress: number;
}

function GoalsPage() {
  const profileQ = useProfile();
  const updateProfile = useUpdateProfile();
  const attemptsQ = useTestAttempts();
  const progressQ = useTopicProgress();
  const habitsQ = useHabitLogs(60);
  const cutoffsQ = useCutoffs();
  const predictionsQ = useRankPredictions();
  const savePrediction = useSaveRankPrediction();

  const profile = profileQ.data;
  const [draft, setDraft] = useState<{ score: string; college: string; hours: string; rank: string } | null>(null);
  const form =
    draft ??
    ({
      score: String(profile?.target_score ?? 650),
      college: profile?.target_college ?? "",
      hours: String(profile?.daily_study_hours ?? 6),
      rank: "",
    } as const);

  const attempts = attemptsQ.data ?? [];
  const progress = progressQ.data ?? [];
  const logs = habitsQ.data ?? [];
  const cutoffs = cutoffsQ.data ?? [];
  const predictions = predictionsQ.data ?? [];

  const projection = useMemo(() => projectScore(attempts), [attempts]);
  const band = useMemo(
    () => (projection.samples ? rankBand(projection.projected, projection.confidence) : null),
    [projection],
  );

  const targetScore = profile?.target_score ?? 650;
  const targetCollege = profile?.target_college ?? null;
  const completed = progress.filter((p) => ["completed", "revised", "mastered"].includes(p.status)).length;
  const coverage = pct(completed, progress.length);
  const streak = streakFrom(logs);
  const daysToExam = profile?.exam_date ? daysUntil(profile.exam_date) : null;

  const collegeRows = useMemo(() => {
    if (!targetCollege) return [];
    const matches = cutoffs
      .filter((c) => c.college_name.toLowerCase().includes(targetCollege.toLowerCase()))
      .sort((a, b) => b.year - a.year)
      .slice(0, 6);
    return matches.map((c) => ({
      ...c,
      chance: band ? collegeChance(c.closing_rank, band) : null,
    }));
  }, [cutoffs, targetCollege, band]);

  const milestones = useMemo<Milestone[]>(() => {
    const scoreProgress = targetScore ? Math.min(100, Math.round((projection.projected / targetScore) * 100)) : 0;
    return [
      {
        id: "onboard",
        label: "Targets set",
        detail: targetCollege ? `Target college: ${targetCollege}` : "Add a target college to unlock cutoff matching",
        done: Boolean(targetCollege && targetScore),
        progress: targetCollege && targetScore ? 100 : 40,
      },
      {
        id: "coverage-50",
        label: "Half the tracked syllabus done",
        detail: `${completed}/${progress.length || 0} tracked topics complete (${coverage}%)`,
        done: coverage >= 50,
        progress: Math.min(100, coverage * 2),
      },
      {
        id: "mocks-5",
        label: "Five full mocks submitted",
        detail: `${projection.samples} submitted so far — projections stay rough below three`,
        done: projection.samples >= 5,
        progress: Math.min(100, (projection.samples / 5) * 100),
      },
      {
        id: "score-target",
        label: `Projected ${targetScore}/720`,
        detail: projection.samples
          ? `Projection now ${projection.projected}/720 (${projection.confidenceLabel} confidence)`
          : "Submit a mock so score projection becomes meaningful",
        done: projection.samples > 0 && projection.projected >= targetScore,
        progress: scoreProgress,
      },
      {
        id: "streak-30",
        label: "30-day study streak",
        detail: `Current streak: ${streak} day${streak === 1 ? "" : "s"}`,
        done: streak >= 30,
        progress: Math.min(100, (streak / 30) * 100),
      },
    ];
  }, [targetScore, targetCollege, completed, progress.length, coverage, projection, streak]);

  const historyData = useMemo(
    () =>
      [...predictions]
        .reverse()
        .map((p) => ({ date: format(new Date(p.created_at), "d MMM"), score: p.based_on_score, rank: p.rank_high })),
    [predictions],
  );

  const saveTargets = () => {
    const score = Number(form.score);
    const hours = Number(form.hours);
    if (!Number.isFinite(score) || score < 0 || score > 720) {
      toast.error("Target score must be between 0 and 720.");
      return;
    }
    updateProfile.mutate(
      {
        target_score: Math.round(score),
        target_college: form.college.trim() || null,
        daily_study_hours: Number.isFinite(hours) ? Math.max(1, Math.min(16, Math.round(hours))) : 6,
      },
      {
        onSuccess: () => {
          toast.success("Goals updated.");
          setDraft(null);
        },
        onError: () => toast.error("Could not save your goals."),
      },
    );
  };

  const snapshot = () => {
    if (!band || !projection.samples) {
      toast.error("Submit at least one mock before snapshotting a goal checkpoint.");
      return;
    }
    savePrediction.mutate(
      {
        based_on_score: projection.projected,
        predicted_percentile: band.percentile,
        rank_low: band.rank_low,
        rank_high: band.rank_high,
        category: profile?.category ?? null,
        narrative: `Goal checkpoint · ${coverage}% syllabus · ${projection.samples} mocks · ${projection.confidenceLabel} confidence`,
      },
      {
        onSuccess: () => toast.success("Goal checkpoint saved to history."),
        onError: () => toast.error("Could not save the checkpoint."),
      },
    );
  };

  const historyColumns: Column<RankPrediction>[] = [
    { key: "created_at", header: "Date", render: (r) => format(new Date(r.created_at), "d MMM yyyy") },
    { key: "based_on_score", header: "Score", render: (r) => `${r.based_on_score}/720` },
    { key: "predicted_percentile", header: "Percentile", render: (r) => `${Number(r.predicted_percentile).toFixed(3)}%` },
    {
      key: "rank",
      header: "Rank band",
      render: (r) => `${r.rank_low.toLocaleString("en-IN")} – ${r.rank_high.toLocaleString("en-IN")}`,
    },
    { key: "narrative", header: "Note", render: (r) => r.narrative ?? "—" },
  ];


  if (profileQ.isLoading) return <LoadingSkeleton rows={4} height="h-28" />;
  if (profileQ.isError) return <ErrorState onRetry={() => void profileQ.refetch()} />;

  return (
    <>
      <PageHeader
        title="Goals"
        description="Target college, rank and score — tracked against what you have actually done."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={snapshot} disabled={savePrediction.isPending}>
              <Save className="mr-1.5 size-4" aria-hidden />
              Save checkpoint
            </Button>
            <Button size="sm" asChild>
              <Link to="/ai-coach">Ask the coach</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
          <StatCard label="Target score" value={targetScore} suffix="/720" icon={Target} />
          <StatCard
            label="Projected score"
            value={projection.samples ? projection.projected : "—"}
            suffix={projection.samples ? "/720" : undefined}
            icon={TrendingUp}
            accent={projection.projected >= targetScore ? "success" : "warning"}
            hint={projection.samples ? `${projection.confidenceLabel} confidence` : "No mocks yet"}
          />
          <StatCard
            label="Predicted rank"
            value={band ? `${band.rank_low.toLocaleString("en-IN")}` : "—"}
            hint={band ? `up to ${band.rank_high.toLocaleString("en-IN")}` : "Needs a mock"}
            icon={Award}
          />
          <StatCard
            label="Days to exam"
            value={daysToExam ?? "—"}
            hint={profile?.exam_date ? format(new Date(profile.exam_date), "d MMM yyyy") : "Set exam date in Settings"}
            icon={Building2}
          />
        </div>

        <Card className="p-4 lg:col-span-4">
          <h2 className="text-body font-semibold text-foreground">Your targets</h2>
          <div className="mt-3 space-y-3">
            <div>
              <Label htmlFor="goal-score">Target score (/720)</Label>
              <Input
                id="goal-score"
                inputMode="numeric"
                value={form.score}
                onChange={(e) => setDraft({ ...form, score: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="goal-college">Target college</Label>
              <Input
                id="goal-college"
                value={form.college}
                placeholder="e.g. AIIMS New Delhi"
                onChange={(e) => setDraft({ ...form, college: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="goal-hours">Daily study hours</Label>
              <Select value={form.hours} onValueChange={(v) => setDraft({ ...form, hours: v })}>
                <SelectTrigger id="goal-hours">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[4, 5, 6, 7, 8, 9, 10, 12].map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {h} hours
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={saveTargets} disabled={updateProfile.isPending}>
              Save goals
            </Button>
          </div>
        </Card>

        <Card className="p-4 lg:col-span-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-body font-semibold text-foreground">Milestones</h2>
            <span className="text-caption text-muted-foreground">
              {milestones.filter((m) => m.done).length}/{milestones.length} reached
            </span>
          </div>
          <ul className="space-y-3">
            {milestones.map((m) => (
              <li key={m.id} className="flex items-start gap-3">
                {m.done ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-body font-medium text-foreground">{m.label}</p>
                  <p className="text-caption text-muted-foreground">{m.detail}</p>
                  <ProgressBar
                    className="mt-1.5"
                    value={m.progress}
                    tone={m.done ? "success" : "primary"}
                    label={`${m.label} progress`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-4 lg:col-span-4">
          <h2 className="text-body font-semibold text-foreground">Score goal progress</h2>
          <div className="mt-4 flex items-center gap-4">
            <ProgressRing
              value={targetScore ? (projection.projected / targetScore) * 100 : 0}
              size={92}
              label={`${projection.samples ? projection.projected : 0}`}
            />
            <div className="min-w-0 text-caption text-muted-foreground">
              <p>
                Projected <span className="font-semibold text-foreground">{projection.projected}</span> vs target{" "}
                <span className="font-semibold text-foreground">{targetScore}</span>
              </p>
              <p className="mt-1">
                Trend {projection.slopePerTest >= 0 ? "+" : ""}
                {projection.slopePerTest} marks per mock across {projection.samples} mock(s).
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 lg:col-span-6">
          <h2 className="text-body font-semibold text-foreground">Target college reality check</h2>
          {!targetCollege ? (
            <p className="mt-2 text-caption text-muted-foreground">
              Add a target college above to compare your predicted rank against historical closing ranks.
            </p>
          ) : collegeRows.length === 0 ? (
            <p className="mt-2 text-caption text-muted-foreground">
              No historical cutoff rows matched “{targetCollege}”. Try the{" "}
              <Link to="/cutoffs" className="text-primary underline">
                Cutoff Explorer
              </Link>{" "}
              to find the exact college name.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {collegeRows.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-body font-medium text-foreground">{row.college_name}</p>
                    <p className="text-caption text-muted-foreground">
                      {row.year} · {row.category} · {row.quota} · closing {row.closing_rank.toLocaleString("en-IN")}
                    </p>
                  </div>
                  {row.chance ? (
                    <span className={cn("text-caption font-semibold", CHANCE_META[row.chance].tone)}>
                      {CHANCE_META[row.chance].label}
                    </span>
                  ) : (
                    <span className="text-caption text-muted-foreground">Needs a mock</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 lg:col-span-6">
          <h2 className="text-body font-semibold text-foreground">Coach recommendations</h2>
          <ul className="mt-3 space-y-2 text-caption text-muted-foreground">
            {buildGoalAdvice({
              gap: targetScore - projection.projected,
              samples: projection.samples,
              coverage,
              streak,
              daysToExam,
              hasCollege: Boolean(targetCollege),
            }).map((tip) => (
              <li key={tip} className="flex items-start gap-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
          <Button className="mt-3" size="sm" variant="secondary" asChild>
            <Link to="/ai-coach">Get a full plan from the AI Coach</Link>
          </Button>
        </Card>

        <Card className="p-4 lg:col-span-12">
          <h2 className="text-body font-semibold text-foreground">Goal history</h2>
          {predictionsQ.isLoading ? (
            <LoadingSkeleton rows={2} height="h-16" className="mt-3" />
          ) : predictions.length === 0 ? (
            <EmptyState
              className="mt-3"
              title="No checkpoints yet"
              description="Save a checkpoint to start a dated record of how your projected score and rank band move."
            />
          ) : (
            <>
              {historyData.length > 1 ? (
                <div className="mt-3">
                  <LineChart data={historyData} xKey="date" yKey="score" domain={[0, 720]} height={200} />
                </div>
              ) : null}
              <div className="mt-3">
                <DataTable data={predictions} columns={historyColumns} />
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}

function buildGoalAdvice({
  gap,
  samples,
  coverage,
  streak,
  daysToExam,
  hasCollege,
}: {
  gap: number;
  samples: number;
  coverage: number;
  streak: number;
  daysToExam: number | null;
  hasCollege: boolean;
}): string[] {
  const tips: string[] = [];
  if (!hasCollege) tips.push("Set a target college so cutoff matching and rank chances become concrete.");
  if (samples === 0) tips.push("Take one full 720-mark mock this week — every projection here is guesswork until you do.");
  else if (samples < 3) tips.push(`Only ${samples} mock(s) recorded. Three is the minimum before the trend line means anything.`);
  if (gap > 80) tips.push(`You are ${Math.round(gap)} marks short of target. Attack high-weightage weak chapters first, not new ones.`);
  else if (gap > 0) tips.push(`You are ${Math.round(gap)} marks short. Accuracy repair beats new syllabus at this distance.`);
  else if (samples > 0) tips.push("You are projecting above target — protect it with weekly full mocks and spaced revision.");
  if (coverage < 50) tips.push(`Tracked syllabus coverage is ${coverage}%. Log chapter progress in Syllabus so priority scoring stays honest.`);
  if (streak < 7) tips.push("Your streak is short. Consistency contributes 40% of the productivity score — log every study day.");
  if (daysToExam !== null && daysToExam < 90) tips.push(`${daysToExam} days left: shift the ratio toward revision, PYQs and full mocks.`);
  return tips.slice(0, 6);
}
