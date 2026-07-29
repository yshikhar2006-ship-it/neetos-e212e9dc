import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "User Profile — NEET OS" },
      { name: "description", content: "Your identity, attempt details and badges." },
      { property: "og:title", content: "User Profile — NEET OS" },
      { property: "og:description", content: "Your identity, attempt details and badges." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <>
      <PageHeader title="User Profile" description="Your identity, attempt details and badges." />
      <EmptyState
        title="User profile is being built"
        description="This screen arrives in an upcoming milestone. Your data is already being collected for it."
      />
    </>
  );
}
