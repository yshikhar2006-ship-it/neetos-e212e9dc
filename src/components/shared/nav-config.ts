import type { LucideIcon } from "lucide-react";
import {
  Bot,
  BrainCircuit,
  CalendarDays,
  ClipboardList,
  Compass,
  FileText,
  FlaskConical,
  Flame,
  HelpCircle,
  LayoutDashboard,
  LibraryBig,
  ListTodo,
  NotebookPen,
  Settings,
  Target,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

export const NAV_PRIMARY: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Your day at a glance" },
];

export const NAV_STUDY_LOOP: NavItem[] = [
  { to: "/planner", label: "Planner", icon: CalendarDays, description: "Timeline, tasks and calendar" },
  { to: "/syllabus", label: "Syllabus", icon: LibraryBig, description: "Subjects, chapters and topics" },
  { to: "/practice", label: "Practice", icon: ClipboardList, description: "Mocks, PYQs and custom tests" },
  { to: "/analytics", label: "Analytics", icon: TrendingUp, description: "Trends, heatmap and rank" },
  { to: "/error-log", label: "Error Log", icon: NotebookPen, description: "Your wrong question notebook" },
  { to: "/revision", label: "Revision Hub", icon: BrainCircuit, description: "Flashcards and spaced repetition" },
];

export const NAV_SECONDARY: NavItem[] = [
  { to: "/resources", label: "Resources", icon: FileText, description: "Notes, NCERT, bookmarks, doubts" },
  { to: "/ai-coach", label: "AI Coach", icon: Bot, description: "Advice grounded in your own data" },
  { to: "/focus", label: "Focus Tools", icon: Timer, description: "Pomodoro and habit tracking" },
  { to: "/goals", label: "Goals", icon: Target, description: "Target college, rank and cutoffs" },
  { to: "/study-rooms", label: "Study Rooms", icon: Users, description: "Coming in Phase 3" },
];

export const NAV_FOOTER: NavItem[] = [
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/help", label: "Help", icon: HelpCircle },
];

export const NAV_MOBILE: NavItem[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/today", label: "Planner", icon: ListTodo },
  { to: "/practice", label: "Practice", icon: FlaskConical },
  { to: "/revision", label: "Revise", icon: Flame },
];

export const NAV_ALL: NavItem[] = [
  ...NAV_PRIMARY,
  { to: "/today", label: "Today's Tasks", icon: ListTodo, description: "Mobile-first checklist" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, description: "Month, week and agenda views" },
  ...NAV_STUDY_LOOP,
  ...NAV_SECONDARY,
  { to: "/habits", label: "Habit Tracker", icon: Flame, description: "Streaks, sleep and mood" },
  { to: "/cutoffs", label: "Cutoff Explorer", icon: Compass, description: "Historical closing ranks" },
  { to: "/profile", label: "User Profile", icon: Users, description: "Identity and badges" },
  { to: "/notifications", label: "Notifications", icon: FileText, description: "Everything that changed" },
  ...NAV_FOOTER,
];
