import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — NEET OS" },
      { name: "description", content: "Score trends, accuracy, time per question and weak areas." },
      { property: "og:title", content: "Analytics — NEET OS" },
      { property: "og:description", content: "Score trends, accuracy, time per question and weak areas." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <>
      <PageHeader title="Analytics" description="Score trends, accuracy, time per question and weak areas." />
      <EmptyState
        title="Performance analytics is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
