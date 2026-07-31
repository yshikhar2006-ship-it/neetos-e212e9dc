# NEET Navigator

IMPORTANT:

Build this as a production-ready application.

Do NOT simplify the requirements.

Do NOT skip features because they are complex.

If generation must happen in multiple iterations, create the full architecture first and continue building until every section is implemented.

Use the existing design system consistently across the entire application.

Do not redesign the product vision.


---

*Start of prompt.*

# NEET OS — Master Implementation Prompt for Lovable

*This is a single, comprehensive build prompt. Paste it into a new Lovable project to scaffold the complete application, then build screen-by-screen using the milestone sequence in Section 14.*

---

## 1. Project Overview & Product Vision

Build **NEET OS** — a premium, production-ready web application that serves as the ultimate productivity and study-management operating system for NEET (National Eligibility cum Entrance Test) aspirants in India. This is not a generic to-do list: it is a purpose-built platform combining Notion-grade flexibility, a coach's domain precision (a pre-mapped NCERT/NEET syllabus, NTA-accurate mock tests, weightage-driven planning, rank prediction), and the behavioural science of a habit product (spaced repetition, streaks, burnout-aware design).

Design and build quality must be comparable to **Linear, Notion, Stripe, and Apple's own products** — calm, precise, fast, and detail-obsessed. Treat every screen as if it will be scrutinized by a senior design team at any of those companies.

**Target users:** Class 11/12 students preparing alongside school, "droppers" on a full-time gap-year attempt, and repeaters refining weak areas after a prior attempt. All three need the same system, used with different intensity and urgency.

**Core product loop:** Plan → Study → Practice → Analyze → Revise → Repeat, with every action feeding one connected data graph rather than sitting in isolation. The single architectural idea to hold onto throughout this build: **the `topics` table is the hub everything else references** — progress, questions, flashcards, notes, and mistakes all join back through a topic rather than duplicating curriculum data.

---

## 2. Technology Stack

Build on Lovable's native stack — do not introduce a separate backend server or a different frontend framework.

- **Frontend:** React + TypeScript, scaffolded with Vite. Style exclusively with Tailwind CSS using shadcn/ui as the base component primitives (Button, Input, Select, Dialog, Tabs, Toast, etc.) — extend and theme these rather than building raw primitives from scratch. Use React Router for all client-side routing, with real routed URLs for every page (not modal-only states), so links are shareable and the back button always works.

- **Backend:** Supabase (via Lovable Cloud) for everything server-side — PostgreSQL as the database, Supabase Auth for identity, Supabase Storage for file uploads (avatars, diagram-based flashcards, exported PDFs), and Supabase Edge Functions (Deno) for logic that must run server-side — the study-plan generator, the spaced-repetition scheduler, rank-prediction calculations, and AI Coach orchestration all belong here.

- **API structure:** there is no separate REST/GraphQL API layer. The client talks directly to Supabase via its client SDK, with Row Level Security (RLS) policies enforcing per-user access at the database level. The only "custom API" surface is the Edge Functions above, invoked directly from the client for logic that can't safely live there.

- **Realtime:** use Supabase Realtime subscriptions for anything that should update live without a refresh — the live exam timer, streak/celebration updates, and (future) shared study-room presence.

- **Payments:** Stripe, connected natively, for the Free → Premium → Premium+ subscription tiers.

- **AI:** route AI Coach conversations, weightage-based "Focus Pick" suggestions, and rank-prediction narrative through an Edge Function that calls a large language model API — never expose model API keys to the client.

- **State management:** server state (anything persisted) goes through Supabase queries wrapped in React Query (TanStack Query) for caching, optimistic updates, and background refetching. Local/UI-only state (open modals, active tab, draft form values) uses React's built-in state — do not reach for a global state library beyond that; the data model is the source of truth, not client state.

- **Deployment:** Lovable's managed hosting with a custom domain; keep the codebase synced to GitHub from day one so it stays portable and reviewable outside Lovable. Store the LLM provider key and Stripe secret key as server-side environment secrets used only inside Edge Functions — never in client-bundled code. Use Supabase's built-in staging/production project separation so curriculum-data and schema changes can be verified before they reach real students.

---

## 3. Folder & File Structure

Organize the codebase by **feature domain first, component type second** — not one giant `/components` folder. This keeps each system in Section 10 self-contained and easy to hand off.

