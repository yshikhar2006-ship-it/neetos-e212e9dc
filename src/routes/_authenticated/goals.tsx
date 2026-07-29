import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title: "Goals — NEET OS" },
      { name: "description", content: "Target college, rank goals and milestone tracking." },
      { property: "og:title", content: "Goals — NEET OS" },
      { property: "og:description", content: "Target college, rank goals and milestone tracking." },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  return (
    <>
      <PageHeader title="Goals" description="Target college, rank goals and milestone tracking." />
      <EmptyState
        title="Goals and targets is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
