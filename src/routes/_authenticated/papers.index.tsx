import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  FileStack,
  ImagePlus,
  Loader2,
  RotateCw,
  Sparkles,
  Star,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/app-shell";
import { EmptyState } from "@/components/shared/state";
import { StatCard } from "@/components/shared/stat-card";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubjects } from "@/hooks/use-curriculum";
import { usePapers, usePaperMutations, useCreatePaper, type PaperStatus } from "@/hooks/use-papers";
import {
  DEFAULT_EDIT,
  DUPLICATE_THRESHOLD,
  hammingDistance,
  isImageFile,
  perceptualHash,
  type PendingPage,
} from "@/lib/papers/image-tools";
import { SCHEME_PRESETS, schemeLabel } from "@/lib/papers/scheme";
import { formatDate } from "@/lib/utils/format";

export const Route = createFileRoute("/_authenticated/papers/")({
  head: () => ({
    meta: [
      { title: "Offline Papers — NEET OS" },
      {
        name: "description",
        content:
          "Photograph any offline coaching test paper and NEET OS reads it, scores it and folds it into your analytics.",
      },
      { property: "og:title", content: "Offline Papers — NEET OS" },
      {
        property: "og:description",
        content: "Turn physical test papers into scored attempts with full topic-level analytics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PapersIndex,
});

const STATUS_STYLE: Record<PaperStatus, { label: string; className: string }> = {
  queued: { label: "Queued", className: "bg-muted text-muted-foreground" },
  processing: { label: "Reading", className: "bg-primary/15 text-primary" },
  needs_review: { label: "Needs review", className: "bg-warning/15 text-warning" },
  ready: { label: "Ready", className: "bg-success/15 text-success" },
  failed: { label: "Failed", className: "bg-destructive/15 text-destructive" },
};

function PapersIndex() {
  const navigate = useNavigate();
  const { data: subjects = [] } = useSubjects();
  const { data: papers = [], isLoading } = usePapers();
  const { update, remove } = usePaperMutations();
  const create = useCreatePaper();
  const fileRef = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState<PendingPage[]>([]);
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<string>("all");
  const [institute, setInstitute] = useState("");
  const [schemeIdx, setSchemeIdx] = useState(0);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return papers.filter(
      (p) =>
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.coaching_institute ?? "").toLowerCase().includes(q),
    );
  }, [papers, query]);

  const readyCount = papers.filter((p) => p.status === "ready").length;
  const reviewCount = papers.filter((p) => p.status === "needs_review").length;

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const images = Array.from(files).filter(isImageFile);
    if (images.length === 0) {
      toast.error("Add page photos or scans (JPG or PNG).");
      return;
    }

    const prepared: PendingPage[] = [];
    for (const file of images) {
      const hash = await perceptualHash(file);
      const duplicate = [...pending, ...prepared].some(
        (p) => p.perceptualHash && hammingDistance(p.perceptualHash, hash) <= DUPLICATE_THRESHOLD,
      );
      if (duplicate) {
        toast.warning(`${file.name} looks like a page you already added — skipped.`);
        continue;
      }
      prepared.push({
        id: crypto.randomUUID(),
        name: file.name,
        previewUrl: URL.createObjectURL(file),
        file,
        edit: { ...DEFAULT_EDIT },
        status: "pending",
        progress: 0,
        perceptualHash: hash,
      });
    }

    setPending((prev) => [...prev, ...prepared]);
    if (!title && prepared.length) setTitle(prepared[0].name.replace(/\.[^.]+$/, ""));
  };

  const rotate = (id: string) =>
    setPending((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, edit: { ...p.edit, rotation: (p.edit.rotation + 90) % 360 } } : p,
      ),
    );

  const toggleEnhance = (id: string) =>
    setPending((prev) =>
      prev.map((p) => (p.id === id ? { ...p, edit: { ...p.edit, enhance: !p.edit.enhance } } : p)),
    );

  const removePage = (id: string) =>
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });

  const submit = () => {
    if (!title.trim()) {
      toast.error("Give this paper a name so you can find it later.");
      return;
    }
    create.mutate(
      {
        title: title.trim(),
        subjectId: subjectId === "all" ? null : subjectId,
        institute: institute.trim() || null,
        folder: null,
        sourceType: "images",
        scheme: SCHEME_PRESETS[schemeIdx].scheme,
        pages: pending,
      },
      {
        onSuccess: (paperId) => {
          pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
          setPending([]);
          setTitle("");
          setInstitute("");
          toast.success("Pages uploaded — reading the paper now.");
          navigate({ to: "/papers/$paperId", params: { paperId } });
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
      },
    );
  };

  const uploading = create.isPending;

  return (
    <div>
      <PageHeader
        title="Offline Papers"
        description="Photograph a coaching test paper — NEET OS reads it, scores it against your marking scheme and folds it into your analytics."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Papers uploaded" value={papers.length} icon={FileStack} />
        <StatCard label="Ready to answer" value={readyCount} icon={Sparkles} accent="success" />
        <StatCard label="Awaiting your review" value={reviewCount} icon={Wand2} accent="warning" />
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-subheading">New paper</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="paper-title">Paper name</Label>
              <Input
                id="paper-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Weekly Test 14 — Physics"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paper-institute">Coaching / source</Label>
              <Input
                id="paper-institute"
                value={institute}
                onChange={(e) => setInstitute(e.target.value)}
                placeholder="Allen, Aakash, school test…"
              />
            </div>
            <div className="space-y-2">
              <Label>Subject (optional)</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Mixed / full syllabus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Mixed / full syllabus</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Marking scheme</Label>
              <Select value={String(schemeIdx)} onValueChange={(v) => setSchemeIdx(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEME_PRESETS.map((p, i) => (
                    <SelectItem key={p.label} value={String(i)}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <ImagePlus className="mr-2 size-4" aria-hidden />
              Add page photos
            </Button>
            <p className="mt-2 text-caption text-muted-foreground">
              Shoot one photo per page in order. Pages are straightened, compressed and de-duplicated
              on your device before upload.
            </p>
          </div>

          {pending.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {pending.map((p, i) => (
                <li key={p.id} className="overflow-hidden rounded-lg border border-border bg-card">
                  <div className="relative aspect-[3/4] bg-muted">
                    <img
                      src={p.previewUrl}
                      alt={`Page ${i + 1} preview`}
                      loading="lazy"
                      className="size-full object-cover transition-transform"
                      style={{
                        transform: `rotate(${p.edit.rotation}deg)`,
                        filter: p.edit.enhance ? "contrast(1.35) brightness(1.05)" : undefined,
                      }}
                    />
                    <span className="absolute left-2 top-2 rounded bg-background/85 px-1.5 py-0.5 text-caption font-semibold">
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 p-1.5">
                    <Button size="icon" variant="ghost" aria-label="Rotate page" onClick={() => rotate(p.id)}>
                      <RotateCw className="size-4" aria-hidden />
                    </Button>
                    <Button
                      size="icon"
                      variant={p.edit.enhance ? "default" : "ghost"}
                      aria-label="Enhance page"
                      onClick={() => toggleEnhance(p.id)}
                    >
                      <Wand2 className="size-4" aria-hidden />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Remove page" onClick={() => removePage(p.id)}>
                      <X className="size-4" aria-hidden />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {uploading ? (
            <div className="space-y-2">
              <Progress
                value={
                  create.progress.total
                    ? Math.round((create.progress.done / create.progress.total) * 100)
                    : 0
                }
              />
              <p className="text-caption text-muted-foreground">
                Uploading page {Math.min(create.progress.done + 1, create.progress.total)} of{" "}
                {create.progress.total}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={submit} disabled={uploading || pending.length === 0}>
              {uploading ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
              Upload &amp; read paper
            </Button>
            <span className="text-caption text-muted-foreground">
              Scoring: {schemeLabel(SCHEME_PRESETS[schemeIdx].scheme)}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-subheading font-semibold">Your papers</h2>
        <SearchInput value={query} onChange={setQuery} placeholder="Search papers…" className="sm:w-72" />
      </div>

      {isLoading ? null : filtered.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title="No papers yet"
          description="Upload your first offline test paper above. Once it's read you can answer it, score it and see topic-level analysis."
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const style = STATUS_STYLE[p.status];
            return (
              <li key={p.id}>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-3 pt-6">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to="/papers/$paperId"
                        params={{ paperId: p.id }}
                        className="min-w-0 text-body font-semibold hover:underline"
                      >
                        {p.title}
                      </Link>
                      <Badge className={style.className} variant="secondary">
                        {style.label}
                      </Badge>
                    </div>
                    <p className="text-caption text-muted-foreground">
                      {p.page_count} page{p.page_count === 1 ? "" : "s"} ·{" "}
                      {schemeLabel(p.marking_scheme)} · {formatDate(p.created_at)}
                      {p.coaching_institute ? ` · ${p.coaching_institute}` : ""}
                    </p>
                    {p.status_detail ? (
                      <p className="text-caption text-muted-foreground">{p.status_detail}</p>
                    ) : null}
                    <div className="mt-auto flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={p.is_favorite ? "Remove from favourites" : "Mark as favourite"}
                        onClick={() =>
                          update.mutate({ id: p.id, patch: { is_favorite: !p.is_favorite } })
                        }
                      >
                        <Star
                          className={`size-4 ${p.is_favorite ? "fill-warning text-warning" : ""}`}
                          aria-hidden
                        />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete paper"
                        onClick={() => {
                          if (confirm(`Delete “${p.title}”? This can't be undone.`)) {
                            remove.mutate(p.id, {
                              onSuccess: () => toast.success("Paper deleted"),
                            });
                          }
                        }}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                      <Button asChild size="sm" variant="outline" className="ml-auto">
                        <Link to="/papers/$paperId" params={{ paperId: p.id }}>
                          Open
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
