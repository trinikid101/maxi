import type { TaskInput } from "./types";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
}

export interface GamificationState {
  xp: number;
  level: number;
  /** XP into the current level. */
  levelXp: number;
  /** XP needed to reach the next level. */
  nextLevelXp: number;
  streak: number;
  achievements: Achievement[];
}

/** XP required to reach a given level (gentle quadratic curve, capped at 100). */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.min(100, level));
  return Math.round(50 * (l - 1) + 10 * (l - 1) * (l - 1));
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (level < 100 && xp >= xpForLevel(level + 1)) level++;
  return level;
}

export const XP_RULES = {
  taskComplete: 20,
  habitComplete: 15,
  deepWorkSession: 35,
  beatEstimate: 25, // finished faster than estimated
  streakDay: 10,
};

/** Award XP for the events that happened this session. */
export function awardXp(input: {
  tasksCompleted: number;
  habitsCompleted: number;
  deepWorkSessions: number;
  estimatesBeaten: number;
  streakDay: boolean;
}): number {
  return (
    input.tasksCompleted * XP_RULES.taskComplete +
    input.habitsCompleted * XP_RULES.habitComplete +
    input.deepWorkSessions * XP_RULES.deepWorkSession +
    input.estimatesBeaten * XP_RULES.beatEstimate +
    (input.streakDay ? XP_RULES.streakDay : 0)
  );
}

export function buildGamificationState(
  xp: number,
  streak: number,
  ctx: { totalTasksCompleted: number; deepWorkSessions: number },
): GamificationState {
  const level = levelForXp(xp);
  const base = xpForLevel(level);
  const next = xpForLevel(Math.min(100, level + 1));
  return {
    xp,
    level,
    levelXp: xp - base,
    nextLevelXp: Math.max(1, next - base),
    streak,
    achievements: ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: a.test({ xp, level, streak, ...ctx }),
    })),
  };
}

interface AchievementDef {
  id: string;
  title: string;
  description: string;
  test: (ctx: {
    xp: number;
    level: number;
    streak: number;
    totalTasksCompleted: number;
    deepWorkSessions: number;
  }) => boolean;
}

const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-deep-work",
    title: "First Deep Work Session",
    description: "Complete your first deep-work block.",
    test: (c) => c.deepWorkSessions >= 1,
  },
  {
    id: "streak-7",
    title: "7 Day Streak",
    description: "Show up seven days in a row.",
    test: (c) => c.streak >= 7,
  },
  {
    id: "streak-30",
    title: "30 Day Streak",
    description: "A full month of consistency.",
    test: (c) => c.streak >= 30,
  },
  {
    id: "tasks-100",
    title: "100 Tasks Completed",
    description: "Cross 100 lifetime tasks off the list.",
    test: (c) => c.totalTasksCompleted >= 100,
  },
  {
    id: "goal-crusher",
    title: "Goal Crusher",
    description: "Reach level 10.",
    test: (c) => c.level >= 10,
  },
  {
    id: "focus-master",
    title: "Focus Master",
    description: "Log 25 deep-work sessions.",
    test: (c) => c.deepWorkSessions >= 25,
  },
  {
    id: "productivity-legend",
    title: "Productivity Legend",
    description: "Reach level 50.",
    test: (c) => c.level >= 50,
  },
];

/** Detect whether a completed task counted as beating its estimate. */
export function beatEstimate(task: TaskInput, actualMin: number): boolean {
  return actualMin > 0 && actualMin < task.durationMin * 0.9;
}
