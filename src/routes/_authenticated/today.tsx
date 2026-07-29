import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({
    meta: [
      { title: "Today's Tasks — NEET OS" },
      { name: "description", content: "A single checklist for everything due today." },
      { property: "og:title", content: "Today's Tasks — NEET OS" },
      { property: "og:description", content: "A single checklist for everything due today." },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  return (
    <>
      <PageHeader title="Today's Tasks" description="A single checklist for everything due today." />
      <EmptyState
        title="Daily task list is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
