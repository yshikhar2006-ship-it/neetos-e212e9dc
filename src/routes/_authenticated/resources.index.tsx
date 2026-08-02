import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Bookmark as BookmarkIcon, HelpCircle, NotebookPen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/app-shell";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/state";
import { SearchInput } from "@/components/shared/search-input";
import { FilterBar } from "@/components/shared/filter-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBookmarks, useCreateBookmark, useDeleteBookmark, useDoubts, useNotes } from "@/hooks/use-resources";
import { useNcertProgress, useNcertSections } from "@/hooks/use-ncert";
import { formatDate } from "@/lib/utils/format";

export const Route = createFileRoute("/_authenticated/resources/")({
  head: () => ({
    meta: [
      { title: "Resources — NEET OS" },
      { name: "description", content: "Notes, NCERT reader, bookmarks and doubts in one vault." },
      { property: "og:title", content: "Resources — NEET OS" },
      { property: "og:description", content: "Notes, NCERT reader, bookmarks and doubts in one vault." },
    ],
  }),
  component: ResourcesOverviewPage,
});

const TYPES = [
  { value: "all", label: "All" },
  { value: "link", label: "Links" },
  { value: "video", label: "Videos" },
  { value: "pdf", label: "PDFs" },
  { value: "topic", label: "Topics" },
];

function ResourcesOverviewPage() {
  const { data: notes = [] } = useNotes();
  const { data: doubts = [] } = useDoubts();
  const { data: bookmarks = [], isLoading } = useBookmarks();
  const { data: sections = [] } = useNcertSections();
  const { data: ncertProgress = [] } = useNcertProgress();
  const createBookmark = useCreateBookmark();
  const deleteBookmark = useDeleteBookmark();

  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const readCount = ncertProgress.filter((p) => p.is_read).length;
  const openDoubts = doubts.filter((d) => d.status !== "resolved").length;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bookmarks.filter(
      (b) => (type === "all" || b.resource_type === type) && (!term || b.label.toLowerCase().includes(term)),
    );
  }, [bookmarks, search, type]);

  const add = () => {
    if (!label.trim()) {
      toast.error("Give the bookmark a label.");
      return;
    }
    createBookmark.mutate(
      { label: label.trim(), resource_type: url.trim() ? "link" : "topic", url: url.trim() || null },
      {
        onSuccess: () => {
          setLabel("");
          setUrl("");
          toast.success("Bookmark saved.");
        },
        onError: () => toast.error("Could not save the bookmark."),
      },
    );
  };

  return (
    <>
      <PageHeader title="Resources" description="Your notes, NCERT reading, bookmarks and unresolved doubts." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Notes" value={notes.length} icon={NotebookPen} hint={`${notes.filter((n) => n.is_pinned).length} pinned`} />
        <StatCard
          label="NCERT lines read"
          value={readCount}
          suffix={`/ ${sections.length}`}
          icon={BookOpen}
          accent="botany"
        />
        <StatCard label="Open doubts" value={openDoubts} icon={HelpCircle} accent={openDoubts ? "warning" : "success"} />
        <StatCard label="Bookmarks" value={bookmarks.length} icon={BookmarkIcon} accent="primary" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="surface p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-subheading font-semibold">Bookmarks</h2>
            <SearchInput value={search} onChange={setSearch} placeholder="Search bookmarks…" className="w-full sm:w-64" />
          </div>
          <FilterBar label="Bookmark type" options={TYPES} value={type} onChange={setType} className="mt-3" />

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. Thermodynamics revision video)" />
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… (optional)" className="sm:max-w-[220px]" />
            <Button onClick={add} disabled={createBookmark.isPending}>
              <Plus className="size-4" aria-hidden /> Add
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {isLoading ? null : filtered.length ? (
              filtered.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <BookmarkIcon className="size-4 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0 flex-1">
                    {b.url ? (
                      <a
                        href={b.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="block truncate text-body font-medium hover:underline"
                      >
                        {b.label}
                      </a>
                    ) : (
                      <span className="block truncate text-body font-medium">{b.label}</span>
                    )}
                    <span className="text-caption text-muted-foreground">
                      {b.resource_type} · {formatDate(b.created_at)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${b.label}`}
                    onClick={() => deleteBookmark.mutate(b.id)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              ))
            ) : (
              <EmptyState
                icon={BookmarkIcon}
                title="No bookmarks yet"
                description="Save the videos, PDFs and topics you keep coming back to."
              />
            )}
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="text-subheading font-semibold">Jump back in</h2>
          <div className="mt-4 space-y-3">
            <QuickLink to="/resources/notes" icon={NotebookPen} title="Notes Vault" hint={`${notes.length} notes`} />
            <QuickLink to="/resources/ncert" icon={BookOpen} title="NCERT Reader" hint={`${readCount} of ${sections.length} lines read`} />
            <QuickLink to="/resources/doubts" icon={HelpCircle} title="Doubt Journal" hint={`${openDoubts} open`} />
          </div>
          {notes.length ? (
            <div className="mt-6">
              <h3 className="text-caption font-medium text-muted-foreground">Recent notes</h3>
              <ul className="mt-2 space-y-1">
                {notes.slice(0, 5).map((n) => (
                  <li key={n.id} className="truncate text-caption">
                    {n.title}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}

function QuickLink({
  to,
  icon: Icon,
  title,
  hint,
}: {
  to: string;
  icon: typeof NotebookPen;
  title: string;
  hint: string;
}) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 hover:bg-accent">
      <Icon className="size-4 text-primary" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium">{title}</span>
        <span className="block text-caption text-muted-foreground">{hint}</span>
      </span>
    </Link>
  );
}
