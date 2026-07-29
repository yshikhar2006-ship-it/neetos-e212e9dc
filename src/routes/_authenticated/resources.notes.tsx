import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/resources/notes")({
  head: () => ({
    meta: [
      { title: "Notes — NEET OS" },
      { name: "description", content: "Your notes, linked to chapters and topics." },
      { property: "og:title", content: "Notes — NEET OS" },
      { property: "og:description", content: "Your notes, linked to chapters and topics." },
    ],
  }),
  component: ResourcesNotesPage,
});

function ResourcesNotesPage() {
  return (
    <>
      <PageHeader title="Notes" description="Your notes, linked to chapters and topics." />
      <EmptyState
        title="Notes is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
