import { describe, expect, it } from "vitest";
import { makeEnergyProfile, energyMatch } from "./energy";
import { analyzeTask, eisenhower } from "./scoring";
import { buildSchedule } from "./scheduler";
import { replan } from "./replan";
import {
  awardXp,
  buildGamificationState,
  levelForXp,
  xpForLevel,
} from "./gamification";
import { computeLifeScore } from "./lifescore";
import type { SchedulerConfig, TaskInput } from "./types";

const baseConfig = (): SchedulerConfig => ({
  work: { start: 9 * 60, end: 18 * 60 },
  energy: makeEnergyProfile("high", "medium", "low"),
  antiOverwhelm: {
    maxDeepWorkMin: 240,
    focusBeforeBreakMin: 90,
    breakMin: 15,
    bufferMin: 10,
    protectRecovery: true,
  },
  goals: [{ id: "g1", title: "Ship product", weight: 5 }],
  now: 9 * 60,
});

const task = (over: Partial<TaskInput>): TaskInput => ({
  id: Math.random().toString(36).slice(2),
  title: "Task",
  durationMin: 60,
  importance: 3,
  difficulty: 3,
  focus: 3,
  stress: 3,
  reward: 3,
  ...over,
});

describe("scoring", () => {
  it("classifies the Eisenhower quadrants", () => {
    expect(eisenhower(80, 80)).toBe("do");
    expect(eisenhower(80, 20)).toBe("schedule");
    expect(eisenhower(20, 80)).toBe("delegate");
    expect(eisenhower(20, 20)).toBe("eliminate");
  });

  it("ranks an urgent important task above a trivial one", () => {
    const now = Date.now();
    const urgent = analyzeTask(
      task({ importance: 5, deadline: now + 3600_000, reward: 5 }),
      [],
      now,
    );
    const trivial = analyzeTask(task({ importance: 1, reward: 1 }), [], now);
    expect(urgent.executionScore).toBeGreaterThan(trivial.executionScore);
    expect(urgent.quadrant).toBe("do");
  });
});

describe("energy matching", () => {
  it("rewards matching demand to availability and penalizes overload", () => {
    expect(energyMatch(0.8, 0.9)).toBeGreaterThan(energyMatch(0.8, 0.4));
    expect(energyMatch(0.9, 0.3)).toBeLessThan(0.3);
  });
});

describe("scheduler", () => {
  it("produces non-overlapping blocks within the work window", () => {
    const tasks = [
      task({ title: "Write spec", focus: 5, difficulty: 4, durationMin: 90 }),
      task({ title: "Email triage", focus: 1, difficulty: 1, category: "email", durationMin: 30 }),
      task({ title: "Code feature", focus: 5, difficulty: 5, durationMin: 120 }),
    ];
    const s = buildSchedule("2026-06-01", tasks, [], [], baseConfig());
    const sorted = [...s.blocks].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].start).toBeGreaterThanOrEqual(sorted[i - 1].end);
    }
    for (const b of s.blocks) {
      expect(b.start).toBeGreaterThanOrEqual(9 * 60);
      expect(b.end).toBeLessThanOrEqual(18 * 60);
    }
  });

  it("schedules around fixed calendar events", () => {
    const events = [{ id: "e1", title: "Standup", start: 9 * 60, end: 9 * 60 + 30 }];
    const s = buildSchedule(
      "2026-06-01",
      [task({ title: "Work", durationMin: 60 })],
      [],
      events,
      baseConfig(),
    );
    const work = s.blocks.find((b) => b.kind !== "event" && b.kind !== "break");
    expect(work!.start).toBeGreaterThanOrEqual(9 * 60 + 30);
  });

  it("respects the deep-work ceiling by deferring excess deep work", () => {
    const cfg = baseConfig();
    cfg.antiOverwhelm.maxDeepWorkMin = 120;
    const tasks = [
      task({ title: "Deep A", focus: 5, difficulty: 5, durationMin: 90 }),
      task({ title: "Deep B", focus: 5, difficulty: 5, durationMin: 90 }),
    ];
    const s = buildSchedule("2026-06-01", tasks, [], [], cfg);
    expect(s.deferred.length).toBeGreaterThanOrEqual(1);
  });

  it("places dependent tasks after their dependency", () => {
    const a = task({ id: "a", title: "Design", durationMin: 60 });
    const b = task({ id: "b", title: "Build", durationMin: 60, dependsOn: ["a"] });
    const s = buildSchedule("2026-06-01", [b, a], [], [], baseConfig());
    const ba = s.blocks.find((x) => x.refId === "a")!;
    const bb = s.blocks.find((x) => x.refId === "b")!;
    expect(bb.start).toBeGreaterThanOrEqual(ba.end);
  });

  it("places high-focus work earlier when energy peaks in the morning", () => {
    const tasks = [
      task({ title: "Deep", focus: 5, difficulty: 5, durationMin: 90 }),
      task({ title: "Admin", focus: 1, difficulty: 1, durationMin: 60 }),
    ];
    const s = buildSchedule("2026-06-01", tasks, [], [], baseConfig());
    const deep = s.blocks.find((b) => b.kind === "deep")!;
    const admin = s.blocks.find((b) => b.kind === "admin")!;
    expect(deep.start).toBeLessThan(admin.start);
  });
});

