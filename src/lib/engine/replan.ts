import { buildSchedule } from "./scheduler";
import type {
  CalendarEvent,
  Habit,
  Minutes,
  Schedule,
  SchedulerConfig,
  TaskInput,
} from "./types";

export type ReplanEvent =
  | { type: "task-overran"; taskId: string; actualMin: Minutes; now: Minutes }
  | { type: "task-done-early"; taskId: string; now: Minutes }
  | { type: "task-skipped"; taskId: string; now: Minutes }
  | { type: "overwhelmed"; now: Minutes };

/**
 * Adaptive replanning. Given the day's inputs and a disruption, re-runs the
 * engine over the *remaining* day only — past blocks are never disturbed.
 */
export function replan(
  date: string,
  tasks: TaskInput[],
  habits: Habit[],
  events: CalendarEvent[],
  config: SchedulerConfig,
  event: ReplanEvent,
): Schedule {
  let nextTasks = tasks.map((t) => ({ ...t }));
  const cfg: SchedulerConfig = { ...config, now: event.now };
  const notes: string[] = [];

  switch (event.type) {
    case "task-overran": {
      const t = nextTasks.find((x) => x.id === event.taskId);
      if (t) t.durationMin = event.actualMin; // reflect reality for the record
      notes.push("A task ran long — remaining work re-flowed around the new clock.");
      break;
    }
    case "task-done-early": {
      const t = nextTasks.find((x) => x.id === event.taskId);
      if (t) t.completed = true;
      notes.push("Finished early — the rest of the day re-optimized to pull work forward.");
      break;
    }
    case "task-skipped": {
      // Push the skipped task's deadline pressure down a notch by nudging
      // importance so it doesn't dominate, but keep it on the board.
      const t = nextTasks.find((x) => x.id === event.taskId);
      if (t) t.importance = Math.max(1, t.importance - 1);
      notes.push("Task skipped — re-prioritized the remainder around what's still live.");
      break;
    }
    case "overwhelmed": {
      // Simplify: tighten the deep-work ceiling and drop the lowest-value third.
      cfg.antiOverwhelm = {
        ...cfg.antiOverwhelm,
        maxDeepWorkMin: Math.round(cfg.antiOverwhelm.maxDeepWorkMin * 0.6),
        protectRecovery: true,
      };
      const active = nextTasks.filter((t) => !t.completed);
      const ranked = [...active].sort(
        (a, b) => a.importance * a.reward - b.importance * b.reward,
      );
      const dropCount = Math.ceil(ranked.length / 3);
      const dropIds = new Set(ranked.slice(0, dropCount).map((t) => t.id));
      nextTasks = nextTasks.map((t) =>
        dropIds.has(t.id) ? { ...t, completed: false, deferred: true } : t,
      ) as TaskInput[];
      // Remove dropped tasks from today's scheduling pool.
      nextTasks = nextTasks.filter((t) => !dropIds.has(t.id));
      notes.push(
        `Overwhelm detected — simplified the day to ${nextTasks.filter((t) => !t.completed).length} essential tasks and protected recovery.`,
      );
      break;
    }
  }

  const schedule = buildSchedule(date, nextTasks, habits, events, cfg);
  schedule.notes = [...notes, ...schedule.notes];
  return schedule;
}
