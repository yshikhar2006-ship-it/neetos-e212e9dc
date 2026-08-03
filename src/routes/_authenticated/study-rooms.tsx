import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Mic, ShieldCheck, Timer, Trophy, Users, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/study-rooms")({
  head: () => ({
    meta: [
      { title: "Study Rooms — NEET OS" },
      { name: "description", content: "Collaborative focus rooms, group sprints and accountability — arriving in a future NEET OS update." },
      { property: "og:title", content: "Study Rooms — NEET OS" },
      { property: "og:description", content: "Collaborative focus rooms, group sprints and accountability — arriving in a future NEET OS update." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudyRoomsPage,
});

interface PlannedFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  status: "designing" | "planned";
}

const PLANNED: PlannedFeature[] = [
  {
    icon: Timer,
    title: "Silent focus rooms",
    description: "Shared Pomodoro rooms where your timer, streak and session minutes sync into your own Habit Tracker.",
    status: "designing",
  },
  {
    icon: Users,
    title: "Small accountability pods",
    description: "Groups of up to six aspirants with a shared daily target and a visible completion board.",
    status: "designing",
  },
  {
    icon: Trophy,
    title: "Weekly sprint leaderboards",
    description: "Opt-in, effort-based ranking on logged hours and revision discipline — never on raw scores.",
    status: "planned",
  },
  {
    icon: Mic,
    title: "Doubt rooms",
    description: "Post an unresolved doubt from your Doubt Journal and let the room answer it.",
    status: "planned",
  },
  {
    icon: Video,
    title: "Coach-led live sessions",
    description: "Scheduled chapter clinics that drop straight into your Calendar as blocks.",
    status: "planned",
  },
  {
    icon: ShieldCheck,
    title: "Safety and privacy first",
    description: "Rooms are invite-based, moderated, and never expose your scores, ranks or personal data.",
    status: "designing",
  },
];

function StudyRoomsPage() {
  return (
    <>
      <PageHeader
        title="Study Rooms"
        description="Collaborative study is the next chapter of NEET OS. Here is exactly what is coming."
        actions={
          <Button size="sm" asChild>
            <Link to="/focus">Use Focus Tools now</Link>
          </Button>
        }
      />

      <Card className="overflow-hidden p-0">
        <div className="border-b border-border bg-primary/5 p-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-card px-2.5 py-1 text-caption font-medium text-primary">
            <Bell className="size-3.5" aria-hidden />
            In development
          </span>
          <h2 className="mt-3 text-subheading font-semibold text-foreground">Study together, without the noise</h2>
          <p className="mt-2 max-w-2xl text-caption text-muted-foreground">
            Study Rooms will layer accountability on top of the tracking you already do — synced with your planner,
            habit logs and revision queue. Nothing here changes how your current data works; solo study stays the
            default and remains fully functional.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" asChild>
              <Link to="/focus">Solo Pomodoro</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/habits">Track consistency</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/resources/doubts">Log a doubt</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANNED.map((feature) => (
            <FeatureTile key={feature.title} feature={feature} />
          ))}
        </div>
      </Card>

      <Card className="mt-4 p-4">
        <h2 className="text-body font-semibold text-foreground">Until rooms arrive</h2>
        <ul className="mt-2 space-y-1.5 text-caption text-muted-foreground">
          <li>· Run a 50-minute session in Focus Tools — it logs hours and pomodoros automatically.</li>
          <li>· Keep your streak alive in the Habit Tracker; consistency is 40% of your productivity score.</li>
          <li>· Ask the AI Coach for a plan when you would otherwise ask a study partner.</li>
        </ul>
      </Card>
    </>
  );
}

function FeatureTile({ feature }: { feature: PlannedFeature }) {
  const Icon = feature.icon;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-caption font-medium",
            feature.status === "designing"
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-muted text-muted-foreground",
          )}
        >
          {feature.status === "designing" ? "In design" : "Planned"}
        </span>
      </div>
      <h3 className="mt-3 text-body font-semibold text-foreground">{feature.title}</h3>
      <p className="mt-1 text-caption text-muted-foreground">{feature.description}</p>
    </div>
  );
}
