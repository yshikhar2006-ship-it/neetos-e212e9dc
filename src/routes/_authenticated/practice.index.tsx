import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ClipboardList, History, Play, Target } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubjects } from "@/hooks/use-curriculum";
import { useTestAttempts, type TestAttempt } from "@/hooks/use-performance";
import { useStartTest, type TestType } from "@/hooks/use-tests";
import { formatDate, formatDuration } from "@/lib/utils/format";

export const Route = createFileRoute("/_authenticated/practice/")({
  head: () => ({
    meta: [
      { title: "Practice — NEET OS" },
      { name: "description", content: "Full mocks, chapter tests, PYQs and custom papers with NTA scoring." },
      { property: "og:title", content: "Practice — NEET OS" },
      { property: "og:description", content: "Full mocks, chapter tests, PYQs and custom papers." },
    ],
  }),
  component: PracticeIndex,
});

const PRESETS: { type: TestType; label: string; questions: number; minutes: number }[] = [
  { type: "full_mock", label: "Full mock (180 Q / 200 min)", questions: 180, minutes: 200 },
  { type: "chapter_wise", label: "Chapter test (30 Q / 40 min)", questions: 30, minutes: 40 },
  { type: "pyq", label: "PYQ drill (45 Q / 50 min)", questions: 45, minutes: 50 },
  { type: "diagnostic", label: "Diagnostic (20 Q / 25 min)", questions: 20, minutes: 25 },
  { type: "custom", label: "Custom paper", questions: 25, minutes: 30 },
];

function PracticeIndex() {
  const navigate = useNavigate();
  const { data: subjects = [] } = useSubjects();
  const { data: attempts = [] } = useTestAttempts();
  const start = useStartTest();

  const [presetIdx, setPresetIdx] = useState(0);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [questions, setQuestions] = useState(PRESETS[0].questions);
  const [minutes, setMinutes] = useState(PRESETS[0].minutes);
  const [difficulty, setDifficulty] = useState<"all" | "easy" | "medium" | "hard">("all");

  const preset = PRESETS[presetIdx];
  const submitted = attempts.filter((a) => a.submitted_at);
  const best = submitted.reduce((m, a) => Math.max(m, a.score), 0);
  const avgAccuracy = submitted.length
    ? Math.round(submitted.reduce((s, a) => s + Number(a.accuracy), 0) / submitted.length)
    : 0;

  const launch = () => {
    start.mutate(
      {
        title: preset.label.split(" (")[0],
        type: preset.type,
        subjectIds,
        totalQuestions: questions,
        durationMinutes: minutes,
        pyqOnly: preset.type === "pyq",
        difficulty,
      },
      {
        onSuccess: (attempt) =>
          navigate({ to: "/practice/live/$attemptId", params: { attemptId: attempt.id } }),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const columns: Column<TestAttempt>[] = [
    {
      key: "title",
      header: "Test",
      sortValue: (r) => r.title,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.title}</p>
          <p className="text-caption text-muted-foreground">{formatDate(r.submitted_at ?? r.started_at)}</p>
        </div>
      ),
    },
    { key: "score", header: "Score", numeric: true, sortValue: (r) => r.score, render: (r) => `${r.score}/${r.max_score}` },
    { key: "accuracy", header: "Accuracy", numeric: true, sortValue: (r) => Number(r.accuracy), render: (r) => `${r.accuracy}%` },
    {
      key: "time",
      header: "Time",
      numeric: true,
      sortValue: (r) => r.time_taken_seconds,
      render: (r) => formatDuration(Math.round(r.time_taken_seconds / 60)),
    },
    {
      key: "status",
      header: "",
      render: (r) =>
        r.submitted_at ? (
          <Link
            to="/practice/results/$attemptId"
            params={{ attemptId: r.id }}
            className="text-primary underline-offset-2 hover:underline"
          >
            Results
          </Link>
        ) : (
          <Link
            to="/practice/live/$attemptId"
            params={{ attemptId: r.id }}
            className="text-warning underline-offset-2 hover:underline"
          >
            Resume
          </Link>
        ),
    },
  ];

  return (
    <>
      <PageHeader title="Practice" description="Full mocks, chapter tests, PYQs and custom papers." />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Tests taken" value={submitted.length} icon={ClipboardList} />
        <StatCard label="Best score" value={best} suffix="/ 720" icon={Target} />
        <StatCard label="Avg accuracy" value={`${avgAccuracy}%`} icon={History} />
      </div>

      <section className="surface p-5" aria-label="Test setup">
        <h2 className="text-subheading font-semibold">Start a test</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          <div className="space-y-1.5 lg:col-span-2">
            <Label>Format</Label>
            <Select
              value={String(presetIdx)}
              onValueChange={(v) => {
                const i = Number(v);
                setPresetIdx(i);
                setQuestions(PRESETS[i].questions);
                setMinutes(PRESETS[i].minutes);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p, i) => (
                  <SelectItem key={p.type} value={String(i)}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="test-questions">Questions</Label>
            <Input
              id="test-questions"
              type="number"
              min={5}
              max={180}
              value={questions}
              onChange={(e) => setQuestions(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="test-minutes">Minutes</Label>
            <Input
              id="test-minutes"
              type="number"
              min={5}
              max={220}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-6">
          <fieldset>
            <legend className="mb-2 text-caption text-muted-foreground">Subjects (all if none selected)</legend>
            <div className="flex flex-wrap gap-4">
              {subjects.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-caption">
                  <Checkbox
                    checked={subjectIds.includes(s.id)}
                    onCheckedChange={() =>
                      setSubjectIds((ids) =>
                        ids.includes(s.id) ? ids.filter((i) => i !== s.id) : [...ids, s.id],
                      )
                    }
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["all", "easy", "medium", "hard"].map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={launch} disabled={start.isPending}>
            <Play className="size-4" aria-hidden /> Start test
          </Button>
        </div>
      </section>

      <section className="mt-5" aria-label="Test history">
        <h2 className="mb-3 text-subheading font-semibold">History</h2>
        {attempts.length === 0 ? (
          <EmptyState
            title="No attempts yet"
            description="Every test you take is scored with NTA rules and feeds analytics, the error log and your rank estimate."
          />
        ) : (
          <DataTable
            rows={[...attempts].reverse()}
            columns={columns}
            rowKey={(r) => r.id}
            defaultSort={{ key: "score", dir: "desc" }}
          />
        )}
      </section>
    </>
  );
}
