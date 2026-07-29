import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/shared/app-shell";
import { useProfile } from "@/hooks/use-profile";
import { LoadingSkeleton } from "@/components/shared/state";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { data: profile, isLoading } = useProfile();
  const navigate = useNavigate();

  // Incomplete onboarding never lands on a half-populated dashboard.
  useEffect(() => {
    if (!isLoading && profile && !profile.onboarding_completed) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [isLoading, profile, navigate]);

  return (
    <AppShell>
      {isLoading ? <LoadingSkeleton rows={4} height="h-24" /> : <Outlet />}
      <Link to="/dashboard" className="sr-only">
        Dashboard
      </Link>
    </AppShell>
  );
}
