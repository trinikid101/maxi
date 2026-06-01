import type { Habit, Schedule, TaskInput } from "./types";

export interface LifeScore {
  productivity: number;
  health: number;
  habits: number;
  consistency: number;
  goals: number;
  learning: number;
  fitness: number;
  relationships: number;
  /** Weighted overall 0..100. */
  overall: number;
}

export interface DayStats {
  tasks: TaskInput[];
  habits: Habit[];
  schedule: Schedule;
  /** Running streak in days. */
  streak: number;
  /** Deep-work minutes completed today. */
  deepWorkMin: number;
}

const pct = (done: number, total: number) =>
  total === 0 ? 100 : Math.round((done / total) * 100);

const CATEGORY_HINTS: Record<keyof Omit<LifeScore, "overall">, string[]> = {
  productivity: [],
  health: ["sleep", "water", "meditat", "stretch"],
  habits: [],
  consistency: [],
  goals: [],
  learning: ["read", "study", "learn", "course"],
  fitness: ["exercise", "run", "gym", "workout", "walk"],
  relationships: ["call", "family", "friend", "meet", "partner"],
};

function matches(title: string, hints: string[]): boolean {
  const t = title.toLowerCase();
  return hints.some((h) => t.includes(h));
}

export function computeLifeScore(stats: DayStats): LifeScore {
  const { tasks, habits, deepWorkMin, streak } = stats;
  const doneTasks = tasks.filter((t) => t.completed);
  const doneHabits = habits.filter((h) => h.completed);

  const productivity = clamp(
    pct(doneTasks.length, tasks.length) * 0.6 +
      Math.min(100, (deepWorkMin / 180) * 100) * 0.4,
  );

  const habitsScore = pct(doneHabits.length, habits.length);

  const fitness = domainScore(habits, doneHabits, "fitness");
  const learning = domainScore(habits, doneHabits, "learning");
  const health = domainScore(habits, doneHabits, "health");
  const relationships = domainScore(habits, doneHabits, "relationships");

  const consistency = clamp(Math.min(100, streak * 8 + habitsScore * 0.3));
  const goals = clamp(
    pct(
      doneTasks.filter((t) => t.goalId).length,
      tasks.filter((t) => t.goalId).length,
    ),
  );

  const overall = Math.round(
    productivity * 0.28 +
      habitsScore * 0.16 +
      consistency * 0.14 +
      goals * 0.14 +
      health * 0.1 +
      fitness * 0.07 +
      learning * 0.06 +
      relationships * 0.05,
  );

  return {
    productivity,
    health,
    habits: habitsScore,
    consistency,
    goals,
    learning,
    fitness,
    relationships,
    overall: clamp(overall),
  };
}

function domainScore(
  all: Habit[],
  done: Habit[],
  domain: keyof typeof CATEGORY_HINTS,
): number {
  const hints = CATEGORY_HINTS[domain];
  const relevant = all.filter((h) => matches(h.title, hints));
  if (relevant.length === 0) return 70; // neutral baseline when nothing tracked
  const completed = done.filter((h) => matches(h.title, hints));
  return pct(completed.length, relevant.length);
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
