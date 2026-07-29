import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BrainCircuit,
  CalendarDays,
  ClipboardList,
  Flame,
  NotebookPen,
  Target,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/shared/app-shell";
import { StatCard, ProgressRing } from "@/components/shared/stat-card";
import { CountdownWidget } from "@/components/shared/countdown-widget";
import { PomodoroTimer } from "@/components/shared/pomodoro-timer";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";
import { useSubjects } from "@/hooks/use-curriculum";
import { useTopicProgress } from "@/hooks/use-topic-progress";
import { pct, subjectToken } from "@/lib/utils/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — NEET OS" },
      {
        name: "description",
        content: "Your countdown, syllabus coverage, revision queue and today's study focus in one view.",
      },
      { property: "og:title", content: "Dashboard — NEET OS" },
      { property: "og:description", content: "Your NEET day at a glance." },
    ],
  }),
  component: Dashboard,
});

const QUICK_ACTIONS = [
  { to: "/planner", label: "Plan my day", icon: CalendarDays },
  { to: "/practice", label: "Take a mock", icon: ClipboardList },
  { to: "/revision", label: "Revise due cards", icon: BrainCircuit },
  { to: "/error-log", label: "Review mistakes", icon: NotebookPen },
] as const;

function Dashboard() {
  const { data: profile } = useProfile();
  const { data: subjects = [] } = useSubjects();
  const { data: progress = [] } = useTopicProgress();

  const completed = progress.filter((p) => ["completed", "revised", "mastered"].includes(p.status)).length;
  const inProgress = progress.filter((p) => p.status === "in_progress").length;
  const coverage = pct(completed, Math.max(progress.length, 1));
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Good to see you, ${firstName}` : "Your dashboard"}
        description="Plan → Study → Practice → Analyze → Revise. Start with whatever is closest to due."
        actions={
          <Button asChild>
            <Link to="/today">Today's tasks</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <CountdownWidget examDate={profile?.exam_date} />
        </div>
        <StatCard
          className="lg:col-span-4"
          label="Syllabus covered"
          value={`${coverage}%`}
          icon={TrendingUp}
          hint={`${completed} topics done · ${inProgress} in progress`}
        />
        <StatCard
          className="lg:col-span-4"
          label="Target score"
          value={profile?.target_score ?? 650}
          suffix="/ 720"
          icon={Target}
          hint={profile?.target_college ? `Goal: ${profile.target_college}` : "Set a dream college in Goals"}
        />

        <section className="surface p-5 lg:col-span-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-subheading font-semibold">Subject coverage</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/syllabus">Open syllabus</Link>
            </Button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {subjects.map((s) => {
              const subjectTopicIds = new Set(
                topicMap.filter((t) => t.subject_id === s.id).map((t) => t.id),
              );
              const rows = progress.filter((p) => subjectTopicIds.has(p.topic_id));
              const done = rows.filter((p) =>
                ["completed", "revised", "mastered"].includes(p.status),
              ).length;
              return (
                <div key={s.id} className="flex flex-col items-center gap-3 rounded-lg border border-border p-4">
                  <ProgressRing
                    value={pct(done, Math.max(subjectTopicIds.size, 1))}
                    tone={subjectToken(s.slug)}
                  />
                  <SubjectBadge slug={s.slug} />
                  <span className="num text-caption text-muted-foreground">
                    {done}/{subjectTopicIds.size} topics
                  </span>
                </div>
              );
            })}

            {subjects.length === 0 ? (
              <p className="text-caption text-muted-foreground">Loading your syllabus…</p>
            ) : null}
          </div>
        </section>

        <div className="lg:col-span-4">
          <PomodoroTimer />
        </div>

        <section className="surface p-5 lg:col-span-6">
          <h2 className="text-subheading font-semibold">Quick actions</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {QUICK_ACTIONS.map((a) => (
              <Button key={a.to} variant="outline" className="justify-start" asChild>
                <Link to={a.to}>
                  <a.icon className="size-4" aria-hidden /> {a.label}
                </Link>
              </Button>
            ))}
          </div>
        </section>

        <section className="surface p-5 lg:col-span-6">
          <h2 className="flex items-center gap-2 text-subheading font-semibold">
            <Flame className="size-4 text-warning" aria-hidden /> Keep the loop going
          </h2>
          <ul className="mt-4 space-y-3 text-caption text-muted-foreground">
            <li>
              Log every mock in <Link to="/practice" className="text-primary underline-offset-2 hover:underline">Practice</Link>{" "}
              so your analytics stay honest.
            </li>
            <li>
              Wrong answers land in the{" "}
              <Link to="/error-log" className="text-primary underline-offset-2 hover:underline">Error Log</Link>{" "}
              automatically, tagged by mistake type.
            </li>
            <li>
              Completed topics feed the{" "}
              <Link to="/revision" className="text-primary underline-offset-2 hover:underline">Revision Hub</Link>{" "}
              queue on an SM-2 schedule.
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
