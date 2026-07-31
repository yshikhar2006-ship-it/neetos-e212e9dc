import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpenCheck, LibraryBig } from "lucide-react";
import { PageHeader } from "@/components/shared/app-shell";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterBar } from "@/components/shared/filter-bar";
import { SearchInput } from "@/components/shared/search-input";
import { SidePanel } from "@/components/shared/side-panel";
import { StatCard, ProgressBar } from "@/components/shared/stat-card";
import { StatusPill, SubjectBadge, TOPIC_STATUSES } from "@/components/shared/subject-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChapters, useSubjects, useTopics, type Chapter } from "@/hooks/use-curriculum";
import { useTopicProgress, useUpsertTopicProgress, type TopicStatus } from "@/hooks/use-topic-progress";
import { useNcertProgress, useNcertSections, useToggleNcertSection } from "@/hooks/use-ncert";
import { pct } from "@/lib/utils/format";

export const Route = createFileRoute("/_authenticated/syllabus")({
  head: () => ({
    meta: [
      { title: "Syllabus Tracker — NEET OS" },
      { name: "description", content: "Chapter-by-chapter coverage, topic status and the NCERT reading checklist." },
      { property: "og:title", content: "Syllabus Tracker — NEET OS" },
      { property: "og:description", content: "Chapter-by-chapter coverage and NCERT line-by-line reading." },
    ],
  }),
  component: SyllabusPage,
});

const DONE: TopicStatus[] = ["completed", "revised", "mastered"];

