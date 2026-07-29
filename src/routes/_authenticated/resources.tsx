import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/resources")({
  head: () => ({
    meta: [
      { title: "Resources — NEET OS" },
      { name: "description", content: "Notes, NCERT reference, bookmarks and doubts." },
      { property: "og:title", content: "Resources — NEET OS" },
      { property: "og:description", content: "Notes, NCERT reference, bookmarks and doubts." },
    ],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  return (
    <>
      <PageHeader title="Resources" description="Notes, NCERT reference, bookmarks and doubts." />
      <EmptyState
        title="Study resources is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
