import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { sm2 } from "@/lib/utils/spaced-repetition";

export interface Flashcard {
  id: string;
  user_id: string;
  deck_id: string | null;
  topic_id: string | null;
  front: string;
  back: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
  created_at: string;
}

export interface FlashcardDeck {
  id: string;
  name: string;
  description: string | null;
  subject_id: string | null;
}

export function useFlashcards() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["flashcards", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Flashcard[]> => {
      const { data, error } = await supabase
        .from("flashcards")
        .select("*")
        .eq("user_id", user!.id)
        .order("next_review_at");
      if (error) throw error;
      return (data ?? []) as Flashcard[];
    },
  });
}

export function useFlashcardDecks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["flashcard-decks", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<FlashcardDeck[]> => {
      const { data, error } = await supabase
        .from("flashcard_decks")
        .select("id, name, description, subject_id")
        .eq("user_id", user!.id)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as FlashcardDeck[];
    },
  });
}

export function useCreateFlashcard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { front: string; back: string; topic_id?: string | null; deck_id?: string | null }) => {
      const { data, error } = await supabase
        .from("flashcards")
        .insert({ ...input, user_id: user!.id, next_review_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return data as Flashcard;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flashcards"] }),
  });
}

export function useDeleteFlashcard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("flashcards").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flashcards"] }),
  });
}

/** Grade a card with SM-2 and persist both the card state and the review row. */
export function useReviewFlashcard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ card, rating }: { card: Flashcard; rating: number }) => {
      const next = sm2(
        {
          easeFactor: Number(card.ease_factor),
          intervalDays: Number(card.interval_days),
          repetitions: Number(card.repetitions),
        },
        rating,
      );
      const nextReview = new Date(Date.now() + next.intervalDays * 86400000).toISOString();

      const { error: cardError } = await supabase
        .from("flashcards")
        .update({
          ease_factor: next.easeFactor,
          interval_days: next.intervalDays,
          repetitions: next.repetitions,
          next_review_at: nextReview,
        })
        .eq("id", card.id);
      if (cardError) throw cardError;

      const { error: reviewError } = await supabase.from("flashcard_reviews").insert({
        user_id: user!.id,
        flashcard_id: card.id,
        rating,
        ease_factor: next.easeFactor,
        interval_days: next.intervalDays,
        next_review_at: nextReview,
      });
      if (reviewError) throw reviewError;
      return next;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flashcards"] });
      qc.invalidateQueries({ queryKey: ["flashcard-reviews"] });
    },
  });
}
