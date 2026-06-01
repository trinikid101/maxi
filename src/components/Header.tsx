"use client";
import { useDay } from "@/lib/useDay";
import { useStore } from "@/lib/store";
import { fmtTime } from "@/lib/utils";
import { Button } from "./ui/button";
import { Sparkles, RotateCcw } from "lucide-react";

export function Header() {
  const { schedule, state } = useDay();
  const setNow = useStore((s) => s.setNow);
  const reset = useStore((s) => s.reset);

  const loadColor =
    schedule.loadScore >= 85 ? "text-warn" : schedule.loadScore >= 60 ? "text-rest" : "text-admin";

  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-deep to-focus text-white shadow-lg">
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Life OS AI</h1>
          <p className="text-xs text-muted">Your day, engineered. Not just stored.</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted">Day load</div>
          <div className={`text-lg font-bold tabular-nums ${loadColor}`}>{schedule.loadScore}/100</div>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-muted">Now</span>
          <input
            type="range"
            min={state.work.start}
            max={state.work.end}
            step={15}
            value={state.now}
            onChange={(e) => setNow(Number(e.target.value))}
            className="w-24 accent-[hsl(var(--accent))] sm:w-32"
          />
          <span className="w-16 text-xs tabular-nums text-fg/80">{fmtTime(state.now)}</span>
        </label>
        <Button variant="ghost" size="icon" onClick={reset} title="Reset demo data">
          <RotateCcw size={16} />
        </Button>
      </div>
    </header>
  );
}
