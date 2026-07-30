import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface HabitLog {
  id: string;
  log_date: string;
  study_hours: number;
  pomodoro_count: number;
  sleep_hours: number | null;
  mood: number | null;
  note: string | null;
}

/** Single source for every study-hours surface: dashboard, habits, analytics. */
export function useHabitLogs(days = 180) {
  const { user } = useAuth();
  const from = format(subDays(new Date(), days), "yyyy-MM-dd");
  return useQuery({
    queryKey: ["habit-logs", user?.id, days],
    enabled: !!user,
    queryFn: async (): Promise<HabitLog[]> => {
      const { data, error } = await supabase
        .from("habit_logs")
        .select("id, log_date, study_hours, pomodoro_count, sleep_hours, mood, note")
        .eq("user_id", user!.id)
        .gte("log_date", from)
        .order("log_date");
      if (error) throw error;
      return (data ?? []) as HabitLog[];
    },
  });
}

export function useUpsertHabitLog() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<HabitLog> & { log_date: string }) => {
      const { data, error } = await supabase
        .from("habit_logs")
        .upsert({ ...input, user_id: user!.id }, { onConflict: "user_id,log_date" })
        .select()
        .single();
      if (error) throw error;
      return data as HabitLog;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habit-logs"] }),
  });
}

/** Consecutive days ending today (or yesterday) with logged activity. */
export function streakFrom(logs: HabitLog[]): number {
  const active = new Set(logs.filter((l) => Number(l.study_hours) > 0).map((l) => l.log_date));
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const day = format(subDays(new Date(), i), "yyyy-MM-dd");
    if (active.has(day)) streak += 1;
    else if (i > 0) break;
  }
  return streak;
}
