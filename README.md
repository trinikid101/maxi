# Life OS AI

**The operating system for your entire life — not just a task manager.**

🔗 **Live demo:** https://trinikid101.github.io/maxi/ _(auto-deployed from this branch via GitHub Pages)_

Life OS AI automatically engineers your optimal day. You enter tasks, goals,
habits, calendar events, and your energy levels; the AI scheduling engine
produces a realistic, energy-matched, anti-overwhelm day plan — and continuously
re-optimizes it as the day unfolds. It's meant to feel like a personal chief of
staff, executive assistant, productivity coach, and life strategist combined.

> This repository contains a fully working **foundation**: a powerful
> deterministic scheduling engine (the hard part) plus a premium calendar-first
> UI. It runs end-to-end with **no API keys or accounts required**. External
> integrations (OpenAI coach, Clerk auth, Supabase persistence, calendar sync)
> are scaffolded behind environment flags so they can be switched on later.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # run the scheduling-engine unit tests
npm run build    # production build
```

The app boots with realistic demo data so you can see the engine working
immediately. Everything persists to `localStorage`. Hit **Reset** in the header
to restore the demo.

---

## What's implemented

### The AI scheduling engine (`src/lib/engine/`)

A fully deterministic, dependency-free TypeScript engine — the heart of the
product. It blends 20+ productivity methodologies and decides which to emphasize
based on your situation:

| Module | Responsibility |
| --- | --- |
| `scoring.ts` | Per-task Priority / Urgency / Difficulty / Energy / Focus / Stress / Reward scores, Eisenhower quadrant, and a composite **execution order**. |
| `energy.ts` | Builds a 24-hour circadian energy curve from your self-reports and matches task energy demand to available energy. |
| `scheduler.ts` | The placement engine: schedules around fixed events, energy-matches deep work to peak windows, **batches** similar tasks, inserts mandatory **breaks/buffers**, respects a **deep-work ceiling**, honors **dependencies**, stacks **habits**, and protects **recovery**. |
| `replan.ts` | Adaptive replanning — re-flows the *remaining* day when a task overruns, finishes early, is skipped, or when you flag overwhelm. |
| `lifescore.ts` | Multi-dimensional Life Score (productivity, health, habits, consistency, goals, learning, fitness, relationships). |
| `gamification.ts` | XP, a 1–100 level curve, streaks, and achievements. |
| `coach.ts` | Deterministic executive-coach briefing + "what should I do right now?". |

Methodologies the engine encodes: Eisenhower Matrix, Time Blocking, Time
Batching, Pomodoro, Parkinson's Law, Deep Work, 80/20, Atomic Habits / Habit
Stacking, Energy Management, Flow protection, Cognitive Load Reduction, Decision
Fatigue Prevention, Circadian Scheduling, Recovery Scheduling, Peak-Performance
Planning, and Goal-Alignment analysis.

The engine is covered by unit tests in `src/lib/engine/engine.test.ts`
(`npm test`).

### The app (`src/app`, `src/components`)

A premium, calendar-first dark UI (Next.js App Router + Tailwind, shadcn-style
primitives):

- **What now?** hero — the single most important answer at any moment, with
  Focus / Done / Skip and an "I'm overwhelmed → simplify" action.
- **Engineered schedule timeline** — energy-matched time blocks on a real clock,
  with a live "now" line, rationale tooltips, and one-click re-optimize.
- **Tasks** — quick composer with importance/difficulty/focus/stress/reward,
  Eisenhower tagging, execution-score ranking, and a deferred-tasks tray.
- **Habits** — auto-placed and habit-stacked into the day.
- **Energy engine** — visualize and tune your morning/afternoon/evening energy.
- **AI coach** — always-on deterministic briefing + an "ask anything" box
  (uses OpenAI when a key is present).
- **Life Score**, **XP / levels / achievements**, and a **Focus Mode** with a
  Pomodoro timer.

---

## Configuration

All environment variables are **optional** — see `.env.example`.

- `OPENAI_API_KEY` — upgrades the coach's "ask anything" replies via
  `/api/coach`. Without it, a built-in strategist answers.
- Clerk / Supabase keys — placeholders for when you add auth and durable
  persistence.

---

## Intended tech stack & roadmap

Built on **Next.js + TypeScript + Tailwind** with shadcn-style components, ready
to deploy on **Vercel**. The product spec also calls for Clerk (auth), Supabase
(Postgres + realtime/WebSockets), OpenAI, and calendar sync (Google / Apple /
Outlook). Those integrations are intentionally isolated behind the engine and
env flags so the core experience works today and they can be layered in without
touching the scheduling logic.

The previous prototype in this repo (a taxi game) was moved to
[`legacy-taxi-game/`](./legacy-taxi-game/) and is untouched.
