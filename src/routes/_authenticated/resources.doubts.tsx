import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, HelpCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/app-shell";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/state";
import { SearchInput } from "@/components/shared/search-input";
import { FilterBar } from "@/components/shared/filter-bar";
import { SidePanel } from "@/components/shared/side-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateDoubt, useDeleteDoubt, useDoubts, useUpdateDoubt, type Doubt } from "@/hooks/use-resources";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/resources/doubts")({
  head: () => ({
    meta: [
      { title: "Doubt Journal — NEET OS" },
      { name: "description", content: "Track unresolved doubts until they're cleared, then keep the answer." },
      { property: "og:title", content: "Doubt Journal — NEET OS" },
      { property: "og:description", content: "Track unresolved doubts until they're cleared, then keep the answer." },
    ],
  }),
  component: DoubtJournalPage,
});

const STATES = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

function DoubtJournalPage() {
  const { data: doubts = [], isLoading } = useDoubts();
  const createDoubt = useCreateDoubt();
  const updateDoubt = useUpdateDoubt();
  const deleteDoubt = useDeleteDoubt();

  const [state, setState] = useState("open");
  const [search, setSearch] = useState("");
  const [question, setQuestion] = useState("");
  const [active, setActive] = useState<Doubt | null>(null);
  const [answer, setAnswer] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return doubts.filter(
      (d) =>
        (state === "all" || (state === "resolved" ? d.status === "resolved" : d.status !== "resolved")) &&
        (!term || d.question.toLowerCase().includes(term) || (d.answer ?? "").toLowerCase().includes(term)),
    );
  }, [doubts, state, search]);

  const openCount = doubts.filter((d) => d.status !== "resolved").length;
  const oldestOpen = doubts.filter((d) => d.status !== "resolved").at(-1);

  const add = () => {
    if (!question.trim()) {
      toast.error("Write the doubt first.");
      return;
    }
    createDoubt.mutate(
      { question: question.trim() },
      {
        onSuccess: () => {
          setQuestion("");
          toast.success("Doubt logged.");
        },
        onError: () => toast.error("Could not log the doubt."),
      },
    );
  };

  const open = (doubt: Doubt) => {
    setActive(doubt);
    setAnswer(doubt.answer ?? "");
  };

  const resolve = () => {
    if (!active) return;
    updateDoubt.mutate(
      { id: active.id, answer: answer.trim() || null, status: "resolved" },
      {
        onSuccess: () => {
          toast.success("Doubt cleared.");
          setActive(null);
        },
        onError: () => toast.error("Could not update the doubt."),
      },
    );
  };

  const saveAnswer = () => {
    if (!active) return;
    updateDoubt.mutate(
      { id: active.id, answer: answer.trim() || null },
      { onSuccess: () => toast.success("Answer saved."), onError: () => toast.error("Could not save the answer.") },
    );
  };

  return (
    <>
      <PageHeader title="Doubt Journal" description="A doubt you never wrote down is a doubt you never cleared." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open doubts" value={openCount} icon={HelpCircle} accent={openCount ? "warning" : "success"} />
        <StatCard label="Resolved" value={doubts.length - openCount} icon={CheckCircle2} accent="success" />
        <StatCard
          label="Oldest open"
          value={oldestOpen ? formatDate(oldestOpen.created_at, "d MMM") : "—"}
          hint={oldestOpen ? "Clear this one first" : "Nothing pending"}
        />
      </div>

      <section className="surface mt-6 p-5">
        <h2 className="text-subheading font-semibold">Log a doubt</h2>
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder="Why does the equilibrium shift when pressure increases in this reaction?"
          className="mt-3"
        />
        <Button className="mt-3" onClick={add} disabled={createDoubt.isPending}>
          <Plus className="size-4" aria-hidden /> Add doubt
        </Button>
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterBar label="Doubt state" options={STATES} value={state} onChange={setState} />
        <SearchInput value={search} onChange={setSearch} placeholder="Search doubts…" className="sm:max-w-sm" />
      </div>

      <div className="mt-4 space-y-2">
        {isLoading ? null : filtered.length ? (
          filtered.map((d) => (
            <article
              key={d.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border border-border px-3 py-3",
                d.status === "resolved" && "opacity-70",
              )}
            >
              <HelpCircle
                className={cn("mt-0.5 size-4 shrink-0", d.status === "resolved" ? "text-success" : "text-warning")}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-body">{d.question}</p>
                <span className="text-caption text-muted-foreground">
                  {d.status === "resolved" ? `Resolved ${formatDate(d.resolved_at)}` : `Logged ${formatDate(d.created_at)}`}
                </span>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="outline" size="sm" onClick={() => open(d)}>
                  {d.status === "resolved" ? "View" : "Resolve"}
                </Button>
                <Button variant="ghost" size="icon" aria-label="Delete doubt" onClick={() => deleteDoubt.mutate(d.id)}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </article>
          ))
        ) : (
          <EmptyState icon={HelpCircle} title="No doubts here" description="Either you're all caught up, or nothing matches this filter." />
        )}
      </div>

      <SidePanel
        open={!!active}
        onOpenChange={(o) => (o ? null : setActive(null))}
        title="Doubt"
        description={active ? `Logged ${formatDate(active.created_at)}` : undefined}
      >
        {active ? (
          <div className="space-y-4">
            <p className="rounded-lg border border-border bg-muted/40 p-3 text-body">{active.question}</p>
            <div className="space-y-1.5">
              <label htmlFor="doubt-answer" className="text-caption font-medium">
                Answer / explanation
              </label>
              <Textarea
                id="doubt-answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={8}
                placeholder="Write the answer in your own words so future-you understands it."
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={saveAnswer} disabled={updateDoubt.isPending}>
                Save answer
              </Button>
              {active.status !== "resolved" ? (
                <Button onClick={resolve} disabled={updateDoubt.isPending}>
                  <CheckCircle2 className="size-4" aria-hidden /> Mark resolved
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() =>
                    updateDoubt.mutate(
                      { id: active.id, status: "open" },
                      { onSuccess: () => setActive(null) },
                    )
                  }
                >
                  Reopen
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </SidePanel>
    </>
  );
}