function SyllabusPage() {
  const { data: subjects = [] } = useSubjects();
  const [subjectId, setSubjectId] = useState("all");
  const [query, setQuery] = useState("");
  const [openChapter, setOpenChapter] = useState<Chapter | null>(null);

  const { data: chapters = [] } = useChapters(subjectId === "all" ? undefined : subjectId);
  const { data: progress = [] } = useTopicProgress();
  const { data: allTopics = [] } = useTopics(undefined);

  const progressByTopic = useMemo(
    () => new Map(progress.map((p) => [p.topic_id, p])),
    [progress],
  );

  const chapterStats = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    for (const t of allTopics) {
      const entry = map.get(t.chapter_id) ?? { total: 0, done: 0 };
      entry.total += 1;
      const p = progressByTopic.get(t.id);
      if (p && DONE.includes(p.status)) entry.done += 1;
      map.set(t.chapter_id, entry);
    }
    return map;
  }, [allTopics, progressByTopic]);

  const filtered = chapters.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  const totals = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const c of chapters) {
      const s = chapterStats.get(c.id);
      total += s?.total ?? 0;
      done += s?.done ?? 0;
    }
    return { total, done };
  }, [chapters, chapterStats]);

  const columns: Column<Chapter>[] = [
    {
      key: "name",
      header: "Chapter",
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.name}</p>
          <p className="text-caption text-muted-foreground">Class {r.class_level}</p>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      sortValue: (r) => r.subject_id,
      render: (r) => <SubjectBadge slug={subjects.find((s) => s.id === r.subject_id)?.slug} />,
    },
    {
      key: "weightage",
      header: "Weightage",
      numeric: true,
      sortValue: (r) => Number(r.weightage_score),
      render: (r) => <span>{Number(r.weightage_score).toFixed(1)}</span>,
    },
    {
      key: "avg",
      header: "Avg Qs",
      numeric: true,
      sortValue: (r) => Number(r.avg_questions),
      render: (r) => <span>{Number(r.avg_questions).toFixed(1)}</span>,
    },
    {
      key: "coverage",
      header: "Coverage",
      sortValue: (r) => {
        const s = chapterStats.get(r.id);
        return pct(s?.done ?? 0, Math.max(s?.total ?? 0, 1));
      },
      render: (r) => {
        const s = chapterStats.get(r.id) ?? { total: 0, done: 0 };
        return (
          <div className="w-36">
            <ProgressBar value={pct(s.done, Math.max(s.total, 1))} />
            <span className="num text-caption text-muted-foreground">
              {s.done}/{s.total} topics
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Syllabus Tracker"
        description="Chapter-by-chapter coverage, topic status and the NCERT reading checklist."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Chapters in view" value={filtered.length} icon={LibraryBig} />
        <StatCard
          label="Topics completed"
          value={`${totals.done}/${totals.total}`}
          icon={BookOpenCheck}
          hint={`${pct(totals.done, Math.max(totals.total, 1))}% covered`}
        />
        <StatCard label="Subjects" value={subjects.length} icon={LibraryBig} />
      </div>

      <Tabs defaultValue="chapters">
        <TabsList>
          <TabsTrigger value="chapters">Chapters</TabsTrigger>
          <TabsTrigger value="ncert">NCERT checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="chapters" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <FilterBar
              label="Filter by subject"
              value={subjectId}
              onChange={setSubjectId}
              options={[{ value: "all", label: "All subjects" }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]}
            />
            <SearchInput value={query} onChange={setQuery} placeholder="Search chapters" className="sm:w-64" />
          </div>
          <DataTable
            rows={filtered}
            columns={columns}
            rowKey={(r) => r.id}
            onRowClick={setOpenChapter}
            defaultSort={{ key: "weightage", dir: "desc" }}
            emptyMessage="No chapters match these filters."
          />
        </TabsContent>

        <TabsContent value="ncert" className="mt-4">
          <NcertChecklist subjectId={subjectId} />
        </TabsContent>
      </Tabs>

      <SidePanel
        open={!!openChapter}
        onOpenChange={(o) => !o && setOpenChapter(null)}
        title={openChapter?.name ?? ""}
        description="Mark each topic as you move through it — this drives revision scheduling and recommendations."
      >
        {openChapter ? <ChapterTopics chapterId={openChapter.id} /> : null}
      </SidePanel>
    </>
  );
}

function ChapterTopics({ chapterId }: { chapterId: string }) {
  const { data: topics = [] } = useTopics(chapterId);
  const { data: progress = [] } = useTopicProgress();
  const upsert = useUpsertTopicProgress();

  return (
    <ul className="space-y-3">
      {topics.map((t) => {
        const p = progress.find((row) => row.topic_id === t.id);
        const status: TopicStatus = p?.status ?? "not_started";
        return (
          <li key={t.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{t.name}</p>
                <p className="text-caption text-muted-foreground">
                  {t.difficulty} · {t.estimated_minutes} min
                </p>
              </div>
              <StatusPill status={status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {TOPIC_STATUSES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={s === status ? "default" : "outline"}
                  onClick={() => upsert.mutate({ topic_id: t.id, status: s })}
                >
                  {s.replace("_", " ")}
                </Button>
              ))}
            </div>
          </li>
        );
      })}
      {topics.length === 0 ? <li className="text-caption text-muted-foreground">No topics in this chapter yet.</li> : null}
    </ul>
  );
}

function NcertChecklist({ subjectId }: { subjectId: string }) {
  const { data: sections = [] } = useNcertSections();
  const { data: read = [] } = useNcertProgress();
  const toggle = useToggleNcertSection();
  const readSet = new Set(read.filter((r) => r.is_read).map((r) => r.ncert_section_id));

  const visible = sections.filter((s) => subjectId === "all" || s.subject_id === subjectId);
  const grouped = useMemo(() => {
    const map = new Map<string, typeof visible>();
    for (const s of visible) {
      const list = map.get(s.chapter_name) ?? [];
      list.push(s);
      map.set(s.chapter_name, list);
    }
    return [...map.entries()];
  }, [visible]);

  return (
    <div className="space-y-4">
      <p className="num text-caption text-muted-foreground">
        {visible.filter((s) => readSet.has(s.id)).length}/{visible.length} NCERT sections read
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {grouped.map(([chapter, rows]) => (
          <section key={chapter} className="surface p-4">
            <h3 className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{chapter}</h3>
            <ul className="mt-3 space-y-2">
              {rows.map((s) => {
                const isRead = readSet.has(s.id);
                return (
                  <li key={s.id} className="flex items-center gap-3">
                    <Checkbox
                      id={`ncert-${s.id}`}
                      checked={isRead}
                      onCheckedChange={() => toggle.mutate({ sectionId: s.id, isRead: !isRead })}
                    />
                    <label htmlFor={`ncert-${s.id}`} className="min-w-0 flex-1 cursor-pointer text-caption">
                      <span className="truncate">{s.page_or_section_label}</span>{" "}
                      <span className="text-muted-foreground">· Class {s.ncert_class}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {grouped.length === 0 ? (
          <p className="text-caption text-muted-foreground">No NCERT sections for this filter.</p>
        ) : null}
      </div>
    </div>
  );
}
