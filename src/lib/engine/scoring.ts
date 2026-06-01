import type {
  EisenhowerQuadrant,
  Goal,
  TaskAnalysis,
  TaskInput,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/**
 * Urgency derives from deadline proximity. A task due within the day is ~max
 * urgency; urgency decays smoothly the further out the deadline sits, and
 * undeadlined tasks float at a low-but-nonzero baseline so they still surface.
 */
export function urgencyScore(task: TaskInput, now: number): number {
  if (!task.deadline) return 25;
  const msLeft = task.deadline - now;
  if (msLeft <= 0) return 100; // overdue — maximum pull
  const daysLeft = msLeft / DAY_MS;
  // Exponential-ish decay: same-day ~100, 1 day ~80, 3 days ~50, 7 days ~25.
  return clamp(100 * Math.exp(-daysLeft / 4));
}

/** Importance (1..5) blended with linked-goal strategic weight. */
export function priorityScore(task: TaskInput, goals: Goal[]): number {
  const base = (task.importance / 5) * 100;
  const goal = task.goalId ? goals.find((g) => g.id === task.goalId) : undefined;
  if (!goal) return clamp(base);
  // Goal alignment can lift a task by up to 25 points (80/20 — high-leverage work).
  const lift = (goal.weight / 5) * 25;
  return clamp(base * 0.8 + lift + 20 * 0.2);
}

const to100 = (oneToFive: number) => clamp(((oneToFive - 1) / 4) * 100);

export function analyzeTask(
  task: TaskInput,
  goals: Goal[],
  now: number,
): TaskAnalysis {
  const priority = priorityScore(task, goals);
  const urgency = urgencyScore(task, now);
  const difficulty = to100(task.difficulty);
  const focus = to100(task.focus);
  const stress = to100(task.stress);
  const reward = to100(task.reward);
  // Energy required is a blend of cognitive difficulty and focus demand.
  const energy = clamp(difficulty * 0.55 + focus * 0.45);

  // Execution order favors the Eisenhower "important" axis and reward, while
  // urgency provides the deadline pull and stress is a mild de-prioritizer
  // (don't front-load the day with dread unless it's also urgent/important).
  const executionScore = clamp(
    priority * 0.4 +
      urgency * 0.3 +
      reward * 0.15 +
      energy * 0.1 -
      stress * 0.05 +
      5,
  );

  return {
    taskId: task.id,
    priorityScore: priority,
    urgencyScore: urgency,
    difficultyScore: difficulty,
    energyScore: energy,
    focusScore: focus,
    stressScore: stress,
    rewardScore: reward,
    executionScore,
    quadrant: eisenhower(priority, urgency),
  };
}

export function eisenhower(
  priority: number,
  urgency: number,
): EisenhowerQuadrant {
  const important = priority >= 55;
  const urgent = urgency >= 55;
  if (important && urgent) return "do";
  if (important && !urgent) return "schedule";
  if (!important && urgent) return "delegate";
  return "eliminate";
}

export const QUADRANT_LABEL: Record<EisenhowerQuadrant, string> = {
  do: "Do first · Important & Urgent",
  schedule: "Schedule · Important, Not Urgent",
  delegate: "Delegate · Urgent, Not Important",
  eliminate: "Minimize · Neither",
};
