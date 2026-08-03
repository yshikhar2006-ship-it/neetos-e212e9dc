import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarClock, ChevronLeft, ChevronRight, Flag, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/shared/state";
import { FilterBar } from "@/components/shared/filter-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStudyBlocks, useUpdateStudyBlock, type BlockType, type StudyBlock } from "@/hooks/use-study-blocks";
import { useSubjects, useTopicSubjectMap } from "@/hooks/use-curriculum";
import { useProfile } from "@/hooks/use-profile";
import { subjectMeta } from "@/components/shared/subject-badge";
import { formatDuration, minuteToLabel } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — NEET OS" },
      { name: "description", content: "Month, week and agenda views of your study blocks, revisions and mock tests." },
      { property: "og:title", content: "Calendar — NEET OS" },
      { property: "og:description", content: "Month, week and agenda views of your study blocks, revisions and mock tests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarPage,
});

type ViewMode = "month" | "week" | "agenda";

const TYPE_META: Record<BlockType, { label: string; className: string }> = {
  study: { label: "Study", className: "border-primary/40 bg-primary/10 text-foreground" },
  revision: { label: "Revision", className: "border-botany/40 bg-botany/10 text-foreground" },
  practice: { label: "Practice", className: "border-chemistry/40 bg-chemistry/10 text-foreground" },
  mock_test: { label: "Mock test", className: "border-warning/50 bg-warning/10 text-foreground" },
  break: { label: "Break", className: "border-border bg-muted text-muted-foreground" },
  coaching: { label: "Coaching", className: "border-zoology/40 bg-zoology/10 text-foreground" },
  custom: { label: "Custom", className: "border-border bg-card text-foreground" },
};

const TYPE_OPTIONS = [
  { value: "all", label: "All activity" },
  ...(Object.keys(TYPE_META) as BlockType[]).map((t) => ({ value: t, label: TYPE_META[t].label })),
];

