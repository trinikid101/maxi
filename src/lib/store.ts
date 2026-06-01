"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  awardXp,
  beatEstimate,
  makeEnergyProfile,
  type AntiOverwhelmConfig,
  type CalendarEvent,
  type EnergyLevel,
  type Goal,
  type Habit,
  type TaskInput,
  type WorkWindow,
} from "./engine";

export interface AppState {
  tasks: TaskInput[];
  habits: Habit[];
  events: CalendarEvent[];
  goals: Goal[];
  work: WorkWindow;
  energy: { morning: EnergyLevel; afternoon: EnergyLevel; evening: EnergyLevel };
  antiOverwhelm: AntiOverwhelmConfig;
  /** Current minute-of-day used by the engine + coach (demo-adjustable). */
  now: number;
  xp: number;
  streak: number;
  totalTasksCompleted: number;
  deepWorkSessions: number;
  /** Bumps to force a fresh re-optimization. */
  seed: number;

  // actions
  addTask: (t: Omit<TaskInput, "id">) => void;
  removeTask: (id: string) => void;
  toggleTask: (id: string, actualMin?: number) => void;
  addHabit: (h: Omit<Habit, "id">) => void;
  toggleHabit: (id: string) => void;
  removeHabit: (id: string) => void;
  setEnergy: (e: Partial<AppState["energy"]>) => void;
  setWork: (w: Partial<WorkWindow>) => void;
  setAntiOverwhelm: (c: Partial<AntiOverwhelmConfig>) => void;
  setNow: (m: number) => void;
  reoptimize: () => void;
  reset: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const DEMO_GOALS: Goal[] = [
  { id: "g1", title: "Launch Life OS v1", weight: 5 },
  { id: "g2", title: "Stay healthy & energized", weight: 4 },
];

const DEMO_TASKS: TaskInput[] = [
  { id: "t1", title: "Write the product launch post", durationMin: 90, importance: 5, difficulty: 4, focus: 5, stress: 3, reward: 5, deadline: Date.now() + 6 * 3600_000, category: "writing", goalId: "g1" },
  { id: "t2", title: "Implement scheduling API", durationMin: 120, importance: 5, difficulty: 5, focus: 5, stress: 4, reward: 4, category: "coding", goalId: "g1" },
  { id: "t3", title: "Clear inbox & reply to investors", durationMin: 40, importance: 4, difficulty: 1, focus: 1, stress: 2, reward: 3, category: "email", deadline: Date.now() + 4 * 3600_000 },
  { id: "t4", title: "Review design mocks", durationMin: 45, importance: 3, difficulty: 2, focus: 3, stress: 1, reward: 3, category: "review", dependsOn: ["t1"] },
  { id: "t5", title: "Pay quarterly taxes", durationMin: 30, importance: 2, difficulty: 2, focus: 2, stress: 4, reward: 2, category: "admin" },
];

const DEMO_HABITS: Habit[] = [
  { id: "h1", title: "Morning exercise", durationMin: 30, preferred: "morning", energy: "high" },
  { id: "h2", title: "Meditation", durationMin: 15, preferred: "morning", energy: "low", stackAfterId: "h1" },
  { id: "h3", title: "Read 20 min", durationMin: 20, preferred: "evening", energy: "low" },
  { id: "h4", title: "Hydrate (water check)", durationMin: 5, preferred: "midday", energy: "low" },
];

const DEMO_EVENTS: CalendarEvent[] = [
  { id: "e1", title: "Team standup", start: 10 * 60, end: 10 * 60 + 30 },
  { id: "e2", title: "1:1 with mentor", start: 14 * 60, end: 14 * 60 + 45 },
];

const initial = () => ({
  tasks: DEMO_TASKS,
  habits: DEMO_HABITS,
  events: DEMO_EVENTS,
  goals: DEMO_GOALS,
  work: { start: 9 * 60, end: 18 * 60 } as WorkWindow,
  energy: { morning: "high" as EnergyLevel, afternoon: "medium" as EnergyLevel, evening: "low" as EnergyLevel },
  antiOverwhelm: {
    maxDeepWorkMin: 240,
    focusBeforeBreakMin: 90,
    breakMin: 15,
    bufferMin: 10,
    protectRecovery: true,
  } as AntiOverwhelmConfig,
  now: 9 * 60 + 35,
  xp: 320,
  streak: 5,
  totalTasksCompleted: 14,
  deepWorkSessions: 3,
  seed: 0,
});

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initial(),

      addTask: (t) => set((s) => ({ tasks: [...s.tasks, { ...t, id: uid() }], seed: s.seed + 1 })),
      removeTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id), seed: s.seed + 1 })),
      toggleTask: (id, actualMin) =>
        set((s) => {
          const task = s.tasks.find((t) => t.id === id);
          if (!task) return {};
          const willComplete = !task.completed;
          let xp = s.xp;
          let total = s.totalTasksCompleted;
          let deep = s.deepWorkSessions;
          if (willComplete) {
            const isDeep = task.focus >= 4 && task.difficulty >= 3;
            xp += awardXp({
              tasksCompleted: 1,
              habitsCompleted: 0,
              deepWorkSessions: isDeep ? 1 : 0,
              estimatesBeaten: actualMin && beatEstimate(task, actualMin) ? 1 : 0,
              streakDay: false,
            });
            total += 1;
            if (isDeep) deep += 1;
          }
          return {
            tasks: s.tasks.map((t) => (t.id === id ? { ...t, completed: willComplete } : t)),
            xp,
            totalTasksCompleted: total,
            deepWorkSessions: deep,
            seed: s.seed + 1,
          };
        }),

      addHabit: (h) => set((s) => ({ habits: [...s.habits, { ...h, id: uid() }], seed: s.seed + 1 })),
      removeHabit: (id) =>
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id), seed: s.seed + 1 })),
      toggleHabit: (id) =>
        set((s) => {
          const habit = s.habits.find((h) => h.id === id);
          if (!habit) return {};
          const willComplete = !habit.completed;
          return {
            habits: s.habits.map((h) => (h.id === id ? { ...h, completed: willComplete } : h)),
            xp: willComplete ? s.xp + awardXp({ tasksCompleted: 0, habitsCompleted: 1, deepWorkSessions: 0, estimatesBeaten: 0, streakDay: false }) : s.xp,
            seed: s.seed + 1,
          };
        }),

      setEnergy: (e) => set((s) => ({ energy: { ...s.energy, ...e }, seed: s.seed + 1 })),
      setWork: (w) => set((s) => ({ work: { ...s.work, ...w }, seed: s.seed + 1 })),
      setAntiOverwhelm: (c) => set((s) => ({ antiOverwhelm: { ...s.antiOverwhelm, ...c }, seed: s.seed + 1 })),
      setNow: (m) => set({ now: m }),
      reoptimize: () => set((s) => ({ seed: s.seed + 1 })),
      reset: () => set({ ...initial() }),
    }),
    { name: "life-os-ai" },
  ),
);

/** Build a SchedulerConfig from the current store state. */
export function configFromState(s: AppState) {
  return {
    work: s.work,
    energy: makeEnergyProfile(s.energy.morning, s.energy.afternoon, s.energy.evening),
    antiOverwhelm: s.antiOverwhelm,
    goals: s.goals,
    now: s.now,
  };
}
