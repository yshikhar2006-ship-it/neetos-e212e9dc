import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/revision/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — NEET OS" },
      { name: "description", content: "Flip through cards scheduled for today." },
      { property: "og:title", content: "Flashcards — NEET OS" },
      { property: "og:description", content: "Flip through cards scheduled for today." },
    ],
  }),
  component: RevisionFlashcardsPage,
});

function RevisionFlashcardsPage() {
  return (
    <>
      <PageHeader title="Flashcards" description="Flip through cards scheduled for today." />
      <EmptyState
        title="Flashcards is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
