import type { LifeScore } from "./lifescore";
import { QUADRANT_LABEL } from "./scoring";
import type { Minutes, Schedule, TimeBlock } from "./types";

export interface CoachContext {
  schedule: Schedule;
  lifeScore: LifeScore;
  now: Minutes;
  streak: number;
}

const fmt = (m: Minutes) => {
  const h = Math.floor(m / 60) % 24;
  const min = Math.round(m % 60);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(min).padStart(2, "0")} ${ampm}`;
};

/** The single most useful answer to "what should I be doing right now?". */
export function whatNow(schedule: Schedule, now: Minutes): TimeBlock | null {
  const active = schedule.blocks.find((b) => b.start <= now && now < b.end);
  if (active) return active;
  return (
    schedule.blocks
      .filter((b) => b.start >= now && b.kind !== "break")
      .sort((a, b) => a.start - b.start)[0] ?? null
  );
}

/**
 * Deterministic executive-coach guidance. Speaks like a high-performance coach
 * and is always available offline. When an OpenAI key is configured the API
 * route can layer a richer reply on top — this is the dependable floor.
 */
export function coachBriefing(ctx: CoachContext): string[] {
  const { schedule, lifeScore, now, streak } = ctx;
  const lines: string[] = [];
  const next = whatNow(schedule, now);

  if (next) {
    const verb = next.start <= now ? "You're in" : "Next up";
    lines.push(
      `${verb}: **${next.title}** (${fmt(next.start)}–${fmt(next.end)}). ${
        next.quadrant ? QUADRANT_LABEL[next.quadrant] + "." : ""
      } Protect this block — single task, notifications off.`,
    );
  } else {
    lines.push("Your scheduled day is complete. Close the laptop with intent — recovery is part of the work.");
  }

  if (schedule.loadScore >= 85) {
    lines.push(
      `Today is heavy (${schedule.loadScore}/100 load). I've capped deep work and protected a reset. Win the first block and let momentum carry the rest — don't try to be a hero on every line.`,
    );
  } else if (schedule.loadScore <= 35) {
    lines.push(
      `Light load today (${schedule.loadScore}/100). Consider pulling one Important/Not-Urgent task forward — this is exactly the kind of day that compounds.`,
    );
  }

  const deep = schedule.blocks.find((b) => b.kind === "deep");
  if (deep) {
    lines.push(
      `Your deep-work window is ${fmt(deep.start)}. That's your leverage hour — guard it like a meeting with your most important client.`,
    );
  }

  if (schedule.deferred.length) {
    lines.push(
      `I deferred ${schedule.deferred.length} item(s) on purpose. That's discipline, not failure — a finished realistic day beats an abandoned ambitious one.`,
    );
  }

  // Coaching from the life score's weakest dimension.
  const weakest = weakestDimension(lifeScore);
  if (weakest && lifeScore[weakest.key] < 60) {
    lines.push(weakest.nudge);
  }

  if (streak >= 3) {
    lines.push(`You're ${streak} days deep on your streak. Don't break the chain — even a minimum viable day keeps it alive.`);
  }

  return lines;
}

export interface CoachQAContext {
  loadScore: number;
  overall: number;
  emphasis: string[];
  deferred: number;
  streak: number;
  blocks: { title: string; kind: string }[];
}

/**
 * Deterministic answer to a free-form coaching question. Shared by the server
 * route (as its no-key fallback) and the client (so the coach works on a fully
 * static deployment with no backend at all).
 */
export function coachAnswer(question: string, c: CoachQAContext): string {
  const q = question.toLowerCase();
  const next =
    c.blocks.find((b) => b.kind === "deep" || b.kind === "focus") ?? c.blocks[0];

  if (q.includes("overwhelm") || q.includes("stress") || q.includes("too much")) {
    return `Breathe. Your load is ${c.loadScore}/100 — that's a signal, not a verdict. Do one thing: ${next?.title ?? "your top block"}. I've already protected recovery and deferred ${c.deferred} item(s). A finished realistic day beats an abandoned ambitious one.`;
  }
  if (q.includes("focus") || q.includes("procrastinat") || q.includes("start")) {
    return `Procrastination is a decision-fatigue problem, not a willpower one. Set a 25-minute timer and open only ${next?.title ?? "your next block"}. No tabs, no Slack. Momentum is the cure — you don't need motivation, you need a start.`;
  }
  if (q.includes("goal") || q.includes("priorit")) {
    return `Your highest-leverage move today is the first deep-work block. We're emphasizing ${c.emphasis.slice(0, 2).join(" + ")}. Protect that block like a board meeting; everything else is negotiable.`;
  }
  return `Here's the truth: your plan is sound (${c.overall}/100 life score, ${c.streak}-day streak). The only question that matters is the next 25 minutes. Start ${next?.title ?? "your top block"} now — clarity comes from motion.`;
}

function weakestDimension(
  s: LifeScore,
): { key: keyof Omit<LifeScore, "overall">; nudge: string } | null {
  const dims: { key: keyof Omit<LifeScore, "overall">; nudge: string }[] = [
    { key: "health", nudge: "Health is lagging. Hydrate, stand up, and take the recovery block seriously — energy is the input to everything else." },
    { key: "fitness", nudge: "Fitness is your soft spot. Even a 15-minute walk between blocks counts — movement is a focus multiplier." },
    { key: "learning", nudge: "Learning slipped. Stack 20 minutes of reading onto an existing habit to keep growth on the board." },
    { key: "relationships", nudge: "Relationships need a touch. Schedule one real connection today — it pays the highest long-term dividend." },
    { key: "consistency", nudge: "Consistency is the lever right now. Shrink the goal until you can't say no, then show up." },
  ];
  let worst: (typeof dims)[number] | null = null;
  let worstVal = 101;
  for (const d of dims) {
    if (s[d.key] < worstVal) {
      worstVal = s[d.key];
      worst = d;
    }
  }
  return worst;
}
