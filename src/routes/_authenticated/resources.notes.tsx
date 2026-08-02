import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { NotebookPen, Pin, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";
import { SearchInput } from "@/components/shared/search-input";
import { FilterBar } from "@/components/shared/filter-bar";
import { SidePanel } from "@/components/shared/side-panel";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteNote, useNotes, useSaveNote, type Note } from "@/hooks/use-resources";
import { useSubjects } from "@/hooks/use-curriculum";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/resources/notes")({
  head: () => ({
    meta: [
      { title: "Notes Vault — NEET OS" },
      { name: "description", content: "Your notes, linked to subjects and chapters, searchable in one place." },
      { property: "og:title", content: "Notes Vault — NEET OS" },
      { property: "og:description", content: "Your notes, linked to subjects and chapters, searchable in one place." },
    ],
  }),
  component: NotesVaultPage,
});

function NotesVaultPage() {
  const { data: notes = [], isLoading } = useNotes();
  const { data: subjects = [] } = useSubjects();
  const saveNote = useSaveNote();
  const deleteNote = useDeleteNote();

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [active, setActive] = useState<Note | null>(null);
  const [draft, setDraft] = useState<{ id?: string; title: string; text: string; subject_id: string | null; is_pinned: boolean } | null>(
    null,
  );

  const slugById = useMemo(() => new Map(subjects.map((s) => [s.id, s.slug])), [subjects]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return notes
      .filter(
        (n) =>
          (subjectFilter === "all" || n.subject_id === subjectFilter) &&
          (!term ||
            n.title.toLowerCase().includes(term) ||
            (n.content?.text ?? "").toLowerCase().includes(term)),
      )
      .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned));
  }, [notes, search, subjectFilter]);

  const openNew = () => setDraft({ title: "", text: "", subject_id: null, is_pinned: false });

  const openEdit = (note: Note) => {
    setActive(note);
    setDraft({
      id: note.id,
      title: note.title,
      text: note.content?.text ?? "",
      subject_id: note.subject_id,
      is_pinned: note.is_pinned,
    });
  };

  const close = () => {
    setDraft(null);
    setActive(null);
  };

  const submit = () => {
    if (!draft?.title.trim()) {
      toast.error("Give the note a title.");
      return;
    }
    saveNote.mutate(
      { ...draft, title: draft.title.trim(), subject_id: draft.subject_id },
      {
        onSuccess: () => {
          toast.success(draft.id ? "Note updated." : "Note saved.");
          close();
        },
        onError: () => toast.error("Could not save the note."),
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Notes Vault"
        description="Everything you've written down, searchable and linked to your syllabus."
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" aria-hidden /> New note
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search titles and content…" autoFocusKey="/" className="sm:max-w-sm" />
        <FilterBar
          label="Subject"
          value={subjectFilter}
          onChange={setSubjectFilter}
          options={[{ value: "all", label: "All subjects" }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]}
        />
      </div>

      <div className="mt-5">
        {isLoading ? null : filtered.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((note) => (
              <article key={note.id} className={cn("surface elevate flex flex-col p-4", note.is_pinned && "border-primary/40")}>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="min-w-0 flex-1 truncate text-body font-semibold">{note.title}</h2>
                  {note.is_pinned ? <Pin className="size-4 shrink-0 text-primary" aria-label="Pinned" /> : null}
                </div>
                <p className="mt-2 line-clamp-4 flex-1 text-caption text-muted-foreground">{note.content?.text ?? "No content yet."}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  {note.subject_id ? <SubjectBadge slug={slugById.get(note.subject_id)} size="sm" /> : <span />}
                  <span className="text-caption text-muted-foreground">{formatDate(note.updated_at)}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(note)}>
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      deleteNote.mutate(note.id, {
                        onSuccess: () => toast.success("Note deleted."),
                      })
                    }
                  >
                    <Trash2 className="size-4" aria-hidden /> Delete
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={NotebookPen}
            title="No notes yet"
            description="Write down the derivations, exceptions and one-liners you keep forgetting."
            actionLabel="Write your first note"
            onAction={openNew}
          />
        )}
      </div>

      <SidePanel
        open={!!draft}
        onOpenChange={(open) => (open ? null : close())}
        title={draft?.id ? "Edit note" : "New note"}
        description={active ? `Last updated ${formatDate(active.updated_at)}` : "Notes are private to your account."}
      >
        {draft ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="note-title" className="text-caption font-medium">
                Title
              </label>
              <Input
                id="note-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Thermodynamics — sign conventions"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="note-body" className="text-caption font-medium">
                Note
              </label>
              <Textarea
                id="note-body"
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                rows={12}
                placeholder="Write it in your own words — that's what makes it stick."
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-caption font-medium">Subject</span>
              <FilterBar
                label="Note subject"
                value={draft.subject_id ?? "none"}
                onChange={(v) => setDraft({ ...draft, subject_id: v === "none" ? null : v })}
                options={[{ value: "none", label: "None" }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant={draft.is_pinned ? "default" : "outline"}
                size="sm"
                onClick={() => setDraft({ ...draft, is_pinned: !draft.is_pinned })}
              >
                <Pin className="size-4" aria-hidden /> {draft.is_pinned ? "Pinned" : "Pin note"}
              </Button>
              <Button onClick={submit} disabled={saveNote.isPending}>
                <Save className="size-4" aria-hidden /> Save
              </Button>
            </div>
          </div>
        ) : null}
      </SidePanel>
    </>
  );
}
