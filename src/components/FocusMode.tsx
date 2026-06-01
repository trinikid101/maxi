"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "./ui/button";
import { Ring } from "./ui/misc";
import { X, Play, Pause, RotateCcw, Check } from "lucide-react";

const POMODORO = 25 * 60; // seconds

export function FocusMode({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const task = useStore((s) => s.tasks.find((t) => t.id === taskId));
  const toggleTask = useStore((s) => s.toggleTask);
  const [left, setLeft] = useState(POMODORO);
  const [running, setRunning] = useState(true);
  const startedAt = useRef(Date.now());
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => {
      setLeft((l) => Math.max(0, l - 1));
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!task) return null;

  const pct = ((POMODORO - left) / POMODORO) * 100;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const done = left === 0;

  const complete = () => {
    const elapsedMin = Math.round((Date.now() - startedAt.current) / 60000) || 1;
    toggleTask(task.id, elapsedMin);
    onClose();
  };

  const encouragement = done
    ? "Pomodoro complete. You showed up. 🔥"
    : pct > 66
      ? "Final stretch — finish strong."
      : pct > 33
        ? "Deep in it now. Stay on the one thing."
        : "Locked in. Everything else can wait.";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/95 backdrop-blur-xl">
      <button
        onClick={onClose}
        className="absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-muted hover:text-fg"
      >
        <X size={18} />
      </button>

      <div className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Focus Mode</div>
      <h1 className="mt-3 max-w-2xl px-6 text-center text-3xl font-bold tracking-tight">{task.title}</h1>

      <div className="relative mt-10">
        {running && !done && (
          <span className="absolute inset-0 animate-pulse-ring rounded-full border border-accent/40" />
        )}
        <Ring value={pct} size={260} stroke={14} label={`${mm}:${ss}`} sublabel={done ? "done" : "remaining"} />
      </div>

      <p className="mt-8 text-sm text-muted">{encouragement}</p>

      <div className="mt-8 flex items-center gap-3">
        {!done && (
          <Button variant="subtle" size="md" onClick={() => setRunning((r) => !r)}>
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? "Pause" : "Resume"}
          </Button>
        )}
        <Button
          variant="outline"
          size="md"
          onClick={() => {
            setLeft(POMODORO);
            setRunning(true);
            startedAt.current = Date.now();
          }}
        >
          <RotateCcw size={16} /> Reset
        </Button>
        <Button size="md" onClick={complete}>
          <Check size={16} /> Complete task
        </Button>
      </div>
    </div>
  );
}