function CalendarPage() {
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [typeFilter, setTypeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [dragId, setDragId] = useState<string | null>(null);

  const { data: profile } = useProfile();
  const { data: subjects = [] } = useSubjects();
  const { data: topicMap = [] } = useTopicSubjectMap();
  const updateBlock = useUpdateStudyBlock();

  const range = useMemo(() => {
    if (view === "week") {
      return { from: startOfWeek(cursor, { weekStartsOn: 1 }), to: endOfWeek(cursor, { weekStartsOn: 1 }) };
    }
    if (view === "agenda") {
      return { from: cursor, to: addDays(cursor, 27) };
    }
    return {
      from: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
      to: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
    };
  }, [view, cursor]);

  const fromISO = format(range.from, "yyyy-MM-dd");
  const toISO = format(range.to, "yyyy-MM-dd");
  const { data: blocks = [], isLoading, isError, refetch } = useStudyBlocks(fromISO, toISO);

  const subjectOfTopic = useMemo(() => new Map(topicMap.map((t) => [t.id, t.subject_id])), [topicMap]);
  const subjectSlug = (block: StudyBlock) => {
    const subjectId = block.topic_id ? subjectOfTopic.get(block.topic_id) : undefined;
    return subjectId ? subjects.find((s) => s.id === subjectId)?.slug : undefined;
  };

  const filtered = useMemo(
    () =>
      blocks.filter((b) => {
        if (typeFilter !== "all" && b.type !== typeFilter) return false;
        if (subjectFilter !== "all") {
          const subjectId = b.topic_id ? subjectOfTopic.get(b.topic_id) : undefined;
          if (subjectId !== subjectFilter) return false;
        }
        return true;
      }),
    [blocks, typeFilter, subjectFilter, subjectOfTopic],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, StudyBlock[]>();
    filtered.forEach((b) => {
      const list = map.get(b.block_date) ?? [];
      list.push(b);
      map.set(b.block_date, list);
    });
    for (const list of map.values()) list.sort((a, b) => a.start_minute - b.start_minute);
    return map;
  }, [filtered]);

  const move = (blockId: string, targetDate: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block || block.block_date === targetDate) return;
    updateBlock.mutate(
      { id: blockId, block_date: targetDate },
      {
        onSuccess: () => toast.success(`Moved “${block.title}” to ${format(parseISO(targetDate), "d MMM")}`),
        onError: () => toast.error("Could not move that block."),
      },
    );
  };

  const step = (dir: 1 | -1) => {
    setCursor((c) => (view === "week" ? addWeeks(c, dir) : view === "agenda" ? addDays(c, dir * 28) : addMonths(c, dir)));
  };

  const examDate = profile?.exam_date ?? null;
  const label =
    view === "week"
      ? `${format(range.from, "d MMM")} – ${format(range.to, "d MMM yyyy")}`
      : view === "agenda"
        ? `Next 4 weeks from ${format(range.from, "d MMM")}`
        : format(cursor, "MMMM yyyy");

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Month, week and agenda views of your study plan. Drag any block to reschedule it."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" aria-label="Previous period" onClick={() => step(-1)}>
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="Next period" onClick={() => step(1)}>
              <ChevronRight className="size-4" aria-hidden />
            </Button>
            <Button size="sm" asChild>
              <Link to="/planner">Plan a block</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-4 space-y-3">
        <FilterBar label="Filter by activity" options={TYPE_OPTIONS} value={typeFilter} onChange={setTypeFilter} />
        <FilterBar
          label="Filter by subject"
          options={[{ value: "all", label: "All subjects" }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]}
          value={subjectFilter}
          onChange={setSubjectFilter}
        />
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
          </TabsList>
          <p className="text-caption font-medium text-muted-foreground">{label}</p>
        </div>

        {isError ? <ErrorState onRetry={() => void refetch()} /> : null}
        {isLoading ? <LoadingSkeleton rows={3} height="h-28" /> : null}

        <TabsContent value="month">
          <MonthGrid
            range={range}
            cursor={cursor}
            byDay={byDay}
            examDate={examDate}
            subjectSlug={subjectSlug}
            dragId={dragId}
            onDragStart={setDragId}
            onDragEnd={() => setDragId(null)}
            onDrop={move}
          />
        </TabsContent>

        <TabsContent value="week">
          <WeekGrid
            range={range}
            byDay={byDay}
            examDate={examDate}
            subjectSlug={subjectSlug}
            dragId={dragId}
            onDragStart={setDragId}
            onDragEnd={() => setDragId(null)}
            onDrop={move}
          />
        </TabsContent>

        <TabsContent value="agenda">
          <AgendaList range={range} byDay={byDay} examDate={examDate} subjectSlug={subjectSlug} />
        </TabsContent>
      </Tabs>
    </>
  );
}

interface ViewProps {
  range: { from: Date; to: Date };
  byDay: Map<string, StudyBlock[]>;
  examDate: string | null;
  subjectSlug: (block: StudyBlock) => string | undefined;
  dragId?: string | null;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  onDrop?: (id: string, date: string) => void;
}

function BlockChip({
  block,
  slug,
  draggable,
  onDragStart,
  onDragEnd,
  compact,
}: {
  block: StudyBlock;
  slug?: string;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  compact?: boolean;
}) {
  const meta = TYPE_META[block.type];
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", block.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-caption",
        meta.className,
        block.status === "completed" && "opacity-70 line-through",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
      title={`${block.title} · ${meta.label} · ${minuteToLabel(block.start_minute)} · ${formatDuration(block.duration_minutes)}`}
    >
      {draggable ? (
        <GripVertical className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      ) : null}
      {slug ? <span className={cn("size-2 shrink-0 rounded-full", subjectMeta(slug).dot)} aria-hidden /> : null}
      <span className="truncate">{compact ? block.title : `${minuteToLabel(block.start_minute)} ${block.title}`}</span>
    </div>
  );
}

function ExamChip() {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-1.5 py-1 text-caption font-medium text-foreground">
      <Flag className="size-3" aria-hidden />
      NEET exam day
    </div>
  );
}

