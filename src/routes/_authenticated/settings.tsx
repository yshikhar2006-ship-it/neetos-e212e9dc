import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — NEET OS" },
      { name: "description", content: "Account, appearance, notifications and data." },
      { property: "og:title", content: "Settings — NEET OS" },
      { property: "og:description", content: "Account, appearance, notifications and data." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Account, appearance, notifications and data." />
      <EmptyState
        title="Settings is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