describe("replan", () => {
  it("frees space when a task finishes early", () => {
    const tasks = [
      task({ id: "a", title: "A", durationMin: 120 }),
      task({ id: "b", title: "B", durationMin: 120 }),
    ];
    const s = replan("2026-06-01", tasks, [], [], baseConfig(), {
      type: "task-done-early",
      taskId: "a",
      now: 9 * 60,
    });
    expect(s.blocks.find((b) => b.refId === "a")).toBeUndefined();
    expect(s.blocks.find((b) => b.refId === "b")).toBeDefined();
  });

  it("simplifies the day when overwhelmed", () => {
    const tasks = Array.from({ length: 6 }, (_, i) =>
      task({ id: `t${i}`, title: `T${i}`, importance: (i % 5) + 1 }),
    );
    const full = buildSchedule("2026-06-01", tasks, [], [], baseConfig());
    const simplified = replan("2026-06-01", tasks, [], [], baseConfig(), {
      type: "overwhelmed",
      now: 9 * 60,
    });
    const fullTasks = full.blocks.filter((b) => b.refId).length;
    const simpleTasks = simplified.blocks.filter((b) => b.refId).length;
    expect(simpleTasks).toBeLessThan(fullTasks);
  });
});

describe("gamification", () => {
  it("has a monotonic level curve", () => {
    for (let l = 1; l < 100; l++) {
      expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
    }
  });

  it("maps xp back to the correct level", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(xpForLevel(10))).toBe(10);
    expect(levelForXp(xpForLevel(10) - 1)).toBe(9);
  });

  it("awards xp and unlocks achievements", () => {
    const xp = awardXp({
      tasksCompleted: 3,
      habitsCompleted: 2,
      deepWorkSessions: 1,
      estimatesBeaten: 1,
      streakDay: true,
    });
    expect(xp).toBeGreaterThan(0);
    const state = buildGamificationState(xp, 7, {
      totalTasksCompleted: 3,
      deepWorkSessions: 1,
    });
    expect(state.achievements.find((a) => a.id === "first-deep-work")!.unlocked).toBe(true);
    expect(state.achievements.find((a) => a.id === "streak-7")!.unlocked).toBe(true);
  });
});

describe("life score", () => {
  it("scores a fully completed day near the top", () => {
    const tasks = [task({ id: "a", completed: true }), task({ id: "b", completed: true })];
    const habits = [
      { id: "h1", title: "Exercise", durationMin: 30, preferred: "morning" as const, energy: "high" as const, completed: true },
      { id: "h2", title: "Read", durationMin: 20, preferred: "evening" as const, energy: "low" as const, completed: true },
    ];
    const schedule = buildSchedule("2026-06-01", tasks, habits, [], baseConfig());
    const score = computeLifeScore({ tasks, habits, schedule, streak: 10, deepWorkMin: 180 });
    expect(score.overall).toBeGreaterThan(80);
    expect(score.fitness).toBe(100);
  });
});