```

src/

├── app/                      # Route definitions, layout shells, providers

├── components/

│   ├── ui/                   # shadcn/ui primitives, themed (buttons, inputs, cards, dialogs)

│   └── shared/                # Cross-feature components: CommandPalette, CountdownWidget,

│                               # SubjectBadge, StatusPill, EmptyState, LoadingSkeleton

├── features/

│   ├── dashboard/

│   ├── planner/                # Daily Planner, Today's Tasks, Calendar, Revision Planner

│   ├── syllabus/                # Subjects, Chapter Tracker, Topic Detail

│   ├── practice/                 # Mock Setup/Live/Results, Chapter-wise, PYQ Tracker, Custom Builder

│   ├── analytics/                 # Analytics Dashboard, Mock Test Analysis

│   ├── error-log/                  # Wrong Question Notebook

│   ├── revision/                    # Flashcards, Formula Sheets, Mnemonics, One-Shot Mode

│   ├── resources/                    # Notes Vault, NCERT Reader, Bookmarks, Doubt Journal

│   ├── focus/                         # Pomodoro Timer, Habit Tracker

│   ├── goals/                          # Target Setup, Cutoff Explorer

│   ├── ai-coach/

│   ├── settings/

│   └── profile/

├── lib/

│   ├── supabase/                       # Client init, typed query helpers per entity

│   └── utils/                           # Formatting, date/spacing helpers, spaced-repetition scheduler

├── hooks/                                # Cross-feature hooks: useAuth, useSubscriptionTier,

│                                         # useCommandPalette, useKeyboardShortcut

├── styles/                               # Tailwind config, design tokens (Section 7)

└── types/                                # Shared TypeScript types generated from the DB schema

```

Each `features/*` folder owns its own components, hooks, and page-level composition — a feature should be understandable by opening one folder, not by hunting across the codebase.

---

## 4. Database Schema & Relationships

Implement this schema in Supabase Postgres, with **Row Level Security enabled on every table** so a user can only read/write their own rows. The curriculum and reference tables are the exception — public read, admin-only write.

**Identity:** `users` (attempt_type, target_exam_year, category, coaching_institute, subscription_tier), `subscriptions` (plan_tier, status, Stripe references).

**Curriculum spine** *(admin-writable, publicly readable, seed at project setup from a fixed NEET/NCERT dataset)*: `subjects → units → chapters → topics`, each level carrying its own metadata (weightage_score on chapters; ncert_reference and difficulty on topics). Add a `syllabus_year` field now (see Section 12) even though only one year is seeded at launch.

**Progress:** `user_topic_progress` (status, confidence_rating, last_studied_at, next_revision_due_at) — the many-to-many join between users and topics.

**Planning:** `study_plans → study_blocks` (type, start_time, duration, status, optional topic_id).

**Content & testing:** `questions`, `tests`, `test_questions`, `test_attempts`, `test_answers`.

**Analytics & memory:** `error_log`, `flashcards`, `flashcard_reviews` (SM-2 state: ease_factor, interval_days, next_review_at), `rank_predictions`.

**Resources:** `notes` (content stored as structured JSON blocks, not raw HTML/Markdown strings), `bookmarks`, `doubt_journal`.

**Engagement:** `habit_logs`, `achievements`, `notifications`.

**Reference:** `cutoff_data` (admin-maintained, drives the Rank Predictor and Cutoff Explorer).

Seeding the full curriculum tree at project setup is what makes onboarding instant (Section 9.2) instead of requiring the student to build their own structure — this is the product's central differentiator versus a generic planner, so treat the seed data as a launch-blocking requirement, not an afterthought.

---

## 5. Authentication System & User Roles

Use Supabase Auth with three sign-in methods surfaced together on the Sign Up / Log In screen — email/password, Google OAuth, and phone OTP — with none hidden behind another.

**Roles for v1:**

- **Student** — the only role most users will ever have; full access to their own data everywhere, enforced entirely through RLS policies keyed on `auth.uid()`.

- **Admin** (internal, not user-facing) — access to a separate, unlisted content-operations area for maintaining the curriculum tree, PYQ bank, and cutoff data. Gate this entirely behind a role check and a separate route; never expose it in the main app's navigation.

