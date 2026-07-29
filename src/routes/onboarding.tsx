import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set up your attempt — NEET OS" },
      { name: "description", content: "Tell NEET OS your target, study hours and weak subjects to generate your plan." },
      { property: "og:title", content: "Set up your attempt — NEET OS" },
      { property: "og:description", content: "A two-minute setup that shapes your entire NEET study plan." },
    ],
  }),
  component: Onboarding,
});

const CLASS_LEVELS = [
  { value: "class_11", label: "Class 11" },
  { value: "class_12", label: "Class 12" },
  { value: "dropper", label: "Dropper" },
  { value: "repeater", label: "Repeater" },
];
const SUBJECTS = ["Physics", "Chemistry", "Botany", "Zoology"];
const STYLES = [
  { value: "visual", label: "Visual", hint: "Diagrams, charts, mind maps" },
  { value: "practice", label: "Practice-first", hint: "Learn by solving questions" },
  { value: "reading", label: "Reading", hint: "NCERT line-by-line" },
  { value: "mixed", label: "Mixed", hint: "A bit of everything" },
];
const STEPS = ["Basics", "Target", "Time", "Strengths", "Style"];

function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    class_level: "dropper",
    target_exam_date: `${new Date().getFullYear() + 1}-05-03`,
    target_score: 650,
    target_college: "",
    daily_hours: 8,
    coaching: false,
    weak_subjects: [] as string[],
    strong_subjects: [] as string[],
    study_style: "mixed",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggle = (list: "weak_subjects" | "strong_subjects", subject: string) =>
    setForm((f) => ({
      ...f,
      [list]: f[list].includes(subject) ? f[list].filter((s) => s !== subject) : [...f[list], subject],
    }));

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name || null,
          attempt_type: form.class_level as "class_11" | "class_12" | "dropper" | "repeater",
          exam_date: form.target_exam_date,
          target_exam_year: Number(form.target_exam_date.slice(0, 4)),
          target_score: form.target_score,
          target_college: form.target_college || null,
          daily_study_hours: form.daily_hours,
          coaching_enrolled: form.coaching,
          weak_subjects: form.weak_subjects,
          strong_subjects: form.strong_subjects,
          study_style: form.study_style,
          onboarding_completed: true,

        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("You're set up", { description: "Your dashboard is ready." });
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error("Couldn't save your setup", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-12">
      <p className="num text-caption text-muted-foreground">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>
      <Progress value={((step + 1) / STEPS.length) * 100} className="mt-3" />

      <div className="surface mt-6 p-6">
        {step === 0 ? (
          <div className="space-y-5">
            <h1 className="text-heading font-bold">Let's start with the basics</h1>
            <div className="space-y-1.5">
              <Label htmlFor="fullname">What should we call you?</Label>
              <Input
                id="fullname"
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label>Where are you right now?</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {CLASS_LEVELS.map((c) => (
                  <ChoiceChip
                    key={c.value}
                    active={form.class_level === c.value}
                    onClick={() => set("class_level", c.value)}
                    label={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <h1 className="text-heading font-bold">What are you aiming at?</h1>
            <div className="space-y-1.5">
              <Label htmlFor="examdate">Target exam date</Label>
              <Input
                id="examdate"
                type="date"
                value={form.target_exam_date}
                onChange={(e) => set("target_exam_date", e.target.value)}
              />
            </div>
            <div>
              <Label>
                Target score: <span className="num font-semibold text-foreground">{form.target_score}</span> / 720
              </Label>
              <Slider
                className="mt-3"
                min={300}
                max={720}
                step={5}
                value={[form.target_score]}
                onValueChange={([v]) => set("target_score", v)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="college">Dream college (optional)</Label>
              <Input
                id="college"
                value={form.target_college}
                onChange={(e) => set("target_college", e.target.value)}
                placeholder="AIIMS Delhi"
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <h1 className="text-heading font-bold">How much time do you actually have?</h1>
            <div>
              <Label>
                Daily study hours:{" "}
                <span className="num font-semibold text-foreground">{form.daily_hours}h</span>
              </Label>
              <Slider
                className="mt-3"
                min={2}
                max={16}
                step={1}
                value={[form.daily_hours]}
                onValueChange={([v]) => set("daily_hours", v)}
              />
            </div>
            <div>
              <Label>Are you enrolled in coaching?</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <ChoiceChip active={form.coaching} onClick={() => set("coaching", true)} label="Yes" />
                <ChoiceChip active={!form.coaching} onClick={() => set("coaching", false)} label="Self-study" />
              </div>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <h1 className="text-heading font-bold">Where do you stand?</h1>
            <div>
              <Label>Subjects you find hard</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {SUBJECTS.map((s) => (
                  <ChoiceChip
                    key={s}
                    active={form.weak_subjects.includes(s)}
                    onClick={() => toggle("weak_subjects", s)}
                    label={s}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Subjects you're confident in</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {SUBJECTS.map((s) => (
                  <ChoiceChip
                    key={s}
                    active={form.strong_subjects.includes(s)}
                    onClick={() => toggle("strong_subjects", s)}
                    label={s}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-5">
            <h1 className="text-heading font-bold">How do you learn best?</h1>
            <div className="grid gap-2 sm:grid-cols-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set("study_style", s.value)}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    form.study_style === s.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    {form.study_style === s.value ? <Check className="size-4 text-primary" aria-hidden /> : null}
                    {s.label}
                  </span>
                  <span className="mt-1 block text-caption text-muted-foreground">{s.hint}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || busy}
          >
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>
              Continue <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button onClick={finish} disabled={busy}>
              Build my plan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-4 py-2.5 text-caption font-medium transition-colors ${
        active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent"
      }`}
    >
      {label}
    </button>
  );
}
