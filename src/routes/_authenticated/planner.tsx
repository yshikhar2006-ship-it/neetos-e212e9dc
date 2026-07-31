import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { addDays, format, parseISO } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useCreateStudyBlocks,
  useDeleteStudyBlock,
  useStudyBlocks,
  useUpdateStudyBlock,
  type BlockStatus,
  type BlockType,
} from "@/hooks/use-study-blocks";
import { usePriorityScores } from "@/hooks/use-priority";
import { useProfile } from "@/hooks/use-profile";
import { formatDuration, minuteToLabel, todayISO } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [
      { title: "Daily Planner — NEET OS" },
      { name: "description", content: "Time-blocked planning built around your real schedule." },
      { property: "og:title", content: "Daily Planner — NEET OS" },
      { property: "og:description", content: "Time-blocked planning built around your real schedule." },
    ],
  }),
  component: PlannerPage,
});

const TYPES: { value: BlockType; label: string }[] = [
  { value: "study", label: "Study" },
  { value: "revision", label: "Revision" },
  { value: "practice", label: "Practice" },
  { value: "mock_test", label: "Mock test" },
  { value: "coaching", label: "Coaching" },
  { value: "break", label: "Break" },
  { value: "custom", label: "Custom" },
];

const TYPE_TONE: Record<BlockType, string> = {
  study: "bg-primary/15 border-primary/40",
  revision: "bg-botany/15 border-botany/40",
  practice: "bg-chemistry/15 border-chemistry/40",
  mock_test: "bg-warning/15 border-warning/40",
  coaching: "bg-zoology/15 border-zoology/40",
  break: "bg-muted border-border",
  custom: "bg-accent border-border",
};

const STATUSES: BlockStatus[] = ["planned", "in_progress", "completed", "skipped"];

function PlannerPage() {
  const [date, setDate] = useState(todayISO());
  const [open, setOpen] = useState(false);
  const { data: blocks = [], isLoading } = useStudyBlocks(date, date);
  const { data: priority = [] } = usePriorityScores(6);
  const { data: profile } = useProfile();
  const create = useCreateStudyBlocks();
  const update = useUpdateStudyBlock();
  const remove = useDeleteStudyBlock();

  const [form, setForm] = useState({ title: "", type: "study" as BlockType, start: "06:00", duration: 60 });

  const planned = useMemo(
    () => blocks.reduce((sum, b) => sum + b.duration_minutes, 0),
    [blocks],
  );
  const targetMinutes = (profile?.daily_study_hours ?? 8) * 60;

  const submit = () => {
    const [h, m] = form.start.split(":").map(Number);
    if (!form.title.trim()) {
      toast.error("Give the block a title");
      return;
    }
    create.mutate(
      [
        {
          title: form.title.trim(),
          type: form.type,
          block_date: date,
          start_minute: h * 60 + m,
          duration_minutes: form.duration,
          topic_id: null,
        },
      ],
      {
        onSuccess: () => {
          toast.success("Block added");
          setOpen(false);
          setForm({ title: "", type: "study", start: "06:00", duration: 60 });
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const autoPlan = () => {
    if (priority.length === 0) {
      toast.error("No recommendations yet — study a few topics first.");
      return;
    }
    let cursor = 6 * 60;
    const rows = priority.slice(0, 5).map((p) => {
      const duration = Math.min(90, Math.max(30, p.topics?.estimated_minutes ?? 45));
      const block = {
        title: p.topics?.name ?? "Priority topic",
        type: "study" as BlockType,
        block_date: date,
        start_minute: cursor,
        duration_minutes: duration,
        topic_id: p.topic_id,
      };
      cursor += duration + 10;
      return block;
    });
    create.mutate(rows, {
      onSuccess: () => toast.success(`${rows.length} priority blocks scheduled`),
      onError: (e) => toast.error(e.message),
    });
  };

  const sorted = [...blocks].sort((a, b) => a.start_minute - b.start_minute);

  return (
    <>
      <PageHeader
        title="Daily Planner"
        description="Time-blocked planning built around your real schedule."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={autoPlan} disabled={create.isPending}>
              <Sparkles className="size-4" aria-hidden /> Auto-plan
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" aria-hidden /> Add block
            </Button>
          </div>
        }
      />

      <div className="surface mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous day"
            onClick={() => setDate(format(addDays(parseISO(date), -1), "yyyy-MM-dd"))}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <span className="num flex items-center gap-2 text-subheading font-semibold">
            <CalendarDays className="size-4 text-primary" aria-hidden />
            {format(parseISO(date), "EEEE, d MMM")}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next day"
            onClick={() => setDate(format(addDays(parseISO(date), 1), "yyyy-MM-dd"))}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDate(todayISO())}>
            Today
          </Button>
        </div>
        <p className="num text-caption text-muted-foreground">
          {formatDuration(planned)} planned · target {formatDuration(targetMinutes)}
        </p>
      </div>

      {isLoading ? null : sorted.length === 0 ? (
        <EmptyState
          title="Nothing scheduled for this day"
          description="Add a block manually, or let Auto-plan lay out your highest-priority topics."
          actionLabel="Add block"
          onAction={() => setOpen(true)}
        />
      ) : (
        <ol className="space-y-2">
          {sorted.map((b) => (
            <li
              key={b.id}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors",
                TYPE_TONE[b.type],
                b.status === "completed" && "opacity-60",
              )}
            >
              <span className="num w-28 shrink-0 text-caption text-muted-foreground">
                {minuteToLabel(b.start_minute)} · {formatDuration(b.duration_minutes)}
              </span>
              <span className={cn("min-w-0 flex-1 truncate font-medium", b.status === "completed" && "line-through")}>
                {b.title}
              </span>
              <Select value={b.status} onValueChange={(v) => update.mutate({ id: b.id, status: v as BlockStatus })}>
                <SelectTrigger className="h-8 w-36" aria-label="Block status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${b.title}`}
                onClick={() => remove.mutate(b.id)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ol>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add study block</DialogTitle>
            <DialogDescription>Blocks appear on your planner, calendar and today's checklist.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="block-title">Title</Label>
              <Input
                id="block-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Thermodynamics — problem set"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="block-start">Start</Label>
                <Input
                  id="block-start"
                  type="time"
                  value={form.start}
                  onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="block-duration">Minutes</Label>
                <Input
                  id="block-duration"
                  type="number"
                  min={10}
                  step={5}
                  value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as BlockType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={create.isPending}>
              Add block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
