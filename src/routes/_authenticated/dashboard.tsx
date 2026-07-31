import { createFileRoute, Link } from "@tanstack/react-router";
import { BrainCircuit, CalendarDays, ClipboardList, NotebookPen } from "lucide-react";
import { PageHeader } from "@/components/shared/app-shell";
import { PomodoroTimer } from "@/components/shared/pomodoro-timer";
import { Button } from "@/components/ui/button";
import { WidgetBoundary } from "@/components/dashboard/widget-boundary";
import { CountdownCard } from "@/components/dashboard/countdown-card";
import { GoalCard } from "@/components/dashboard/goal-card";
import { FocusPick } from "@/components/dashboard/focus-pick";
import { SubjectRing } from "@/components/dashboard/subject-ring";
import { StreakPill, ProductivityBadge } from "@/components/dashboard/streak-and-score";
import { TodayTasks } from "@/components/dashboard/today-tasks";
import { ConsistencyWidget, MiniCalendar, WeeklyHours } from "@/components/dashboard/analytics-widgets";
import { useProfile } from "@/hooks/use-profile";
import { useSubjects, useTopicSubjectMap } from "@/hooks/use-curriculum";
import { useTopicProgress } from "@/hooks/use-topic-progress";
import { useUpsertHabitLog } from "@/hooks/use-habits";
import { pct, todayISO } from "@/lib/utils/format";

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
  const { data: topicMap = [] } = useTopicSubjectMap();
  const { data: progress = [] } = useTopicProgress();
  const upsertHabit = useUpsertHabitLog();

  const doneStatuses = ["completed", "revised", "mastered"];
  const completed = progress.filter((p) => doneStatuses.includes(p.status)).length;
  const coverage = pct(completed, Math.max(topicMap.length, 1));
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Good to see you, ${firstName}` : "Your dashboard"}
        description="Plan → Study → Practice → Analyze → Revise. Start with whatever is closest to due."
        actions={
          <div className="flex items-center gap-2">
            <StreakPill />
            <ProductivityBadge />
            <Button asChild>
              <Link to="/today">Today's tasks</Link>
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <WidgetBoundary label="Countdown" className="rise-in lg:col-span-5">
          <CountdownCard
            className="h-full"
            examDate={profile?.exam_date}
            examYear={profile?.target_exam_year}
            category={profile?.category}
            quota={profile?.quota}
            syllabusPct={coverage}
            startDate={profile?.exam_date ? null : null}
          />
        </WidgetBoundary>

        <WidgetBoundary label="Focus pick" className="rise-in lg:col-span-4">
          <FocusPick className="h-full" />
        </WidgetBoundary>

        <WidgetBoundary label="Goal" className="rise-in lg:col-span-3">
          <GoalCard className="h-full" />
        </WidgetBoundary>

        <WidgetBoundary label="Subject coverage" className="rise-in lg:col-span-8">
          <section className="surface h-full p-5" aria-label="Subject coverage">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-subheading font-semibold">Subject coverage</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/syllabus">Open syllabus</Link>
              </Button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {subjects.map((s) => {
                const ids = new Set(topicMap.filter((t) => t.subject_id === s.id).map((t) => t.id));
                const done = progress.filter((p) => ids.has(p.topic_id) && doneStatuses.includes(p.status)).length;
                return (
                  <SubjectRing
                    key={s.id}
                    slug={s.slug}
                    name={s.name}
                    value={pct(done, Math.max(ids.size, 1))}
                    done={done}
                    total={ids.size}
                  />
                );
              })}
              {subjects.length === 0 ? (
                <p className="text-caption text-muted-foreground">Loading your syllabus…</p>
              ) : null}
            </div>
          </section>
        </WidgetBoundary>

        <WidgetBoundary label="Pomodoro" className="rise-in lg:col-span-4">
          <PomodoroTimer
            className="h-full"
            onSessionComplete={(minutes) =>
              upsertHabit.mutate({
                log_date: todayISO(),
                study_hours: Number((minutes / 60).toFixed(2)),
                pomodoro_count: 1,
              })
            }
          />
        </WidgetBoundary>

        <WidgetBoundary label="Today's tasks" className="rise-in lg:col-span-5">
          <TodayTasks className="h-full" />
        </WidgetBoundary>

        <WidgetBoundary label="Weekly hours" className="rise-in lg:col-span-7">
          <WeeklyHours className="h-full" />
        </WidgetBoundary>

        <WidgetBoundary label="This week" className="rise-in lg:col-span-7">
          <MiniCalendar className="h-full" />
        </WidgetBoundary>

        <WidgetBoundary label="Consistency" className="rise-in lg:col-span-5">
          <ConsistencyWidget className="h-full" />
        </WidgetBoundary>

        <section className="surface p-5 lg:col-span-12">
          <h2 className="text-subheading font-semibold">Quick actions</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_ACTIONS.map((a) => (
              <Button key={a.to} variant="outline" className="justify-start" asChild>
                <Link to={a.to}>
                  <a.icon className="size-4" aria-hidden /> {a.label}
                </Link>
              </Button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
