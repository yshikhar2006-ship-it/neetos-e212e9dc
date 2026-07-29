import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [
      { title: "Daily Planner — NEET OS" },
      { name: "description", content: "Time-blocked planning built around your real schedule." },
      { property: "og:title", content: "Daily Planner — NEET OS" },
      { property: "og:description", content: "Time-blocked planning built around your real schedule." },
    ],
  }),
  component: PlannerPage,
});

function PlannerPage() {
  return (
    <>
      <PageHeader title="Daily Planner" description="Time-blocked planning built around your real schedule." />
      <EmptyState
        title="Study planner is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
