"use client";
import { useState } from "react";
import { useDay } from "@/lib/useDay";
import { Card, CardBody, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Brain, Send, Loader2 } from "lucide-react";

function render(text: string) {
  // minimal **bold** rendering
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="text-fg">{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export function CoachPanel() {
  const { briefing, schedule, lifeScore, state } = useDay();
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: q,
          context: {
            loadScore: schedule.loadScore,
            overall: lifeScore.overall,
            emphasis: schedule.emphasis,
            deferred: schedule.deferred.length,
            streak: state.streak,
            blocks: schedule.blocks.map((b) => ({ title: b.title, kind: b.kind })),
          },
        }),
      });
      const data = await res.json();
      setAnswer(data.answer);
    } catch {
      setAnswer("I'm offline right now, but the briefing above is your plan. Win the next block.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader
        icon={<Brain size={18} />}
        title="AI Productivity Coach"
        subtitle="Your executive coach — always on"
      />
      <CardBody className="space-y-3">
        <ul className="space-y-2">
          {briefing.map((line, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-fg/85">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
              <span>{render(line)}</span>
            </li>
          ))}
        </ul>

        {answer && (
          <div className="animate-fade-in rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm leading-relaxed text-fg/90">
            {render(answer)}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Ask your coach anything…"
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <Button size="icon" onClick={ask} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