**Design for, but do not fully build in v1:** a **Parent/Mentor** role — a read-only, invited view into one student's progress. Add a nullable `parent_links` table (student_user_id, parent_user_id, invited_at, accepted_at) and an `is_admin` boolean on `users` now, even though the UI for either ships later — this avoids a schema migration when Section 14's Phase-3 milestone arrives.

**New-user flow:** Sign Up → Onboarding Wizard (writes attempt_type, target_exam_year, category, coaching_institute to `users`, and bulk-seeds `user_topic_progress` rows at `not_started` for the full curriculum) → Dashboard. Protect every route except the landing page and auth screens behind an authenticated-session check, and redirect any user with incomplete onboarding straight back into the wizard rather than into a half-populated Dashboard.

---

## 6. Navigation Structure & Information Architecture

Implement navigation with clear visual hierarchy, not eleven undifferentiated sidebar rows:

- **Desktop sidebar** (240px expanded / 64px icon-only, collapsible): Dashboard sits alone at the top with the exam countdown directly beneath it. Below a divider, group Planner, Syllabus, Practice, Analytics, Error Log, and Revision Hub as the primary "study loop" cluster. Below a second divider, group Resources, AI Coach, Focus Tools, and Goals as a lighter secondary cluster. Pin Settings and Help at the very bottom, always visible.

- **Top bar:** a command palette trigger (⌘/Ctrl+K) implementing true global fuzzy search across topics, notes, tests, and settings, plus quick actions ("Start a mock test," "Log today's hours"); a quick-add (+) button; a notification bell with deep-linking; a profile menu separating Settings and User Profile as distinct entries, plus theme toggle and log out.

- **Mobile:** a bottom tab bar — Home, Planner, Practice, Revise, More — where "More" opens a sheet containing everything else.

- **Deep-linking:** every notification, every analytics drill-down, and every AI Coach citation must route to the exact page and state involved (e.g. `/syllabus/biology/genetics/mendel-laws`), never just a section root.

---

## 7. Design System

Implement as Tailwind theme tokens / CSS variables — never hard-code a colour, spacing value, or font anywhere in component code.

**Colour tokens** (light / dark): Background `#FAFAF9` / `#0C0E14` · Surface `#FFFFFF` / `#151824` · Text primary `#16181D` / `#EDEEF2` · Text secondary `#6B7280` / `#9096A8` · Brand `#5B5BF5` / `#7C7CFF` (reserved strictly for primary actions and active states) · Physics `#3B82F6` · Chemistry `#F59E0B` · Botany `#10B981` · Zoology `#F43F5E` (accents only — dots, borders, tags, chart series, never large fills) · Success `#22C55E` · Warning `#FACC15` · Danger `#EF4444` · Neutral `#9CA3AF`.

Default to **dark mode** as the initial theme, with a light/system toggle in Settings — most usage happens at night, so design and QA dark mode first, not as an inverted afterthought.

**Typography:** Inter for all UI and body text · Cabinet Grotesk (General Sans as fallback) for display/marketing headings only · IBM Plex Mono for every number on screen — scores, ranks, timers, dates, question counts, streak counts, with no exceptions, so numeric data reads as data everywhere. Type scale: Caption 12px, Body 14–16px, Subheading 18–20px, Heading 24–32px, Display 40–56px.

**Spacing & grid:** 4px base unit (4/8/12/16/24/32/48/64/96 scale). 12-column grid, 240px/64px sidebar, 24px desktop gutters (16px tablet, 12px mobile), 1280px content max-width (1440px large desktop). Build each screen's exact column-spans per Section 9.

**Iconography:** one line-icon set throughout (Lucide), 20px inline / 24px nav / 32px feature moments, 1.5px stroke, always paired with a text label in navigation — never icon-only nav.

**Radii & elevation:** 8px radius on inputs and small controls, 12px on cards. Two shadow levels only — resting (barely visible) and hover/raised (soft, 2px lift) — do not introduce a third.

---

## 8. Core Reusable Components

Build these once, in `components/ui` and `components/shared`, and compose every screen from them — never build a one-off variant per screen.

- **Buttons:** Primary / Secondary / Ghost / Destructive / Icon, in Small (32px) / Medium (40px) / Large (48px). Destructive actions always route through a confirmation dialog, never delete silently.

