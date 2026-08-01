import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, NotebookPen, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { SidePanel } from "@/components/shared/side-panel";
import { SearchInput } from "@/components/shared/search-input";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteErrorEntry,
  useErrorLog,
  useErrorQuestions,
  useUpdateErrorEntry,
  MISTAKE_TYPES,
  type ErrorEntry,
  type MistakeType,
} from "@/hooks/use-error-log";
import { useCreateFlashcard } from "@/hooks/use-flashcards";
import { formatDate } from "@/lib/utils/format";

export const Route = createFileRoute("/_authenticated/error-log")({
  head: () => ({
    meta: [
      { title: "Error Log — NEET OS" },
      { name: "description", content: "Every wrong question, tagged by mistake type." },
      { property: "og:title", content: "Error Log — NEET OS" },
      { property: "og:description", content: "Every wrong question, tagged by mistake type." },
    ],
  }),
  component: ErrorLogPage,
});

const MISTAKE_LABEL: Record<MistakeType, string> = {
  conceptual: "Conceptual",
  silly: "Silly",
  calculation: "Calculation",
  time_pressure: "Time pressure",
  misread: "Misread",
  guessed: "Guessed",
  unattempted: "Unattempted",
};

const STATUS_FILTERS = [
  { value: "open", label: "Unresolved" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

interface QuestionRow {
  id: string;
  question_text: string;
  options: unknown;
  correct_option: number;
  explanation: string | null;
  subject_id: string | null;
  difficulty: string;
}

function ErrorLogPage() {
  const { data: entries = [], isLoading } = useErrorLog();
  const update = useUpdateErrorEntry();
  const remove = useDeleteErrorEntry();
  const createCard = useCreateFlashcard();

  const [status, setStatus] = useState("open");
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const questionIds = useMemo(
    () => [...new Set(entries.map((e) => e.question_id).filter(Boolean) as string[])],
    [entries],
  );
  const { data: questions = [] } = useErrorQuestions(questionIds);
  const questionById = useMemo(
    () => new Map((questions as unknown as QuestionRow[]).map((q) => [q.id, q])),
    [questions],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (status === "open" && e.resolved) return false;
      if (status === "resolved" && !e.resolved) return false;
      if (type !== "all" && e.mistake_type !== type) return false;
      if (!q) return true;
      const text = e.question_id ? (questionById.get(e.question_id)?.question_text ?? "") : "";
      return `${e.note ?? ""} ${text}`.toLowerCase().includes(q);
    });
  }, [entries, status, type, query, questionById]);

  const active = entries.find((e) => e.id === activeId) ?? null;
  const activeQuestion = active?.question_id ? questionById.get(active.question_id) : undefined;
  const activeOptions = Array.isArray(activeQuestion?.options) ? (activeQuestion!.options as string[]) : [];

  const openEntry = (entry: ErrorEntry) => {
    setActiveId(entry.id);
    setNote(entry.note ?? "");
  };

  const columns: Column<ErrorEntry>[] = [
    {
      key: "question",
      header: "Question",
      sortValue: (r) => (r.question_id ? (questionById.get(r.question_id)?.question_text ?? "") : (r.note ?? "")),
      render: (r) => {
        const q = r.question_id ? questionById.get(r.question_id) : undefined;
        return (
          <span className="block max-w-[28rem] truncate font-medium text-foreground">
            {q?.question_text ?? r.note ?? "Manual entry"}
          </span>
        );
      },
    },
    {
      key: "subject",
      header: "Subject",
      render: (r) => {
        const q = r.question_id ? questionById.get(r.question_id) : undefined;
        return q?.subject_id ? <SubjectBadge slug={q.subject_id} size="sm" /> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      key: "mistake_type",
      header: "Mistake",
      sortValue: (r) => MISTAKE_LABEL[r.mistake_type],
      render: (r) => (
        <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-caption">
          {MISTAKE_LABEL[r.mistake_type]}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Logged",
      numeric: true,
      sortValue: (r) => r.created_at,
      render: (r) => formatDate(r.created_at, "d MMM"),
    },
    {
      key: "state",
      header: "State",
      sortValue: (r) => (r.resolved ? 1 : 0),
      render: (r) => (
        <span className={r.resolved ? "text-success" : "text-warning"}>{r.resolved ? "Resolved" : "Open"}</span>
      ),
    },
  ];

  const convert = async (entry: ErrorEntry) => {
    const q = entry.question_id ? questionById.get(entry.question_id) : undefined;
    const front = q?.question_text ?? entry.note ?? "Reviewed mistake";
    const options = Array.isArray(q?.options) ? (q!.options as string[]) : [];
    const back = q ? (options[q.correct_option] ?? q.explanation ?? "See explanation") : (entry.note ?? "");
    await createCard.mutateAsync({ front, back, topic_id: entry.topic_id });
    await update.mutateAsync({ id: entry.id, converted_to_flashcard: true });
    toast.success("Flashcard created from this mistake");
  };

  if (!isLoading && entries.length === 0) {
    return (
      <>
        <PageHeader title="Error Log" description="Every wrong question, tagged by mistake type." />
        <EmptyState
          icon={NotebookPen}
          title="Your notebook is empty"
          description="After a test, open the results screen and log each wrong answer with its mistake type. They collect here."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Error Log"
        description="Every wrong question, tagged by mistake type."
        actions={<SearchInput value={query} onChange={setQuery} placeholder="Search notes and questions" />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total logged" value={entries.length} icon={NotebookPen} />
        <StatCard label="Unresolved" value={entries.filter((e) => !e.resolved).length} accent="warning" />
        <StatCard
          label="Made into flashcards"
          value={entries.filter((e) => e.converted_to_flashcard).length}
          accent="success"
        />
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <FilterBar label="Resolution state" options={STATUS_FILTERS} value={status} onChange={setStatus} />
        <FilterBar
          label="Mistake type"
          options={[{ value: "all", label: "All types" }, ...MISTAKE_TYPES.map((t) => ({ value: t, label: MISTAKE_LABEL[t] }))]}
          value={type}
          onChange={setType}
        />
      </div>

      <div className="mt-4">
        <DataTable
          rows={filtered}
          columns={columns}
          rowKey={(r) => r.id}
          onRowClick={openEntry}
          defaultSort={{ key: "created_at", dir: "desc" }}
          emptyMessage="No mistakes match these filters."
        />
      </div>

      <SidePanel
        open={!!active}
        onOpenChange={(open) => setActiveId(open ? activeId : null)}
        title={active ? MISTAKE_LABEL[active.mistake_type] : "Mistake"}
        description={active ? `Logged ${formatDate(active.created_at)}` : undefined}
      >
        {active ? (
          <div className="space-y-5">
            {activeQuestion ? (
              <div className="space-y-3">
                <p className="text-body font-medium text-foreground">{activeQuestion.question_text}</p>
                <ol className="space-y-1.5">
                  {activeOptions.map((opt, i) => (
                    <li
                      key={i}
                      className={
                        i === activeQuestion.correct_option
                          ? "rounded-md border border-success/40 bg-success/10 px-2.5 py-1.5 text-caption text-success"
                          : "rounded-md border border-border px-2.5 py-1.5 text-caption text-muted-foreground"
                      }
                    >
                      {opt}
                    </li>
                  ))}
                </ol>
                {activeQuestion.explanation ? (
                  <p className="rounded-md bg-muted p-3 text-caption text-muted-foreground">
                    {activeQuestion.explanation}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-caption text-muted-foreground">This entry has no linked question.</p>
            )}

            <div className="space-y-2">
              <label htmlFor="mistake-note" className="text-caption font-medium">
                Why did this go wrong?
              </label>
              <Textarea
                id="mistake-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="e.g. mixed up the formula for angular momentum"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  update.mutate({ id: active.id, note });
                  toast.success("Note saved");
                }}
              >
                Save note
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => update.mutate({ id: active.id, resolved: !active.resolved })}
              >
                <Check className="size-4" aria-hidden />
                {active.resolved ? "Mark unresolved" : "Mark resolved"}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={active.converted_to_flashcard || createCard.isPending}
                onClick={() => convert(active)}
              >
                <Sparkles className="size-4" aria-hidden />
                {active.converted_to_flashcard ? "Already a flashcard" : "Make flashcard"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  remove.mutate(active.id);
                  setActiveId(null);
                }}
              >
                <Trash2 className="size-4" aria-hidden />
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </SidePanel>
    </>
  );
}
