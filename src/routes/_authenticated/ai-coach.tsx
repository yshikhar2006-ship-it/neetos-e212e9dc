import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/ai-coach")({
  head: () => ({
    meta: [
      { title: "AI Coach — NEET OS" },
      { name: "description", content: "Guidance grounded in your own performance data." },
      { property: "og:title", content: "AI Coach — NEET OS" },
      { property: "og:description", content: "Guidance grounded in your own performance data." },
    ],
  }),
  component: AiCoachPage,
});

function AiCoachPage() {
  return (
    <>
      <PageHeader title="AI Coach" description="Guidance grounded in your own performance data." />
      <EmptyState
        title="AI study coach is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
