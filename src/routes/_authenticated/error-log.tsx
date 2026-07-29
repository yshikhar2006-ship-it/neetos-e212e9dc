import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/error-log")({
  head: () => ({
    meta: [
      { title: "Error Log — NEET OS" },
      { name: "description", content: "Every wrong question, tagged by mistake type." },
      { property: "og:title", content: "Error Log — NEET OS" },
      { property: "og:description", content: "Every wrong question, tagged by mistake type." },
    ],
  }),
  component: ErrorLogPage,
});

function ErrorLogPage() {
  return (
    <>
      <PageHeader title="Error Log" description="Every wrong question, tagged by mistake type." />
      <EmptyState
        title="Wrong question notebook is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
