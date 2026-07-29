import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — NEET OS" },
      { name: "description", content: "Everything that changed since you last checked." },
      { property: "og:title", content: "Notifications — NEET OS" },
      { property: "og:description", content: "Everything that changed since you last checked." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notifications" description="Everything that changed since you last checked." />
      <EmptyState
        title="Notifications is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
