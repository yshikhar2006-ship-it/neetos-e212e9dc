import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — NEET OS" },
      { name: "description", content: "Month, week and agenda views of your study plan." },
      { property: "og:title", content: "Calendar — NEET OS" },
      { property: "og:description", content: "Month, week and agenda views of your study plan." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  return (
    <>
      <PageHeader title="Calendar" description="Month, week and agenda views of your study plan." />
      <EmptyState
        title="Calendar views is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
