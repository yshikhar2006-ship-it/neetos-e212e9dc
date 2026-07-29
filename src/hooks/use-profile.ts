import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  attempt_type: "class_11" | "class_12" | "dropper" | "repeater" | null;
  target_exam_year: number;
  exam_date: string | null;
  category: string | null;
  quota: string | null;
  coaching_institute: string | null;
  subscription_tier: "free" | "premium" | "premium_plus";
  onboarding_completed: boolean;
  theme: string;
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user!.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useSubscriptionTier() {
  const { data } = useProfile();
  const tier = data?.subscription_tier ?? "free";
  return {
    tier,
    isPremium: tier !== "free",
    isPremiumPlus: tier === "premium_plus",
  };
}
