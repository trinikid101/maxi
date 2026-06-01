import { energyForWindow, energyMatch } from "./energy";
import { analyzeTask, QUADRANT_LABEL } from "./scoring";
import type {
  CalendarEvent,
  Habit,
  Methodology,
  Minutes,
  Schedule,
  SchedulerConfig,
  TaskAnalysis,
  TaskInput,
  TimeBlock,
} from "./types";

interface Interval {
  start: Minutes;
  end: Minutes;
}

const GRAIN = 15; // placement granularity in minutes
let idSeq = 0;
const blockId = () => `blk_${idSeq++}`;

function isDeepTask(t: TaskInput): boolean {
  return t.focus >= 4 && t.difficulty >= 3;
}

/** Free intervals within [start,end] after removing the given occupied spans. */
function freeIntervals(
  bound: Interval,
  occupied: Interval[],
): Interval[] {
  const busy = [...occupied]
    .filter((b) => b.end > bound.start && b.start < bound.end)
    .map((b) => ({
      start: Math.max(b.start, bound.start),
      end: Math.min(b.end, bound.end),
    }))
    .sort((a, b) => a.start - b.start);

  const free: Interval[] = [];
  let cursor = bound.start;
  for (const b of busy) {
    if (b.start > cursor) free.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < bound.end) free.push({ start: cursor, end: bound.end });
  return free;
}

/**
 * Find the best-fitting start time for a block of `len` minutes.
 * Scores candidate slots by energy fit, then biases by quadrant, batching
 * adjacency, and time-of-day preference.
 */
function findSlot(
  len: Minutes,
  opts: {
    bound: Interval;
    occupied: TimeBlock[];
    energyDemand: number;
    profile: SchedulerConfig["energy"];
    earliest: Minutes;
    preferEarly: boolean;
    sameCategoryEnds: Minutes[]; // ends of already-placed same-category blocks (batching)
  },
): { start: Minutes; energyMatch: number } | null {
  const free = freeIntervals(opts.bound, opts.occupied);
  let best: { start: Minutes; score: number; em: number } | null = null;

  for (const gap of free) {
    const from = Math.max(gap.start, opts.earliest);
    for (let s = ceilTo(from, GRAIN); s + len <= gap.end; s += GRAIN) {
      const avail = energyForWindow(opts.profile, s, s + len);
      const em = energyMatch(opts.energyDemand, avail);
      let score = em * 100;
      // Batching: reward starting right where a same-category block ended.
      if (opts.sameCategoryEnds.some((e) => Math.abs(e - s) <= GRAIN)) {
        score += 18;
      }
      // Quadrant / urgency bias toward earlier in the day.
      if (opts.preferEarly) score += Math.max(0, 12 - (s - opts.bound.start) / 30);
      // Mild preference for earlier slots to keep the day front-loaded.
      score -= (s - opts.bound.start) / 240;
      if (!best || score > best.score) best = { start: s, score, em };
    }
  }
  return best ? { start: best.start, energyMatch: best.em } : null;
}

const ceilTo = (n: number, step: number) => Math.ceil(n / step) * step;

function decideEmphasis(
  tasks: TaskInput[],
  analyses: TaskAnalysis[],
  totalWorkMin: number,
  availableMin: number,
): Methodology[] {
  const emphasis: Methodology[] = [];
  const deepCount = tasks.filter(isDeepTask).length;
  const urgentImportant = analyses.filter((a) => a.quadrant === "do").length;
  const load = totalWorkMin / Math.max(1, availableMin);

  // Category frequency → batching matters when many small same-type tasks.
  const catCounts = new Map<string, number>();
  for (const t of tasks) {
    const c = t.category ?? "_";
    catCounts.set(c, (catCounts.get(c) ?? 0) + 1);
  }
  const maxCat = Math.max(0, ...catCounts.values());

  if (deepCount >= 2) emphasis.push("deep-work");
  if (urgentImportant >= 2) emphasis.push("eisenhower");
  if (maxCat >= 3) emphasis.push("batching");
  if (load > 0.85) emphasis.push("recovery");
  emphasis.push("energy-management", "time-blocking");
  // Pomodoro shines when there are many medium-focus tasks.
  if (tasks.filter((t) => t.focus === 3).length >= 2) emphasis.push("pomodoro");
  // Parkinson's law: short padded estimates benefit from tight blocks.
  if (tasks.some((t) => t.durationMin >= 90)) emphasis.push("parkinson");
  return Array.from(new Set(emphasis));
}

/**
 * The Life OS scheduling engine. Produces a realistic, energy-matched,
 * anti-overwhelm-aware day plan. Fully deterministic — no network required.
 */
