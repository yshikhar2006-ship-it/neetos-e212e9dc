import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { addDays, format, isBefore, parseISO } from "date-fns";
import { BrainCircuit, CalendarClock, Layers, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/app-shell";
import { StatCard, ProgressBar } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/state";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { LineChart, ChartDataTable, Sparkline } from "@/components/shared/charts";
import { StatusPill, SubjectBadge } from "@/components/shared/subject-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateFlashcard, useFlashcardDecks, useFlashcards } from "@/hooks/use-flashcards";
import { useFlashcardReviews } from "@/hooks/use-performance";
import { useTopicProgress } from "@/hooks/use-topic-progress";
import { useSubjects, useTopicSubjectMap } from "@/hooks/use-curriculum";
import { retentionCurve } from "@/lib/utils/spaced-repetition";
import { formatDate } from "@/lib/utils/format";

export const Route = createFileRoute("/_authenticated/revision/")({
  head: () => ({
    meta: [
      { title: "Revision Hub — NEET OS" },
      { name: "description", content: "Spaced repetition queue, retention curve and revision schedule." },
      { property: "og:title", content: "Revision Hub — NEET OS" },
      { property: "og:description", content: "Spaced repetition queue, retention curve and revision schedule." },
    ],
  }),
  component: RevisionHubPage,
});

const WINDOWS = [
  { value: "due", label: "Due now" },
  { value: "7", label: "Next 7 days" },
  { value: "all", label: "All topics" },
];

interface QueueRow {
  topic_id: string;
  due: string | null;
  status: string;
  confidence: number;
  revisions: number;
  subjectSlug?: string;
}

function RevisionHubPage() {
  const { data: cards = [], isLoading } = useFlashcards();
  const { data: decks = [] } = useFlashcardDecks();
  const { data: reviews = [] } = useFlashcardReviews();
  const { data: progress = [] } = useTopicProgress();
  const { data: topicMap = [] } = useTopicSubjectMap();
  const { data: subjects = [] } = useSubjects();
  const createCard = useCreateFlashcard();

  const [window, setWindow] = useState("due");
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const now = new Date();
  const dueCards = cards.filter((c) => isBefore(parseISO(c.next_review_at), now));
  const soonCards = cards.filter((c) => {
    const d = parseISO(c.next_review_at);
    return !isBefore(d, now) && isBefore(d, addDays(now, 7));
  });

  const subjectSlug = useMemo(() => {
    const topicToSubject = new Map(topicMap.map((t) => [t.id, t.subject_id]));
    const slugById = new Map(subjects.map((s) => [s.id, s.slug]));
    return (topicId?: string | null) => {
      const sid = topicId ? topicToSubject.get(topicId) : undefined;
      return sid ? slugById.get(sid) : undefined;
    };
  }, [topicMap, subjects]);

  const queue = useMemo<QueueRow[]>(() => {
    const rows = progress
      .filter((p) => p.next_revision_due_at)
      .map((p) => ({
        topic_id: p.topic_id,
        due: p.next_revision_due_at,
        status: p.status,
        confidence: p.confidence_rating,
        revisions: p.revision_count,
        subjectSlug: subjectSlug(p.topic_id),
      }));
    if (window === "due") return rows.filter((r) => r.due && isBefore(parseISO(r.due), now));
    if (window === "7")
      return rows.filter((r) => r.due && isBefore(parseISO(r.due), addDays(now, 7)));
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, window, subjectSlug]);

  const reviewSeries = useMemo(() => {
    const map = new Map<string, { total: number; good: number }>();
    for (const r of reviews) {
      const key = format(parseISO(r.reviewed_at), "yyyy-MM-dd");
      const cur = map.get(key) ?? { total: 0, good: 0 };
      cur.total += 1;
      if (r.rating >= 3) cur.good += 1;
      map.set(key, cur);
    }
    return [...map.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-14)
      .map(([date, v]) => ({
        date: format(parseISO(date), "d MMM"),
        recall: Math.round((v.good / v.total) * 100),
        reviews: v.total,
      }));
  }, [reviews]);

  const avgInterval = cards.length
    ? Math.round(cards.reduce((t, c) => t + Number(c.interval_days ?? 0), 0) / cards.length)
    : 0;
  const curve = retentionCurve(Math.max(1, avgInterval));

  const columns: Column<QueueRow>[] = [
    {
      key: "subject",
      header: "Subject",
      render: (r) =>
        r.subjectSlug ? <SubjectBadge slug={r.subjectSlug} size="sm" /> : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (r) => r.status,
      render: (r) => <StatusPill status={r.status as never} />,
    },
    {
      key: "confidence",
      header: "Confidence",
      sortValue: (r) => r.confidence,
      render: (r) => <ProgressBar value={(r.confidence / 5) * 100} className="min-w-24" />,
    },
    {
      key: "revisions",
      header: "Revisions",
      numeric: true,
      sortValue: (r) => r.revisions,
      render: (r) => r.revisions,
    },
    {
      key: "due",
      header: "Due",
      numeric: true,
      sortValue: (r) => r.due ?? "",
      render: (r) => (r.due ? formatDate(r.due, "d MMM") : "—"),
    },
  ];

  const addCard = async () => {
    if (!front.trim() || !back.trim()) {
      toast.error("Both sides of the card are needed");
      return;
    }
    await createCard.mutateAsync({ front: front.trim(), back: back.trim() });
    setFront("");
    setBack("");
    toast.success("Card added to today's queue");
  };

  return (
    <>
      <PageHeader
        title="Revision Hub"
        description="Spaced repetition queue, retention curve and revision schedule."
        actions={
          <Button asChild disabled={dueCards.length === 0}>
            <Link to="/revision/flashcards">
              <Sparkles className="size-4" aria-hidden />
              Review {dueCards.length} due
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Cards due today" value={dueCards.length} icon={BrainCircuit} accent="warning" />
        <StatCard label="Due in 7 days" value={soonCards.length} icon={CalendarClock} />
        <StatCard label="Total cards" value={cards.length} icon={Layers} hint={`${decks.length} decks`} />
        <StatCard
          label="Recall rate"
          value={reviews.length ? Math.round((reviews.filter((r) => r.rating >= 3).length / reviews.length) * 100) : 0}
          suffix="%"
          accent="success"
          hint={`${reviews.length} reviews logged`}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section className="surface min-w-0 p-5 lg:col-span-8" aria-label="Recall trend">
          <h2 className="text-subheading font-semibold">Recall over time</h2>
          {reviewSeries.length > 1 ? (
            <>
              <div className="mt-3">
                <LineChart
                  data={reviewSeries}
                  xKey="date"
                  yKeys={[
                    { key: "recall", tone: "success", label: "Recall %" },
                    { key: "reviews", tone: "primary", label: "Reviews" },
                  ]}
                  height={240}
                />
              </div>
              <ChartDataTable
                caption="Daily recall percentage and review volume"
                columns={["Date", "Recall %", "Reviews"]}
                rows={reviewSeries.map((r) => [r.date, r.recall, r.reviews])}
              />
            </>
          ) : (
            <p className="mt-6 text-caption text-muted-foreground">
              Grade a few cards and your recall trend appears here.
            </p>
          )}
        </section>

        <section className="surface min-w-0 p-5 lg:col-span-4" aria-label="Forgetting curve">
          <h2 className="text-subheading font-semibold">Forgetting curve</h2>
          <p className="mt-1 text-caption text-muted-foreground">
            Average interval {avgInterval} day{avgInterval === 1 ? "" : "s"} — retention decays to about{" "}
            {curve.at(-1)}% before the next review.
          </p>
          <div className="mt-4">
            <Sparkline values={curve} tone="warning" className="h-12 w-full" />
          </div>
          <ul className="mt-4 space-y-1.5 text-caption text-muted-foreground">
            <li>Grade honestly — an inflated rating pushes the card too far out.</li>
            <li>Cards you rate "Again" return within a day.</li>
          </ul>
        </section>
      </div>

      <section className="surface mt-4 p-5" aria-label="Topic revision queue">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-subheading font-semibold">Topic revision queue</h2>
          <FilterBar label="Due window" options={WINDOWS} value={window} onChange={setWindow} />
        </div>
        <div className="mt-4">
          <DataTable
            rows={queue}
            columns={columns}
            rowKey={(r) => r.topic_id}
            defaultSort={{ key: "due", dir: "asc" }}
            emptyMessage="Nothing scheduled in this window. Mark topics studied in the Syllabus tracker."
          />
        </div>
      </section>

      <section className="surface mt-4 p-5" aria-label="Add a flashcard">
        <h2 className="text-subheading font-semibold">Quick add card</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="card-front" className="text-caption font-medium">
              Front
            </label>
            <Input
              id="card-front"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Which hormone regulates blood calcium?"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="card-back" className="text-caption font-medium">
              Back
            </label>
            <Textarea
              id="card-back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={2}
              placeholder="Parathyroid hormone (PTH)"
            />
          </div>
        </div>
        <Button className="mt-3" onClick={addCard} disabled={createCard.isPending}>
          <Plus className="size-4" aria-hidden />
          Add card
        </Button>
      </section>

      {!isLoading && cards.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Layers}
            title="No flashcards yet"
            description="Add one above, or convert a logged mistake into a card straight from the Error Log."
          />
        </div>
      ) : null}
    </>
  );
}
