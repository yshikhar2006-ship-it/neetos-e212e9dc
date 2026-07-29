import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({
    meta: [
      { title: "Practice — NEET OS" },
      { name: "description", content: "Full mocks, chapter tests, PYQs and custom papers." },
      { property: "og:title", content: "Practice — NEET OS" },
      { property: "og:description", content: "Full mocks, chapter tests, PYQs and custom papers." },
    ],
  }),
  component: PracticePage,
});

function PracticePage() {
  return (
    <>
      <PageHeader title="Practice" description="Full mocks, chapter tests, PYQs and custom papers." />
      <EmptyState
        title="Mock tests and practice is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