function DayCell({
  day,
  blocks,
  examDate,
  subjectSlug,
  dimmed,
  onDrop,
  onDragStart,
  onDragEnd,
  minHeight,
}: {
  day: Date;
  blocks: StudyBlock[];
  examDate: string | null;
  subjectSlug: (b: StudyBlock) => string | undefined;
  dimmed?: boolean;
  onDrop?: (id: string, date: string) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  minHeight: string;
}) {
  const iso = format(day, "yyyy-MM-dd");
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDrop?.(id, iso);
      }}
      className={cn(
        "flex flex-col gap-1 rounded-lg border border-border bg-card p-1.5 transition-colors duration-150",
        minHeight,
        dimmed && "opacity-50",
        isToday(day) && "border-primary",
        over && "border-primary bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("text-caption font-semibold", isToday(day) ? "text-primary" : "text-muted-foreground")}>
          {format(day, "d")}
        </span>
        {blocks.length > 2 ? <span className="text-caption text-muted-foreground">{blocks.length}</span> : null}
      </div>
      <div className="flex min-h-0 flex-col gap-1 overflow-hidden">
        {examDate && isSameDay(day, parseISO(examDate)) ? <ExamChip /> : null}
        {blocks.map((b) => (
          <BlockChip
            key={b.id}
            block={b}
            slug={subjectSlug(b)}
            compact
            draggable
            onDragStart={() => onDragStart?.(b.id)}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
}

function MonthGrid({ range, cursor, byDay, examDate, subjectSlug, onDrop, onDragStart, onDragEnd }: ViewProps & { cursor: Date }) {
  const days = eachDayOfInterval({ start: range.from, end: range.to });
  return (
    <Card className="p-3">
      <div className="grid grid-cols-7 gap-1 pb-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <span key={d} className="text-center text-caption font-medium text-muted-foreground">
            {d.slice(0, 3)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <DayCell
            key={day.toISOString()}
            day={day}
            blocks={byDay.get(format(day, "yyyy-MM-dd")) ?? []}
            examDate={examDate}
            subjectSlug={subjectSlug}
            dimmed={!isSameMonth(day, cursor)}
            onDrop={onDrop}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            minHeight="min-h-20 sm:min-h-28"
          />
        ))}
      </div>
    </Card>
  );
}

function WeekGrid({ range, byDay, examDate, subjectSlug, onDrop, onDragStart, onDragEnd }: ViewProps) {
  const days = eachDayOfInterval({ start: range.from, end: range.to });
  return (
    <Card className="p-3">
      <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((day) => (
          <div key={day.toISOString()} className="min-w-0">
            <p className="mb-1 text-caption font-medium text-muted-foreground">{format(day, "EEE d MMM")}</p>
            <DayCell
              day={day}
              blocks={byDay.get(format(day, "yyyy-MM-dd")) ?? []}
              examDate={examDate}
              subjectSlug={subjectSlug}
              onDrop={onDrop}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              minHeight="min-h-40"
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

function AgendaList({ range, byDay, examDate, subjectSlug }: ViewProps) {
  const days = eachDayOfInterval({ start: range.from, end: range.to }).filter(
    (d) => (byDay.get(format(d, "yyyy-MM-dd")) ?? []).length > 0 || (examDate && isSameDay(d, parseISO(examDate))),
  );

  if (days.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nothing scheduled in this window"
        description="Add study blocks from the Planner and they will appear here across month, week and agenda views."
      />
    );
  }

  return (
    <div className="space-y-3">
      {days.map((day) => {
        const blocks = byDay.get(format(day, "yyyy-MM-dd")) ?? [];
        const total = blocks.reduce((s, b) => s + b.duration_minutes, 0);
        return (
          <Card key={day.toISOString()} className="p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className={cn("text-body font-semibold", isToday(day) ? "text-primary" : "text-foreground")}>
                {format(day, "EEEE, d MMM yyyy")}
              </h3>
              <span className="text-caption text-muted-foreground">{formatDuration(total)} planned</span>
            </div>
            <div className="space-y-1.5">
              {examDate && isSameDay(day, parseISO(examDate)) ? <ExamChip /> : null}
              {blocks.map((b) => (
                <BlockChip key={b.id} block={b} slug={subjectSlug(b)} />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
