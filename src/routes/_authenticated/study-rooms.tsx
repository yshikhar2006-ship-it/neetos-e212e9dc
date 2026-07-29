import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/study-rooms")({
  head: () => ({
    meta: [
      { title: "Study Rooms — NEET OS" },
      { name: "description", content: "Study alongside other aspirants." },
      { property: "og:title", content: "Study Rooms — NEET OS" },
      { property: "og:description", content: "Study alongside other aspirants." },
    ],
  }),
  component: StudyRoomsPage,
});

function StudyRoomsPage() {
  return (
    <>
      <PageHeader title="Study Rooms" description="Study alongside other aspirants." />
      <EmptyState
        title="Study rooms is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
