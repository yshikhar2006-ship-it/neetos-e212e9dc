import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Compass, GraduationCap, Target, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/app-shell";
import { StatCard, ProgressBar } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/state";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { SearchInput } from "@/components/shared/search-input";
import { LineChart, ChartDataTable } from "@/components/shared/charts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTestAttempts } from "@/hooks/use-performance";
import { useCutoffs, useRankPredictions, useSaveRankPrediction, type CutoffRow } from "@/hooks/use-cutoffs";
import { useProfile } from "@/hooks/use-profile";
import { CHANCE_META, collegeChance, projectScore, rankBand } from "@/lib/utils/prediction";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/cutoffs")({
  head: () => ({
    meta: [
      { title: "Rank Predictor & Cutoffs — NEET OS" },
      { name: "description", content: "Predicted rank, college chances and historical closing ranks." },
      { property: "og:title", content: "Rank Predictor & Cutoffs — NEET OS" },
      { property: "og:description", content: "Predicted rank, college chances and historical closing ranks." },
    ],
  }),
  component: CutoffsPage,
});

const ALL = "all";

function CutoffsPage() {
  const { data: attempts = [], isLoading } = useTestAttempts();
  const { data: cutoffs = [] } = useCutoffs();
  const { data: snapshots = [] } = useRankPredictions();
  const { data: profile } = useProfile();
  const savePrediction = useSaveRankPrediction();

  const [category, setCategory] = useState(ALL);
  const [quota, setQuota] = useState(ALL);
  const [year, setYear] = useState(ALL);
  const [search, setSearch] = useState("");

  const projection = useMemo(() => projectScore(attempts), [attempts]);
  const band = useMemo(() => rankBand(projection.projected, projection.confidence), [projection]);
  const currentBand = useMemo(() => rankBand(projection.latest, projection.confidence), [projection]);

  const categories = useMemo(() => unique(cutoffs.map((c) => c.category)), [cutoffs]);
  const quotas = useMemo(() => unique(cutoffs.map((c) => c.quota)), [cutoffs]);
  const years = useMemo(() => unique(cutoffs.map((c) => String(c.year))).sort().reverse(), [cutoffs]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return cutoffs.filter(
      (c) =>
        (category === ALL || c.category === category) &&
        (quota === ALL || c.quota === quota) &&
        (year === ALL || String(c.year) === year) &&
        (!term || c.college_name.toLowerCase().includes(term) || c.course.toLowerCase().includes(term)),
    );
  }, [cutoffs, category, quota, year, search]);

  const latestYear = years[0];
  const predictions = useMemo(() => {
    const rows = filtered.filter((c) => (year === ALL ? String(c.year) === latestYear : true));
    return rows
      .map((c) => ({ ...c, chance: collegeChance(c.closing_rank, band) }))
      .sort((a, b) => a.closing_rank - b.closing_rank);
  }, [filtered, band, year, latestYear]);

  const trend = useMemo(
    () =>
      snapshots
        .slice()
        .reverse()
        .map((s) => ({
          label: formatDate(s.created_at, "d MMM"),
          rank: Math.round((s.rank_low + s.rank_high) / 2),
        })),
    [snapshots],
  );

  const cutoffColumns: Column<CutoffRow>[] = [
    { key: "college", header: "College", sortValue: (r) => r.college_name, render: (r) => <span className="font-medium">{r.college_name}</span> },
    { key: "course", header: "Course", sortValue: (r) => r.course, render: (r) => r.course },
    { key: "category", header: "Category", sortValue: (r) => r.category, render: (r) => r.category },
    { key: "quota", header: "Quota", sortValue: (r) => r.quota, render: (r) => r.quota },
    { key: "year", header: "Year", numeric: true, sortValue: (r) => r.year, render: (r) => r.year },
    {
      key: "closing_rank",
      header: "Closing rank",
      numeric: true,
      sortValue: (r) => r.closing_rank,
      render: (r) => r.closing_rank.toLocaleString("en-IN"),
    },
    {
      key: "closing_score",
      header: "Closing score",
      numeric: true,
      sortValue: (r) => r.closing_score ?? 0,
      render: (r) => r.closing_score ?? "—",
    },
  ];

  const predictionColumns: Column<CutoffRow & { chance: keyof typeof CHANCE_META }>[] = [
    { key: "college", header: "College", sortValue: (r) => r.college_name, render: (r) => <span className="font-medium">{r.college_name}</span> },
    { key: "course", header: "Course", sortValue: (r) => r.course, render: (r) => r.course },
    {
      key: "closing_rank",
      header: `Closing rank ${r0(year, latestYear)}`,
      numeric: true,
      sortValue: (r) => r.closing_rank,
      render: (r) => r.closing_rank.toLocaleString("en-IN"),
    },
    {
      key: "chance",
      header: "Your chance",
      sortValue: (r) => r.chance,
      render: (r) => (
        <span className={cn("text-caption font-semibold", CHANCE_META[r.chance].tone)}>{CHANCE_META[r.chance].label}</span>
      ),
    },
  ];

  const saveSnapshot = () => {
    if (!projection.samples) {
      toast.error("Take at least one mock test first.");
      return;
    }
    savePrediction.mutate(
      {
        based_on_score: projection.projected,
        predicted_percentile: band.percentile,
        rank_low: band.rank_low,
        rank_high: band.rank_high,
        category: category === ALL ? (profile?.category ?? null) : category,
        narrative: `Projected from ${projection.samples} mock${projection.samples === 1 ? "" : "s"} with ${projection.confidenceLabel} confidence.`,
      },
      {
        onSuccess: () => toast.success("Prediction snapshot saved."),
        onError: () => toast.error("Could not save the snapshot."),
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Rank Predictor & Cutoffs"
        description="Where your current performance lands you, and what it takes to move up."
        actions={
          <Button onClick={saveSnapshot} disabled={savePrediction.isPending}>
            <Target className="size-4" aria-hidden /> Save snapshot
          </Button>
        }
      />

      <Tabs defaultValue="rank" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rank">Rank predictor</TabsTrigger>
          <TabsTrigger value="colleges">College predictor</TabsTrigger>
          <TabsTrigger value="explorer">Cutoff explorer</TabsTrigger>
        </TabsList>

        <TabsContent value="rank" className="space-y-6">
          {!projection.samples && !isLoading ? (
            <EmptyState
              icon={TrendingUp}
              title="No mock tests yet"
              description="Rank prediction needs at least one submitted mock. Take a test and this fills in automatically."
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Latest score" value={projection.latest} suffix="/ 720" icon={TrendingUp} />
                <StatCard label="Projected score" value={projection.projected} suffix="/ 720" accent="success" hint={`Trend ${projection.slopePerTest >= 0 ? "+" : ""}${projection.slopePerTest} per test`} />
                <StatCard
                  label="Predicted rank band"
                  value={`${short(band.rank_low)}–${short(band.rank_high)}`}
                  hint={`${band.percentile.toFixed(2)} percentile`}
                  accent="primary"
                />
                <StatCard
                  label="Confidence"
                  value={projection.confidence}
                  suffix="%"
                  accent={projection.confidence >= 70 ? "success" : projection.confidence >= 40 ? "warning" : "primary"}
                  hint={`${projection.samples} mock${projection.samples === 1 ? "" : "s"} · ${projection.confidenceLabel}`}
                />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <section className="surface p-5">
                  <h2 className="text-subheading font-semibold">Confidence in this prediction</h2>
                  <p className="mt-1 text-caption text-muted-foreground">
                    Confidence rises with more mocks and steadier scores. Low confidence widens the rank band rather than
                    hiding it.
                  </p>
                  <div className="mt-4 space-y-3">
                    <ProgressBar
                      value={projection.confidence}
                      label="Prediction confidence"
                      tone={projection.confidence >= 70 ? "success" : "warning"}
                    />
                    <dl className="grid gap-2 text-caption text-muted-foreground">
                      <div className="flex justify-between">
                        <dt>Current-form rank band</dt>
                        <dd className="num text-foreground">
                          {short(currentBand.rank_low)}–{short(currentBand.rank_high)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Average across mocks</dt>
                        <dd className="num text-foreground">{projection.average} / 720</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Best mock</dt>
                        <dd className="num text-foreground">{projection.best} / 720</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Target score</dt>
                        <dd className="num text-foreground">{profile?.target_score ?? 650} / 720</dd>
                      </div>
                    </dl>
                  </div>
                </section>

                <section className="surface p-5">
                  <h2 className="text-subheading font-semibold">Prediction history</h2>
                  {trend.length > 1 ? (
                    <>
                      <LineChart data={trend} xKey="label" yKey="rank" tone="primary" height={220} />
                      <ChartDataTable
                        caption="Saved rank prediction snapshots"
                        columns={["Date", "Mid rank"]}
                        rows={trend.map((t) => [t.label, t.rank])}
                      />
                    </>
                  ) : (
                    <p className="mt-4 text-caption text-muted-foreground">
                      Save a snapshot after each mock to watch your predicted rank move over time.
                    </p>
                  )}
                </section>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="colleges" className="space-y-4">
          <div className="flex flex-col gap-3">
            <FilterBar label="Category" options={opts(categories, "All categories")} value={category} onChange={setCategory} />
            <FilterBar label="Quota" options={opts(quotas, "All quotas")} value={quota} onChange={setQuota} />
            <SearchInput value={search} onChange={setSearch} placeholder="Search colleges or courses…" className="max-w-sm" />
          </div>
          {predictions.length ? (
            <DataTable
              rows={predictions}
              columns={predictionColumns}
              rowKey={(r) => r.id}
              defaultSort={{ key: "closing_rank", dir: "asc" }}
            />
          ) : (
            <EmptyState icon={GraduationCap} title="No colleges match these filters" description="Widen the category or quota filter." />
          )}
        </TabsContent>

        <TabsContent value="explorer" className="space-y-4">
          <div className="flex flex-col gap-3">
            <FilterBar label="Category" options={opts(categories, "All categories")} value={category} onChange={setCategory} />
            <FilterBar label="Quota" options={opts(quotas, "All quotas")} value={quota} onChange={setQuota} />
            <FilterBar label="Year" options={opts(years, "All years")} value={year} onChange={setYear} />
            <SearchInput value={search} onChange={setSearch} placeholder="Search colleges or courses…" className="max-w-sm" />
          </div>
          {filtered.length ? (
            <DataTable rows={filtered} columns={cutoffColumns} rowKey={(r) => r.id} defaultSort={{ key: "closing_rank", dir: "asc" }} />
          ) : (
            <EmptyState icon={Compass} title="No cutoff rows match" description="Try clearing a filter or searching a different college." />
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values)).sort();
}

function opts(values: string[], allLabel: string) {
  return [{ value: ALL, label: allLabel }, ...values.map((v) => ({ value: v, label: v }))];
}

function short(n: number) {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

function r0(year: string, latestYear?: string) {
  return year === ALL ? (latestYear ?? "") : year;
}
