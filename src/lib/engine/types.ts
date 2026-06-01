// ---------------------------------------------------------------------------
// Life OS AI — core domain types
// These types are framework-agnostic and drive the scheduling engine.
// ---------------------------------------------------------------------------

/** Minutes since midnight, 0..1440. The engine works in this unit throughout. */
export type Minutes = number;

export type EnergyLevel = "low" | "medium" | "high";

/** The three Eisenhower-relevant dimensions a user supplies per task. */
export interface TaskInput {
  id: string;
  title: string;
  /** Estimated duration in minutes. */
  durationMin: Minutes;
  /** User-declared importance 1..5 (5 = mission critical). */
  importance: number;
  /** Deadline as an absolute timestamp (ms). Optional — undeadlined tasks decay slowly. */
  deadline?: number;
  /** Cognitive difficulty 1..5. */
  difficulty: number;
  /** How much focus the task demands 1..5. */
  focus: number;
  /** Expected stress 1..5 (used by anti-overwhelm + recovery placement). */
  stress: number;
  /** Anticipated reward/satisfaction 1..5 (fuels motivation ordering). */
  reward: number;
  /** Task ids that must be done before this one. */
  dependsOn?: string[];
  /** Optional category for batching (e.g. "email", "writing"). */
  category?: string;
  /** Hard-pinned start (e.g. an externally fixed task). */
  fixedStart?: Minutes;
  /** Linked goal id, used for goal-alignment scoring. */
  goalId?: string;
  completed?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  /** 1..5 strategic weight. */
  weight: number;
}

export interface Habit {
  id: string;
  title: string;
  durationMin: Minutes;
  /** Preferred part of day; the engine stacks onto adjacent anchors when possible. */
  preferred: "morning" | "midday" | "evening" | "any";
  /** Habit to stack right after (habit stacking). */
  stackAfterId?: string;
  energy: EnergyLevel;
  completed?: boolean;
}

/** A fixed commitment imported from a calendar — the engine schedules around these. */
export interface CalendarEvent {
  id: string;
  title: string;
  start: Minutes;
  end: Minutes;
}

/** Hour-by-hour energy the user reports (or the model learns). 0..1 per hour. */
export interface EnergyProfile {
  /** 24 values, one per hour, normalized 0..1. */
  curve: number[];
  morning: EnergyLevel;
  afternoon: EnergyLevel;
  evening: EnergyLevel;
}

export interface WorkWindow {
  start: Minutes;
  end: Minutes;
}

export interface AntiOverwhelmConfig {
  /** Max total deep-work minutes allowed in a day. */
  maxDeepWorkMin: Minutes;
  /** Minutes of break inserted after this many continuous focus minutes. */
  focusBeforeBreakMin: Minutes;
  breakMin: Minutes;
  /** Buffer inserted between heavy context switches. */
  bufferMin: Minutes;
  /** If true, the engine will defer lowest-value work rather than overpack. */
  protectRecovery: boolean;
}

export interface SchedulerConfig {
  work: WorkWindow;
  energy: EnergyProfile;
  antiOverwhelm: AntiOverwhelmConfig;
  goals: Goal[];
  /** Current time of day in minutes — replanning only touches the future. */
  now?: Minutes;
}

export type Methodology =
  | "deep-work"
  | "time-blocking"
  | "batching"
  | "pomodoro"
  | "eisenhower"
  | "energy-management"
  | "recovery"
  | "parkinson";

export type BlockKind =
  | "deep"
  | "focus"
  | "admin"
  | "break"
  | "buffer"
  | "habit"
  | "event"
  | "recovery";

export interface TimeBlock {
  id: string;
  kind: BlockKind;
  title: string;
  start: Minutes;
  end: Minutes;
  /** Source task / habit / event id when applicable. */
  refId?: string;
  /** Human-readable reason the engine placed this here. */
  rationale: string;
  /** Eisenhower quadrant for task-backed blocks. */
  quadrant?: EisenhowerQuadrant;
  energyMatch?: number; // 0..1, how well energy fit the demand
}

export type EisenhowerQuadrant = "do" | "schedule" | "delegate" | "eliminate";

/** Full per-task analysis produced before scheduling. */
export interface TaskAnalysis {
  taskId: string;
  priorityScore: number; // 0..100
  urgencyScore: number; // 0..100
  difficultyScore: number; // 0..100
  energyScore: number; // 0..100 — how much energy required
  focusScore: number; // 0..100
  stressScore: number; // 0..100
  rewardScore: number; // 0..100
  /** Final composite used to order execution. */
  executionScore: number; // 0..100
  quadrant: EisenhowerQuadrant;
}

export interface Schedule {
  date: string; // ISO date
  blocks: TimeBlock[];
  analyses: TaskAnalysis[];
  /** Tasks the engine could not fit and deliberately deferred. */
  deferred: { taskId: string; reason: string }[];
  /** Methodologies the engine emphasized for this particular day. */
  emphasis: Methodology[];
  /** 0..100 — how loaded the day is. Drives the anti-overwhelm UI. */
  loadScore: number;
  notes: string[];
}
