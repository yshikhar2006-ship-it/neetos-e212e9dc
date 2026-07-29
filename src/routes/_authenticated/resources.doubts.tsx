import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/resources/doubts")({
  head: () => ({
    meta: [
      { title: "Doubt Journal — NEET OS" },
      { name: "description", content: "Track unresolved doubts until they're cleared." },
      { property: "og:title", content: "Doubt Journal — NEET OS" },
      { property: "og:description", content: "Track unresolved doubts until they're cleared." },
    ],
  }),
  component: ResourcesDoubtsPage,
});

function ResourcesDoubtsPage() {
  return (
    <>
      <PageHeader title="Doubt Journal" description="Track unresolved doubts until they're cleared." />
      <EmptyState
        title="Doubt journal is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