- **Inputs:** Text field, Select, Date Picker, Slider (the 1–5 confidence rating), Toggle, Checkbox, Radio group — 8px radius, 1px border, brand-colour focus ring.

- **CommandPalette:** global, ⌘/Ctrl+K, fuzzy search plus quick actions, fully keyboard-operable end to end.

- **SearchInput:** the local, in-page search pattern — icon-prefixed field with debounced live filtering, distinct from the global palette. Used on Notes Vault, PYQ Tracker, Chapter Tracker (bound to `/`), and Wrong Question Notebook.

- **StatCard, ProgressRing, ProgressBar:** the shared primitives behind almost every widget in the app.

- **SubjectBadge / StatusPill:** colour + icon + label together, always — the component that enforces "never colour alone" everywhere it's used.

- **DataTable:** sortable headers, hover-revealed row actions, sticky header, and a required accessible fallback for any chart it accompanies.

- **FilterBar:** the pill-chip filter pattern shared by Chapter Tracker, Wrong Question Notebook, PYQ Tracker, and Analytics.

- **EmptyState, LoadingSkeleton, ErrorState, SuccessToast/Celebration:** implemented once, reused everywhere — no screen invents its own version of any of these four.

- **Chart components:** LineChart, HeatmapGrid, QuadrantScatter, DonutChart — pre-wired to the subject/semantic colour tokens so no chart owns its own colour logic.

- **FlashcardFlip, PomodoroTimer, CountdownWidget:** the signature, product-specific interactive components, each self-contained enough to drop into the Dashboard, a dedicated page, or a modal.

---

## 9. Every Screen

### 9.1 Sixteen Flagship Screens — Build to Full Detail

Build these sixteen to the full richness described below, not just the summary — this is where the product's premium feel is won or lost:

1. **Dashboard** — default landing page. 12-col bento grid: hero countdown + streak, four stat cards (Syllabus %, Last Mock + trend, Streak, Revision Due), a main "Today's Plan" column with inline Pomodoro launch, a right rail (Revision Due, AI "Focus Pick," Error Log highlight), a performance trend strip, and a quick-actions footer. Widgets are user-reorderable and hideable. Day-0 state replaces stat cards with an onboarding checklist.

2. **Daily Planner** — desktop-first draggable timeline (6 AM–midnight) with a topic backlog rail; drag-and-drop scheduling with real-time overlap warnings. On mobile this route redirects to Today's Tasks.

3. **Today's Tasks** — mobile-first grouped checklist (Study Blocks / Revision Due / Quick Wins) with swipe-to-defer and swipe-to-complete; the on-the-go counterpart to the Daily Planner, also embeddable as a Dashboard widget on desktop.

4. **Calendar** — Month/Week/Agenda toggle, subject-colour density dots per day, mock-test badges, a distinctly hatched recurring "coaching hours" block.

5. **Subjects** — four large cards (Physics/Chemistry/Botany/Zoology), each with a completion ring and a "weakest chapter" callout linking straight into practice.

6. **Chapter Tracker** — list+detail split (chapter list ↔ topic list); each topic row carries a status dropdown, a 1–5 confidence slider, and quick-links to that topic's notes/flashcards/PYQs.

7. **Revision Planner** — spaced-repetition queue: "Due Today" plus a 7-day "Coming Up" list, each item showing a forgetting-curve sparkline and a one-tap "Start Review Session."

8. **Wrong Question Notebook** — filterable mistake log (table + detail panel) tagged by mistake type, framed positively, with a one-tap "convert to flashcard" action.

9. **Mock Test Analysis** — post-test breakdown: score hero number, subject-wise bars, time distribution, and a filterable question-by-question review list, with a deliberate "Calculating your results…" beat before the score animates in.

10. **Analytics Dashboard** — tabbed umbrella (Overview / Heatmap / Rank Predictor / Speed vs Accuracy) so filters and date range persist across views; every chart needs an accessible data-table fallback.

11. **Habit Tracker** — GitHub-style contribution heatmap of study hours plus streak stats and a sleep/mood mini-log.

12. **PYQ Tracker** — filterable previous-year-question browser with an inline solve panel and a per-year coverage progress bar.

13. **Notes Vault** — list+detail block-based note editor with Notion-style slash commands and a "linked topic" block type rendering a live syllabus mini-card.

