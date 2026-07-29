import { differenceInCalendarDays, format, isToday, parseISO } from "date-fns";

export const SUBJECT_SLUGS = ["physics", "chemistry", "botany", "zoology"] as const;
export type SubjectSlug = (typeof SUBJECT_SLUGS)[number];

export function subjectToken(slug?: string | null): SubjectSlug {
  const s = (slug ?? "").toLowerCase() as SubjectSlug;
  return SUBJECT_SLUGS.includes(s) ? s : "physics";
}

export function daysUntil(date?: string | Date | null): number {
  if (!date) return 0;
  const d = typeof date === "string" ? parseISO(date) : date;
  return Math.max(0, differenceInCalendarDays(d, new Date()));
}

export function formatDate(date?: string | Date | null, pattern = "d MMM yyyy") {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, pattern);
}

export function formatDay(date: string | Date) {
  const d = typeof date === "string" ? parseISO(date) : date;
  return isToday(d) ? "Today" : format(d, "EEE d MMM");
}

/** 360 -> "6:00 AM" */
export function minuteToLabel(minute: number) {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function pct(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}