export function buildSchedule(
  date: string,
  tasksRaw: TaskInput[],
  habits: Habit[],
  events: CalendarEvent[],
  config: SchedulerConfig,
): Schedule {
  idSeq = 0;
  const now = config.now ?? config.work.start;
  const bound: Interval = { start: config.work.start, end: config.work.end };
  const tasks = tasksRaw.filter((t) => !t.completed);
  const analyses = tasks.map((t) => analyzeTask(t, config.goals, Date.now()));
  const analysisById = new Map(analyses.map((a) => [a.taskId, a]));

  const blocks: TimeBlock[] = [];
  const deferred: { taskId: string; reason: string }[] = [];
  const notes: string[] = [];

  // 1. Lock calendar events as immovable occupancy.
  for (const ev of events) {
    blocks.push({
      id: blockId(),
      kind: "event",
      title: ev.title,
      start: ev.start,
      end: ev.end,
      refId: ev.id,
      rationale: "Fixed calendar commitment — the day is built around it.",
    });
  }

  // 2. Anchor fixed-start tasks.
  const placedTaskIds = new Set<string>();
  for (const t of tasks) {
    if (t.fixedStart === undefined) continue;
    blocks.push(makeTaskBlock(t, analysisById.get(t.id)!, t.fixedStart, config, 1));
    placedTaskIds.add(t.id);
  }

  const availableMin = Math.max(0, bound.end - Math.max(bound.start, now));
  const totalWorkMin = tasks.reduce((s, t) => s + t.durationMin, 0);
  const emphasis = decideEmphasis(tasks, analyses, totalWorkMin, availableMin);

  let cumulativeDeep = 0;
  const sameCatEnds = new Map<string, Minutes[]>();

  // 3. Greedy, dependency-aware placement in execution-score order.
  const queue = tasks
    .filter((t) => t.fixedStart === undefined)
    .sort(
      (a, b) =>
        analysisById.get(b.id)!.executionScore -
        analysisById.get(a.id)!.executionScore,
    );

  let progress = true;
  while (progress) {
    progress = false;
    for (const t of queue) {
      if (placedTaskIds.has(t.id) || deferred.some((d) => d.taskId === t.id))
        continue;
      // Dependencies must already be placed.
      const deps = t.dependsOn ?? [];
      const unmet = deps.filter(
        (d) => tasks.some((x) => x.id === d) && !placedTaskIds.has(d),
      );
      if (unmet.length) continue;

      const a = analysisById.get(t.id)!;
      const deep = isDeepTask(t);

      // Anti-overwhelm: respect the deep-work ceiling.
      if (deep && cumulativeDeep + t.durationMin > config.antiOverwhelm.maxDeepWorkMin) {
        deferred.push({
          taskId: t.id,
          reason: `Deferred to protect focus — would exceed the ${config.antiOverwhelm.maxDeepWorkMin}-min deep-work ceiling.`,
        });
        progress = true;
        continue;
      }

      const needBreak = deep || t.focus >= 4;
      const breakLen = needBreak ? config.antiOverwhelm.breakMin : 0;
      const earliest = Math.max(bound.start, now, latestDepEnd(t, blocks));

      const slot =
        findSlot(t.durationMin + breakLen, {
          bound,
          occupied: blocks,
          energyDemand: a.energyScore / 100,
          profile: config.energy,
          earliest,
          preferEarly: a.quadrant === "do" || a.urgencyScore >= 70,
          sameCategoryEnds: t.category ? sameCatEnds.get(t.category) ?? [] : [],
        }) ??
        // Retry without reserving the break if the day is tight.
        findSlot(t.durationMin, {
          bound,
          occupied: blocks,
          energyDemand: a.energyScore / 100,
          profile: config.energy,
          earliest,
          preferEarly: a.quadrant === "do" || a.urgencyScore >= 70,
          sameCategoryEnds: t.category ? sameCatEnds.get(t.category) ?? [] : [],
        });

      if (!slot) {
        deferred.push({
          taskId: t.id,
          reason: "No realistic open slot today — carried to tomorrow's plan.",
        });
        progress = true;
        continue;
      }

      const block = makeTaskBlock(t, a, slot.start, config, slot.energyMatch);
      blocks.push(block);
      placedTaskIds.add(t.id);
      if (deep) cumulativeDeep += t.durationMin;
      if (t.category) {
        const arr = sameCatEnds.get(t.category) ?? [];
        arr.push(block.end);
        sameCatEnds.set(t.category, arr);
      }

      // Insert the protective break if it fits right after.
      if (needBreak && fits(blocks, block.end, block.end + breakLen, bound)) {
        blocks.push({
          id: blockId(),
          kind: "break",
          title: "Break",
          start: block.end,
          end: block.end + breakLen,
          rationale: `Mandatory recovery after focused work (${block.title}).`,
        });
      }
      progress = true;
    }
  }

  // 4. Place habits (habit stacking + preferred windows).
  for (const h of habits.filter((x) => !x.completed)) {
    const win = preferredWindow(h.preferred, bound);
    let earliest = Math.max(win.start, now);
    if (h.stackAfterId) {
      const anchor = blocks.find((b) => b.refId === h.stackAfterId);
      if (anchor) earliest = Math.max(earliest, anchor.end);
    }
    const slot = findSlot(h.durationMin, {
      bound: win,
      occupied: blocks,
      energyDemand: h.energy === "high" ? 0.8 : h.energy === "medium" ? 0.55 : 0.3,
      profile: config.energy,
      earliest,
      preferEarly: h.preferred === "morning",
      sameCategoryEnds: [],
    });
    if (slot) {
      blocks.push({
        id: blockId(),
        kind: "habit",
        title: h.title,
        start: slot.start,
        end: slot.start + h.durationMin,
        refId: h.id,
        rationale: h.stackAfterId
          ? "Habit-stacked onto an existing anchor for automaticity."
          : `Placed in your ${h.preferred} window for consistency.`,
      });
    } else {
      notes.push(`Couldn't fit habit "${h.title}" today without crowding the day.`);
    }
  }

  // 5. Recovery protection — guarantee at least one reset if the day is heavy.
  const committed = blocks
    .filter((b) => b.kind === "deep" || b.kind === "focus" || b.kind === "admin")
    .reduce((s, b) => s + (b.end - b.start), 0);
  const loadScore = Math.round(
    Math.min(100, (committed / Math.max(1, availableMin)) * 100),
  );

  if (config.antiOverwhelm.protectRecovery && loadScore >= 75) {
    const recSlot = findSlot(20, {
      bound: { start: bound.start + (bound.end - bound.start) / 2, end: bound.end },
      occupied: blocks,
      energyDemand: 0.2,
      profile: config.energy,
      earliest: now,
      preferEarly: false,
      sameCategoryEnds: [],
    });
    if (recSlot) {
      blocks.push({
        id: blockId(),
        kind: "recovery",
        title: "Recovery reset",
        start: recSlot.start,
        end: recSlot.start + 20,
        rationale: "Heavy day detected — a protected reset to prevent burnout.",
      });
      notes.push("High load: inserted a recovery reset and capped deep work.");
    }
  }

  if (deferred.length) {
    notes.push(
      `${deferred.length} task(s) intentionally deferred — consistency beats overpacking.`,
    );
  }

  blocks.sort((a, b) => a.start - b.start || a.kind.localeCompare(b.kind));

  return {
    date,
    blocks,
    analyses,
    deferred,
    emphasis,
    loadScore,
    notes,
  };
}

