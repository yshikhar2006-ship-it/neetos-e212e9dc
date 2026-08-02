import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/resources")({
  component: ResourcesLayout,
});

const TABS = [
  { to: "/resources", label: "Overview" },
  { to: "/resources/notes", label: "Notes Vault" },
  { to: "/resources/ncert", label: "NCERT Reader" },
  { to: "/resources/doubts", label: "Doubt Journal" },
];

function ResourcesLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-5">
      <nav aria-label="Resources sections" className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = tab.to === "/resources" ? pathname === "/resources" : pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "rounded-full border px-3 py-1.5 text-caption font-medium transition-colors duration-150",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
