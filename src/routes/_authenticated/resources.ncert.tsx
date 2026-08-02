import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/app-shell";
import { StatCard, ProgressBar } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/state";
import { SearchInput } from "@/components/shared/search-input";
import { FilterBar } from "@/components/shared/filter-bar";
import { SubjectBadge } from "@/components/shared/subject-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useNcertProgress, useNcertSections, useToggleNcertSection } from "@/hooks/use-ncert";
import { useSubjects } from "@/hooks/use-curriculum";
import { pct } from "@/lib/utils/format";

export const Route = createFileRoute("/_authenticated/resources/ncert")({
  head: () => ({
    meta: [
      { title: "NCERT Reader — NEET OS" },
      { name: "description", content: "Line-by-line NCERT coverage tracking for every chapter." },
      { property: "og:title", content: "NCERT Reader — NEET OS" },
      { property: "og:description", content: "Line-by-line NCERT coverage tracking for every chapter." },
    ],
  }),
  component: NcertReaderPage,
});

function NcertReaderPage() {
  const { data: sections = [], isLoading } = useNcertSections();
  const { data: progress = [] } = useNcertProgress();
  const { data: subjects = [] } = useSubjects();
  const toggle = useToggleNcertSection();

  const [subjectFilter, setSubjectFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const readSet = useMemo(
    () => new Set(progress.filter((p) => p.is_read).map((p) => p.ncert_section_id)),
    [progress],
  );
  const slugById = useMemo(() => new Map(subjects.map((s) => [s.id, s.slug])), [subjects]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sections.filter(
      (s) =>
        (subjectFilter === "all" || s.subject_id === subjectFilter) &&
        (classFilter === "all" || String(s.ncert_class) === classFilter) &&
        (!unreadOnly || !readSet.has(s.id)) &&
        (!term ||
          s.chapter_name.toLowerCase().includes(term) ||
          s.topic_name.toLowerCase().includes(term) ||
          s.page_or_section_label.toLowerCase().includes(term)),
    );
  }, [sections, subjectFilter, classFilter, search, unreadOnly, readSet]);

  const grouped = useMemo(() => {
    const map = new Map<string, { chapter: string; subjectId: string; rows: typeof filtered }>();
    for (const row of filtered) {
      const entry = map.get(row.chapter_id) ?? { chapter: row.chapter_name, subjectId: row.subject_id, rows: [] };
      entry.rows.push(row);
      map.set(row.chapter_id, entry);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const readCount = sections.filter((s) => readSet.has(s.id)).length;

  return (
    <>
      <PageHeader title="NCERT Reader" description="Tick off NCERT lines as you read them — this feeds your coverage everywhere." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Lines read" value={readCount} suffix={`/ ${sections.length}`} icon={BookOpen} accent="botany" />
        <StatCard label="Coverage" value={pct(readCount, sections.length)} suffix="%" accent="success" />
        <StatCard label="Remaining" value={Math.max(0, sections.length - readCount)} accent="warning" />
      </div>

      <div className="mt-4">
        <ProgressBar value={pct(readCount, sections.length)} label="NCERT coverage" tone="botany" />
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search chapters, topics or sections…" className="sm:max-w-sm" />
        <FilterBar
          label="Subject"
          value={subjectFilter}
          onChange={setSubjectFilter}
          options={[{ value: "all", label: "All subjects" }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]}
        />
        <FilterBar
          label="Class"
          value={classFilter}
          onChange={setClassFilter}
          options={[
            { value: "all", label: "Both classes" },
            { value: "11", label: "Class 11" },
            { value: "12", label: "Class 12" },
          ]}
        />
        <FilterBar
          label="Read state"
          value={unreadOnly ? "unread" : "all"}
          onChange={(v) => setUnreadOnly(v === "unread")}
          options={[
            { value: "all", label: "All lines" },
            { value: "unread", label: "Unread only" },
          ]}
        />
      </div>

      <div className="mt-5 space-y-4">
        {isLoading ? null : grouped.length ? (
          grouped.map(([chapterId, group]) => {
            const done = group.rows.filter((r) => readSet.has(r.id)).length;
            return (
              <section key={chapterId} className="surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <SubjectBadge slug={slugById.get(group.subjectId)} size="sm" />
                    <h2 className="min-w-0 truncate text-body font-semibold">{group.chapter}</h2>
                  </div>
                  <span className="num text-caption text-muted-foreground">
                    {done}/{group.rows.length} read
                  </span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {group.rows.map((row) => {
                    const isRead = readSet.has(row.id);
                    return (
                      <li key={row.id} className="flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-accent/60">
                        <Checkbox
                          id={`ncert-${row.id}`}
                          checked={isRead}
                          onCheckedChange={(checked) => toggle.mutate({ sectionId: row.id, isRead: !!checked })}
                          className="mt-0.5"
                        />
                        <label htmlFor={`ncert-${row.id}`} className="min-w-0 flex-1 cursor-pointer">
                          <span className="block text-body">{row.page_or_section_label}</span>
                          <span className="block text-caption text-muted-foreground">
                            Class {row.ncert_class} · {row.topic_name}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        ) : (
          <EmptyState icon={BookOpen} title="No NCERT lines match" description="Clear a filter or search a different chapter." />
        )}
      </div>
    </>
  );
}
