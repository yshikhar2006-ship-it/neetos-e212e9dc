import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/cutoffs")({
  head: () => ({
    meta: [
      { title: "Cutoff Explorer — NEET OS" },
      { name: "description", content: "Historical closing ranks by college, category and quota." },
      { property: "og:title", content: "Cutoff Explorer — NEET OS" },
      { property: "og:description", content: "Historical closing ranks by college, category and quota." },
    ],
  }),
  component: CutoffsPage,
});

function CutoffsPage() {
  return (
    <>
      <PageHeader title="Cutoff Explorer" description="Historical closing ranks by college, category and quota." />
      <EmptyState
        title="Cutoff explorer is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
