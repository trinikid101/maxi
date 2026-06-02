import { NextResponse } from "next/server";
import { coachAnswer, type CoachQAContext } from "@/lib/engine/coach";

export const runtime = "nodejs";

type CoachContext = CoachQAContext;

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

  return NextResponse.json({ answer: coachAnswer(question, context), source: "local" });
}
