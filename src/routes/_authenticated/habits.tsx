import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/habits")({
  head: () => ({
    meta: [
      { title: "Habit Tracker — NEET OS" },
      { name: "description", content: "Streaks, sleep, mood and consistency." },
      { property: "og:title", content: "Habit Tracker — NEET OS" },
      { property: "og:description", content: "Streaks, sleep, mood and consistency." },
    ],
  }),
  component: HabitsPage,
});

function HabitsPage() {
  return (
    <>
      <PageHeader title="Habit Tracker" description="Streaks, sleep, mood and consistency." />
      <EmptyState
        title="Habit tracker is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
