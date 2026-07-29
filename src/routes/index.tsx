import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  ClipboardList,
  LineChart,
  NotebookPen,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountdownWidget } from "@/components/shared/countdown-widget";
import { SubjectBadge } from "@/components/shared/subject-badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEET OS — Plan, practise and revise for NEET in one system" },
      {
        name: "description",
        content:
          "A pre-mapped NCERT syllabus, NTA-pattern mock tests, spaced repetition, a wrong-question notebook and rank prediction — one connected study OS for NEET aspirants.",
      },
      { property: "og:title", content: "NEET OS — The study operating system for NEET aspirants" },
      {
        property: "og:description",
        content:
          "Plan → Study → Practice → Analyze → Revise. Every action feeds one connected data graph instead of sitting in isolation.",
      },
    ],
  }),
  component: LandingPage,
});

const FEATURES = [
  {
    icon: ClipboardList,
    title: "NTA-accurate mock tests",
    body: "180 questions, 720 marks, +4 / −1 scoring and an OMR palette built to feel like exam day.",
  },
  {
    icon: BrainCircuit,
    title: "Spaced repetition that schedules itself",
    body: "SM-2 scheduling turns every completed topic and logged mistake into a timed revision queue.",
  },
  {
    icon: NotebookPen,
    title: "Wrong Question Notebook",
    body: "Every incorrect or skipped question is logged automatically and tagged by mistake type.",
  },
  {
    icon: LineChart,
    title: "Weightage-driven planning",
    body: "Chapters carry real NEET weightage, so your plan spends time where the marks actually are.",
  },
  {
    icon: Target,
    title: "Rank & cutoff clarity",
    body: "Compare mock scores against historical closing ranks for your category and quota.",
  },
  {
    icon: Sparkles,
    title: "A coach that knows your data",
    body: "The AI Coach reads your recent mocks, weak topics and streak before it answers.",
  },
];

const PLANS = [
  { name: "Free", price: "₹0", tagline: "Everything you need to start", perks: ["Full syllabus tracker", "Daily planner", "3 mock tests / month", "Error log"] },
  { name: "Premium", price: "₹399", tagline: "The full study loop", perks: ["Unlimited mocks", "Spaced repetition", "Full analytics", "PYQ tracker"], featured: true },
  { name: "Premium+", price: "₹699", tagline: "With an always-on coach", perks: ["Everything in Premium", "AI Coach", "Rank predictor", "Priority support"] },
];

function LandingPage() {
  const nextExam = `${new Date().getFullYear() + 1}-05-03`;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-5 sm:px-6">
        <span className="font-display text-subheading font-extrabold">
          NEET<span className="text-primary">OS</span>
        </span>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/auth">Log in</Link>
          </Button>
          <Button asChild>
            <Link to="/auth">Get started</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1280px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-caption text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              Built around the NEET syllabus, not a generic to-do list
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              The operating system for your NEET attempt.
            </h1>
            <p className="mt-5 max-w-xl text-subheading text-muted-foreground">
              Plan, study, practise, analyse and revise in one connected system. The syllabus is already
              mapped — you just show up and work the loop.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/auth">
                  Start free <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth">See how it works</Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <SubjectBadge slug="physics" />
              <SubjectBadge slug="chemistry" />
              <SubjectBadge slug="botany" />
              <SubjectBadge slug="zoology" />
              <span className="num text-caption text-muted-foreground">
                80 chapters · 320 topics pre-mapped
              </span>
            </div>
          </div>
          <div className="lg:col-span-5">
            <CountdownWidget examDate={nextExam} />
            <div className="surface mt-4 p-5">
              <p className="text-caption font-medium text-muted-foreground">Today's loop</p>
              <ul className="mt-3 space-y-3 text-caption">
                {[
                  "3 revision cards due in Genetics",
                  "Mock #12 analysis ready — accuracy up 6%",
                  "Focus pick: Thermodynamics (5.0 weightage, low confidence)",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    <span className="text-foreground">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card/40 py-16">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
            <h2 className="text-heading font-bold">One data graph, six systems</h2>
            <p className="mt-2 max-w-2xl text-caption text-muted-foreground">
              Every topic, mistake, flashcard and note joins back to the same syllabus spine, so your
              analytics are actually about you.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <article key={f.title} className="surface elevate p-5">
                  <f.icon className="size-6 text-primary" strokeWidth={1.5} aria-hidden />
                  <h3 className="mt-4 text-subheading font-semibold">{f.title}</h3>
                  <p className="mt-2 text-caption text-muted-foreground">{f.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6">
          <h2 className="text-heading font-bold">Students on the same loop</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { name: "Ananya, dropper", quote: "The error log alone moved me 40 marks. I stopped repeating the same silly mistakes." },
              { name: "Rohit, class 12", quote: "It fits around coaching hours instead of pretending they don't exist." },
              { name: "Meher, repeater", quote: "Revision finally has a schedule I trust, so I stopped re-reading everything." },
            ].map((t) => (
              <figure key={t.name} className="surface p-5">
                <blockquote className="text-caption text-foreground">“{t.quote}”</blockquote>
                <figcaption className="mt-3 text-caption text-muted-foreground">{t.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-card/40 py-16">
          <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
            <h2 className="text-heading font-bold">Simple pricing</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {PLANS.map((p) => (
                <article
                  key={p.name}
                  className={`surface p-6 ${p.featured ? "border-primary/50 ring-1 ring-primary/30" : ""}`}
                >
                  <h3 className="text-subheading font-semibold">{p.name}</h3>
                  <p className="mt-1 text-caption text-muted-foreground">{p.tagline}</p>
                  <p className="num mt-4 text-heading font-bold">
                    {p.price}
                    <span className="text-caption font-normal text-muted-foreground"> / month</span>
                  </p>
                  <ul className="mt-4 space-y-2">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex items-center gap-2 text-caption">
                        <Check className="size-4 text-success" aria-hidden />
                        {perk}
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-6 w-full" variant={p.featured ? "default" : "outline"} asChild>
                    <Link to="/auth">Choose {p.name}</Link>
                  </Button>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-[1280px] px-4 py-10 text-caption text-muted-foreground sm:px-6">
        NEET OS — built for Class 11, Class 12, droppers and repeaters. Rank estimates are estimates,
        never guarantees.
      </footer>
    </div>
  );
}
