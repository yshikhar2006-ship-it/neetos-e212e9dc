import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/syllabus")({
  head: () => ({
    meta: [
      { title: "Syllabus — NEET OS" },
      { name: "description", content: "Every subject, chapter and topic mapped to NEET weightage." },
      { property: "og:title", content: "Syllabus — NEET OS" },
      { property: "og:description", content: "Every subject, chapter and topic mapped to NEET weightage." },
    ],
  }),
  component: SyllabusPage,
});

function SyllabusPage() {
  return (
    <>
      <PageHeader title="Syllabus" description="Every subject, chapter and topic mapped to NEET weightage." />
      <EmptyState
        title="Syllabus tracker is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
