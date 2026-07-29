import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/focus")({
  head: () => ({
    meta: [
      { title: "Focus Tools — NEET OS" },
      { name: "description", content: "Pomodoro sessions, distraction log and focus stats." },
      { property: "og:title", content: "Focus Tools — NEET OS" },
      { property: "og:description", content: "Pomodoro sessions, distraction log and focus stats." },
    ],
  }),
  component: FocusPage,
});

function FocusPage() {
  return (
    <>
      <PageHeader title="Focus Tools" description="Pomodoro sessions, distraction log and focus stats." />
      <EmptyState
        title="Focus tools is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