14. **AI Coach** — chat interface with a context rail showing what student data it's referencing, suggested-prompt chips, and inline citations back into the app.

15. **Settings** — tabbed template (Profile / Subscription / Preferences / Notifications / Data Export / Help) with instant-apply toggles and inline save confirmation.

16. **User Profile** — identity and achievement showcase: header card, stat row, and a badge gallery where locked badges show their unlock criteria rather than hiding.

### 9.2 Supporting Screens — Build to Standard Detail

Build the remaining screens with the same design system and component library, at a lighter but still complete level of polish:

**Marketing & Auth:** Landing Page (hero with a live countdown demo, feature highlights, testimonials, pricing, CTA) · Sign Up/Log In · Onboarding Wizard (5-step: journey stage → exam date → category/target → coaching institute → confidence self-rating, ending in a 3-screen product tour) · Diagnostic Test (short adaptive quiz seeding initial topic status).

**Practice:** Practice Hub (entry cards per practice mode) · Mock Test Setup (NTA-pattern instructions, schedule-or-start-now) · Mock Test Live Interface (180-question OMR-style palette, subject navigator, timer, mark-for-review — build this visually close to the real NTA screen, since familiarity here reduces exam-day anxiety) · Chapter-wise Practice · Custom Test Builder · Test History.

**Revision Hub:** Flashcard Decks · Flashcard Review Session (swipe-to-rate) · Formula Sheets (searchable, printable) · Mnemonics Library · One-Shot Revision Mode (auto-generated slide-style chapter flip-through).

**Resources:** NCERT Reader (embedded viewer, highlight/annotation, line-tracking) · Bookmarks · Doubt Journal.

**Goals:** Target Setup (college/rank/category/quota) · Cutoff Explorer (filterable historical cutoff table).

**System:** Notifications Center · Help & Support.

**Community** (build the route, flag as Phase 3 in-app copy): Study Rooms.

---

## 10. Feature Systems — Implementation Notes for the Non-Obvious Logic

These systems are what separate NEET OS from a generic to-do app. Build the underlying logic, not just the UI shell:

- **Task/Study management:** every `study_block` optionally links to a `topic_id`; completing a block updates `user_topic_progress.last_studied_at` and contributes to that day's `habit_logs.study_hours` automatically — the student should never log the same fact twice.

- **Chapter/topic tracking:** a status change on `user_topic_progress` recomputes the parent chapter's and subject's completion percentage optimistically on the client and persists server-side — Subjects and Chapter Tracker must never feel like they're "catching up."

- **Revision / spaced repetition:** implement SM-2 scheduling on `flashcard_reviews` (ease factor adjusts per review rating; interval grows on success, resets on failure) inside an Edge Function, so the algorithm lives in one place, never duplicated client-side.

- **Habit tracker:** `habit_logs` auto-populates from Pomodoro sessions and completed study blocks by default, remaining manually editable — never force manual logging as the only path.

- **Mock test analysis & scoring:** score using the exact current NTA scheme (+4 correct / −1 incorrect / 0 unattempted, out of 720 across 180 questions); compute subject-wise and time-per-question breakdowns server-side in an Edge Function at submission time so results can't be tampered with client-side.

- **Wrong Question Notebook:** auto-insert an `error_log` row for every incorrect or skipped `test_answer` at submission time — automatic, never dependent on the student remembering.

- **Rank/percentile prediction:** an Edge Function compares recent `test_attempts` against `cutoff_data` for the student's declared category and quota, returning a percentile estimate and rank range — always label this as an estimate, never a guarantee.

- **Notes Vault:** persist note content as structured JSON blocks, not raw HTML/Markdown strings, so a "linked topic" block can render a live mini-card instead of a dead link.

- **AI Coach:** assemble every model request server-side in an Edge Function that pulls the relevant slice of the student's own data (recent mocks, weak topics, current streak) into context before calling the model — its value is that it already knows the student, not that the student has to re-explain their situation each time.

- **Notifications:** generate notification rows from real state changes (a revision becoming due, a plan falling behind, a mock being scheduled) via database triggers or scheduled Edge Functions, not a hardcoded schedule — they should reflect what's actually true.

---

## 11. States, Responsiveness, Motion & Accessibility

Apply these globally, to every screen, without exception:

