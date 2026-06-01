"use client";
import { useStore } from "@/lib/store";
import { fmtDuration } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "./ui/card";
import { Repeat, Check } from "lucide-react";

export function HabitPanel() {
  const habits = useStore((s) => s.habits);
  const toggleHabit = useStore((s) => s.toggleHabit);
  const done = habits.filter((h) => h.completed).length;

  return (
    <Card>
      <CardHeader
        icon={<Repeat size={18} />}
        title="Habits"
        subtitle="Auto-placed & habit-stacked into your day"
        action={
          <span className="text-xs tabular-nums text-muted">
            {done}/{habits.length}
          </span>
        }
      />
      <CardBody className="space-y-1.5">
        {habits.map((h) => (
          <button
            key={h.id}
            onClick={() => toggleHabit(h.id)}
            className={`flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2/30 p-2.5 text-left transition hover:brightness-110 ${h.completed ? "opacity-50" : ""}`}
          >
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${h.completed ? "border-habit bg-habit/30 text-habit" : "border-border"}`}
            >
              {h.completed && <Check size={12} />}
            </span>
            <span className={`flex-1 text-sm font-medium ${h.completed ? "line-through" : ""}`}>
              {h.title}
            </span>
            <span className="text-[10px] capitalize text-muted">
              {h.preferred} · {fmtDuration(h.durationMin)}
            </span>
          </button>
        ))}
      </CardBody>
    </Card>
  );
}