function makeTaskBlock(
  t: TaskInput,
  a: TaskAnalysis,
  start: Minutes,
  config: SchedulerConfig,
  em: number,
): TimeBlock {
  const deep = isDeepTask(t);
  const kind = deep ? "deep" : t.focus >= 4 ? "focus" : "admin";
  return {
    id: blockId(),
    kind,
    title: t.title,
    start,
    end: start + t.durationMin,
    refId: t.id,
    quadrant: a.quadrant,
    energyMatch: em,
    rationale:
      kind === "deep"
        ? `Deep-work block placed in a high-energy window (${QUADRANT_LABEL[a.quadrant]}).`
        : kind === "focus"
          ? `Focus block — energy-matched (${Math.round(em * 100)}% fit).`
          : `Batched admin/low-load task (${QUADRANT_LABEL[a.quadrant]}).`,
  };
}

function latestDepEnd(t: TaskInput, blocks: TimeBlock[]): Minutes {
  let latest = 0;
  for (const d of t.dependsOn ?? []) {
    const b = blocks.find((x) => x.refId === d);
    if (b) latest = Math.max(latest, b.end);
  }
  return latest;
}

function fits(blocks: TimeBlock[], start: Minutes, end: Minutes, bound: Interval): boolean {
  if (start < bound.start || end > bound.end) return false;
  return !blocks.some((b) => b.start < end && start < b.end);
}

function preferredWindow(
  pref: Habit["preferred"],
  bound: Interval,
): Interval {
  const span = bound.end - bound.start;
  switch (pref) {
    case "morning":
      return { start: bound.start, end: bound.start + span * 0.4 };
    case "midday":
      return { start: bound.start + span * 0.3, end: bound.start + span * 0.7 };
    case "evening":
      return { start: bound.start + span * 0.6, end: bound.end };
    default:
      return bound;
  }
}
