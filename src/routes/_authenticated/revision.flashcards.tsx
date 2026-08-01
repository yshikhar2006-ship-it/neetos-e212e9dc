import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { isBefore, parseISO } from "date-fns";
import { ArrowLeft, PartyPopper } from "lucide-react";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";
import { FlashcardFlip } from "@/components/shared/flashcard-flip";
import { ProgressBar } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { useFlashcards, useReviewFlashcard } from "@/hooks/use-flashcards";

export const Route = createFileRoute("/_authenticated/revision/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — NEET OS" },
      { name: "description", content: "Flip through cards scheduled for today and grade your recall." },
      { property: "og:title", content: "Flashcards — NEET OS" },
      { property: "og:description", content: "Flip through cards scheduled for today and grade your recall." },
    ],
  }),
  component: RevisionFlashcardsPage,
});

const RATINGS = [
  { rating: 0, label: "Again", hint: "No recall", variant: "destructive" as const },
  { rating: 3, label: "Hard", hint: "Slow recall", variant: "secondary" as const },
  { rating: 4, label: "Good", hint: "Recalled it", variant: "default" as const },
  { rating: 5, label: "Easy", hint: "Instant", variant: "secondary" as const },
];

function RevisionFlashcardsPage() {
  const { data: cards = [], isLoading } = useFlashcards();
  const review = useReviewFlashcard();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [graded, setGraded] = useState<string[]>([]);

  const queue = useMemo(() => {
    const now = new Date();
    return cards.filter((c) => isBefore(parseISO(c.next_review_at), now) && !graded.includes(c.id));
  }, [cards, graded]);

  const card = queue[index] ?? queue[0];
  const total = queue.length + graded.length;

  const grade = async (rating: number) => {
    if (!card) return;
    await review.mutateAsync({ card, rating });
    setGraded((g) => [...g, card.id]);
    setFlipped(false);
    setIndex(0);
  };

  const back = (
    <Button asChild variant="ghost" size="sm">
      <Link to="/revision">
        <ArrowLeft className="size-4" aria-hidden />
        Revision Hub
      </Link>
    </Button>
  );

  if (!isLoading && !card) {
    return (
      <>
        <PageHeader title="Flashcards" description="Flip through cards scheduled for today." actions={back} />
        <EmptyState
          icon={PartyPopper}
          title={graded.length > 0 ? "Queue cleared" : "Nothing due right now"}
          description={
            graded.length > 0
              ? `You graded ${graded.length} card${graded.length === 1 ? "" : "s"}. Come back when the next batch is scheduled.`
              : "Add cards in the Revision Hub or convert mistakes from the Error Log."
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Flashcards"
        description={`${queue.length} card${queue.length === 1 ? "" : "s"} left in today's queue.`}
        actions={back}
      />

      <div className="mx-auto max-w-2xl space-y-5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-caption text-muted-foreground">
            <span>Progress</span>
            <span className="num">
              {graded.length} / {total}
            </span>
          </div>
          <ProgressBar value={total ? (graded.length / total) * 100 : 0} />
        </div>

        {card ? (
          <FlashcardFlip
            key={card.id}
            front={card.front}
            back={card.back}
            flipped={flipped}
            onFlip={setFlipped}
          />
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RATINGS.map((r) => (
            <Button
              key={r.rating}
              variant={r.variant}
              disabled={!flipped || review.isPending}
              onClick={() => grade(r.rating)}
              className="flex-col items-start py-3"
            >
              <span className="font-medium">{r.label}</span>
              <span className="text-caption opacity-80">{r.hint}</span>
            </Button>
          ))}
        </div>
        {!flipped ? (
          <p className="text-center text-caption text-muted-foreground">Reveal the answer before grading.</p>
        ) : null}
      </div>
    </>
  );
}
