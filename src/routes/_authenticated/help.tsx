import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({
    meta: [
      { title: "Help — NEET OS" },
      { name: "description", content: "Guides and answers for using NEET OS." },
      { property: "og:title", content: "Help — NEET OS" },
      { property: "og:description", content: "Guides and answers for using NEET OS." },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <>
      <PageHeader title="Help" description="Guides and answers for using NEET OS." />
      <EmptyState
        title="Help centre is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
