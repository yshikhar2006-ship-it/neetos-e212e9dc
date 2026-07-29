import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ChevronLeft,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { useNotifications } from "@/hooks/use-notifications";
import { CommandPalette, useCommandPalette } from "@/components/shared/command-palette";
import { CountdownWidget } from "@/components/shared/countdown-widget";
import {
  NAV_ALL,
  NAV_FOOTER,
  NAV_MOBILE,
  NAV_PRIMARY,
  NAV_SECONDARY,
  NAV_STUDY_LOOP,
  type NavItem,
} from "@/components/shared/nav-config";

function NavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed?: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-caption font-medium text-muted-foreground transition-colors duration-150",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        "data-[status=active]:bg-primary/12 data-[status=active]:text-primary",
      )}
      activeProps={{ "aria-current": "page" }}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </Link>
  );
}

function SidebarSections({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { data: profile } = useProfile();
  return (
    <>
      <div className="space-y-1">
        {NAV_PRIMARY.map((i) => (
          <NavLink key={i.to} item={i} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
        {!collapsed ? <CountdownWidget compact examDate={profile?.exam_date} className="mt-2" /> : null}
      </div>
      <div className="my-3 border-t border-sidebar-border" />
      <div className="space-y-1">
        {NAV_STUDY_LOOP.map((i) => (
          <NavLink key={i.to} item={i} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </div>
      <div className="my-3 border-t border-sidebar-border" />
      <div className="space-y-1">
        {NAV_SECONDARY.map((i) => (
          <NavLink key={i.to} item={i} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </div>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { open, setOpen } = useCommandPalette();
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <CommandPalette open={open} onOpenChange={setOpen} />

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-2 px-1">
          {!collapsed ? (
            <Link to="/dashboard" className="font-display text-subheading font-extrabold tracking-tight">
              NEET<span className="text-primary">OS</span>
            </Link>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((c) => !c)}
          >
            <ChevronLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} aria-hidden />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto" aria-label="Main">
          <SidebarSections collapsed={collapsed} />
        </nav>
        <div className="mt-3 space-y-1 border-t border-sidebar-border pt-3">
          {NAV_FOOTER.map((i) => (
            <NavLink key={i.to} item={i} collapsed={collapsed} />
          ))}
        </div>
      </aside>

      <div className={cn("flex min-h-screen flex-col", collapsed ? "lg:pl-16" : "lg:pl-60")}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                    <Menu className="size-5" aria-hidden />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 overflow-y-auto bg-sidebar p-4">
                  <SheetTitle className="mb-4 font-display text-subheading font-extrabold">
                    NEET<span className="text-primary">OS</span>
                  </SheetTitle>
                  <nav aria-label="Mobile">
                    <SidebarSections onNavigate={() => setMobileOpen(false)} />
                    <div className="my-3 border-t border-sidebar-border" />
                    {NAV_ALL.filter((i) => !NAV_MOBILE.some((m) => m.to === i.to)).map((i) => (
                      <NavLink key={`more-${i.to}`} item={i} onNavigate={() => setMobileOpen(false)} />
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
              <Link to="/dashboard" className="font-display text-subheading font-extrabold lg:hidden">
                NEET<span className="text-primary">OS</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="hidden h-9 w-full max-w-md items-center gap-2 rounded-lg border border-input bg-card px-3 text-caption text-muted-foreground transition-colors hover:bg-accent sm:flex"
            >
              <Search className="size-4" aria-hidden />
              <span>Search topics, notes, tests…</span>
              <kbd className="num ml-auto rounded border border-border px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </button>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                aria-label="Search"
                onClick={() => setOpen(true)}
              >
                <Search className="size-5" aria-hidden />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Quick add">
                    <Plus className="size-5" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Quick add</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/planner">Study block</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/resources/notes">Note</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/revision/flashcards">Flashcard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/resources/doubts">Doubt</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" asChild aria-label="Notifications">
                <Link to="/notifications" className="relative">
                  <Bell className="size-5" aria-hidden />
                  {unreadCount > 0 ? (
                    <span className="num absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">
                      {unreadCount}
                    </span>
                  ) : null}
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Profile menu">
                    <UserIcon className="size-5" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">
                    {profile?.full_name ?? "Your account"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">User Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={toggleTheme}>
                    {theme === "dark" ? (
                      <Sun className="size-4" aria-hidden />
                    ) : (
                      <Moon className="size-4" aria-hidden />
                    )}
                    {theme === "dark" ? "Light mode" : "Dark mode"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void signOut()}>
                    <LogOut className="size-4" aria-hidden /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-3 py-4 pb-24 sm:px-4 lg:px-6 lg:py-6 lg:pb-10 2xl:max-w-[1440px]">
          {children}
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Primary mobile"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur lg:hidden"
      >
        {NAV_MOBILE.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={1.5} aria-hidden />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground"
        >
          <Menu className="size-5" strokeWidth={1.5} aria-hidden />
          More
        </button>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-heading font-bold text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-caption text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
