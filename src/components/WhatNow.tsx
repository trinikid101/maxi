"use client";
import { useDay } from "@/lib/useDay";
import { useStore } from "@/lib/store";
import { fmtTime } from "@/lib/utils";
import { BLOCK_META } from "./blockStyles";
import { Button } from "./ui/button";
import { Compass, Play, Check, SkipForward, AlertTriangle } from "lucide-react";

export function WhatNow({ onFocus }: { onFocus: (taskId: string) => void }) {
  const { current, state } = useDay();
  const toggleTask = useStore((s) => s.toggleTask);
  const setNow = useStore((s) => s.setNow);

  const meta = current ? BLOCK_META[current.kind] : null;
  const isActive = current ? current.start <= state.now && state.now < current.end : false;

  // "Skip" simulates moving the clock to the end of the current block, which
  // triggers the engine to re-flow the remaining day around the new time.
  const skip = () => current && setNow(Math.min(state.work.end, current.end));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 via-surface to-surface p-5">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent">
        <Compass size={14} /> What should I do right now?
      </div>

      {current ? (
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              {meta && <span className={`h-2 w-2 rounded-full ${meta.dot}`} />}
              <h2 className="text-2xl font-bold tracking-tight">{current.title}</h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              {isActive ? "In progress now" : "Up next"} · {fmtTime(current.start)}–{fmtTime(current.end)}
              {meta ? ` · ${meta.label}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {current.refId && state.tasks.some((t) => t.id === current.refId) && (
              <>
                <Button size="sm" onClick={() => onFocus(current.refId!)}>
                  <Play size={14} /> Focus
                </Button>
                <Button size="sm" variant="outline" onClick={() => toggleTask(current.refId!)}>
                  <Check size={14} /> Done
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={skip}>
              <SkipForward size={14} /> Skip / advance
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-lg font-medium">Your day is complete. Rest is productive too. ✨</p>
      )}

      <OverwhelmButton />
    </div>
  );
}

function OverwhelmButton() {
  const { state } = useDay();
  const setAntiOverwhelm = useStore((s) => s.setAntiOverwhelm);
  const removeTask = useStore((s) => s.removeTask);
  const tasks = state.tasks;

  // Mirrors the engine's "overwhelmed" replan: tighten deep-work + shed the
  // lowest-value third so the rest of the day re-flows lighter.
  const simplify = () => {
    setAntiOverwhelm({
      maxDeepWorkMin: Math.round(state.antiOverwhelm.maxDeepWorkMin * 0.6),
      protectRecovery: true,
    });
    const active = tasks.filter((t) => !t.completed);
    const ranked = [...active].sort((a, b) => a.importance * a.reward - b.importance * b.reward);
    ranked.slice(0, Math.ceil(ranked.length / 3)).forEach((t) => removeTask(t.id));
  };

  return (
    <button
      onClick={simplify}
      className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-warn/40 bg-warn/10 px-3 py-1.5 text-xs font-medium text-warn/90 transition hover:bg-warn/20"
    >
      <AlertTriangle size={13} /> I'm overwhelmed — simplify my day
    </button>
  );
}
