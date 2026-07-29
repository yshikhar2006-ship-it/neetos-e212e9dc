import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/revision")({
  head: () => ({
    meta: [
      { title: "Revision Hub — NEET OS" },
      { name: "description", content: "Spaced repetition queue and revision schedule." },
      { property: "og:title", content: "Revision Hub — NEET OS" },
      { property: "og:description", content: "Spaced repetition queue and revision schedule." },
    ],
  }),
  component: RevisionPage,
});

function RevisionPage() {
  return (
    <>
      <PageHeader title="Revision Hub" description="Spaced repetition queue and revision schedule." />
      <EmptyState
        title="Revision hub is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
