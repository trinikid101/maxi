import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface CoachContext {
  loadScore: number;
  overall: number;
  emphasis: string[];
  deferred: number;
  streak: number;
  blocks: { title: string; kind: string }[];
}

const SYSTEM = `You are the Life OS AI productivity coach: an elite executive coach,
chief of staff, and performance strategist. You are direct, warm, and tactical.
Keep replies under 90 words. Reference the user's actual day. Prioritize one clear
next action over generic advice. Never moralize about productivity — protect the
human, not just the output.`;

/**
 * Optional OpenAI-backed coaching. When OPENAI_API_KEY is set we get a richer,
 * context-aware reply; otherwise we fall back to a dependable deterministic
 * answer so the feature always works offline.
 */
export async function POST(req: Request) {
  const { question, context } = (await req.json()) as {
    question: string;
    context: CoachContext;
  };

  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          temperature: 0.6,
          messages: [
            { role: "system", content: SYSTEM },
            {
              role: "user",
              content: `My day right now:\n${JSON.stringify(context, null, 2)}\n\nQuestion: ${question}`,
            },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const answer = data.choices?.[0]?.message?.content?.trim();
        if (answer) return NextResponse.json({ answer, source: "openai" });
      }
    } catch {
      // fall through to deterministic
    }
  }

  return NextResponse.json({ answer: fallback(question, context), source: "local" });
}

function fallback(question: string, c: CoachContext): string {
  const q = question.toLowerCase();
  const next = c.blocks.find((b) => b.kind === "deep" || b.kind === "focus") ?? c.blocks[0];

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