- **States:** empty (positive framing, one primary action), loading (layout-shaped skeletons, never a bare spinner past ~400ms), error (specific, recoverable, never destroys unsaved input — cache typed content locally first), success (a quiet toast for routine saves; genuine celebration reserved only for real milestones).

- **Responsive:** desktop is the Plan & Analyze surface, mobile is the Execute & Revise surface — a deliberate decision, not a fallback. Breakpoints: <640px mobile (bottom tab bar), 640–1024px tablet (collapsible sidebar), 1024–1440px desktop (full sidebar), 1440px+ large desktop.

- **Motion:** 120–180ms micro-interactions, 200–300ms transitions, nothing over 400ms; ease-out on entrance, ease-in on exit; full respect for `prefers-reduced-motion` everywhere.

- **Accessibility:** WCAG 2.1 AA minimum. Every interactive element keeps a visible focus ring. Every colour-coded signal (subject, status, mistake type) pairs with an icon and a text label. The command palette and the mock-test interface must be 100% keyboard-operable. Every chart needs an accessible data-table alternative.

---

## 12. Performance, Scalability & Future-Proofing

- Paginate or virtualize every long list (PYQ Tracker, Wrong Question Notebook, Test History, Notes Vault) — never fetch an unbounded result set.

- Index `user_topic_progress`, `test_attempts`, `test_answers`, and `error_log` on `user_id` at minimum — these are the tables every dashboard query touches.

- Cache the curriculum tables and `cutoff_data` aggressively client-side — they change rarely and are read constantly.

- Build the `syllabus_year` field into the curriculum tables from day one (Section 4) — NTA has changed the NEET pattern before and will again.

- Build the Mock Test Live Interface to hold up under simultaneous load: this is the one screen where a large share of the user base may be active in the same narrow window on a scheduled mock day, so keep its queries minimal and avoid heavy client-side computation mid-exam.

- Leave the `parent_links` table and `is_admin` flag in the schema now (Section 5) so Phase-3 features don't require a migration later.

---

## 13. Naming Conventions & Code Quality Standards

- **Files/folders:** kebab-case (`chapter-tracker/`, `flashcard-review-session.tsx`).

- **Components:** PascalCase, named for what they render, not where they're used (`ProgressRing`, not `DashboardCircle1`).

- **Database tables/columns:** snake_case, matching Section 4 exactly (`test_attempts`, `next_revision_due_at`), so generated TypeScript types stay predictable.

- **Hooks:** `use`-prefixed, one responsibility each (`useTopicProgress`, not a generic `useData`).

- Every component should work with reasonable default props — no screen should break because a widget was dropped in without every field wired up.

- No screen invents its own button, card, empty state, or colour — everything traces back to Sections 7–8. If a screen seems to need something new, add it to the shared library first, then use it.

---

## 14. Build Priority — Milestone Sequence

Build in this order; each milestone is a usable, demoable slice, not a partial screen:

1. **Foundation:** auth, onboarding wizard, curriculum seed data, Dashboard shell, design system tokens.

2. **Core loop:** Daily Planner, Today's Tasks, Subjects, Chapter Tracker, Mock Test Setup/Live/Results, basic Analytics Overview.

3. **Memory & revision:** Wrong Question Notebook, Flashcard Decks + Review, Revision Planner, the spaced-repetition Edge Function.

4. **Depth:** full Analytics Dashboard (Heatmap, Rank Predictor, Speed vs Accuracy), PYQ Tracker, Notes Vault, Habit Tracker, Goals/Cutoff Explorer.

5. **Differentiation:** AI Coach, notifications, achievements/badges, User Profile, Settings polish, dark-mode refinement.

6. **Scale-readiness:** Community/Study Rooms route (flagged Phase 3), Parent/Mentor schema groundwork, a performance pass on the mock-day load path.

---

## 15. Definition of Done

A screen is not complete until it has: all four states (empty/loading/error/success) implemented, not just the happy path; full keyboard operability; correct behaviour at all four breakpoints; motion that respects `prefers-reduced-motion`; and zero one-off colours, spacing values, or components outside the system defined in Sections 7–8. If it doesn't clear all five, it isn't done — it's a draft.

---

*End of prompt.*

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7fbc400f-31b4-4a1b-bdfc-d9b786cd390b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
