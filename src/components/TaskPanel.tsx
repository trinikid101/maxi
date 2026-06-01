"use client";
import { useState } from "react";
import { useDay } from "@/lib/useDay";
import { useStore } from "@/lib/store";
import { QUADRANT_LABEL, type EisenhowerQuadrant } from "@/lib/engine";
import { fmtDuration } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/misc";
import { ListChecks, Plus, Trash2, Check } from "lucide-react";

const QUAD_COLOR: Record<EisenhowerQuadrant, string> = {
  do: "text-warn",
  schedule: "text-focus",
  delegate: "text-rest",
  eliminate: "text-muted",
};

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="w-16 text-muted">{label}</span>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 flex-1 accent-[hsl(var(--accent))]"
      />
      <span className="w-3 tabular-nums text-fg/80">{value}</span>
    </label>
  );
}

export function TaskPanel({ onFocus }: { onFocus: (taskId: string) => void }) {
  const { schedule, state } = useDay();
  const addTask = useStore((s) => s.addTask);
  const removeTask = useStore((s) => s.removeTask);
  const toggleTask = useStore((s) => s.toggleTask);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(60);
  const [importance, setImportance] = useState(3);
  const [difficulty, setDifficulty] = useState(3);
  const [focus, setFocus] = useState(3);
  const [stress, setStress] = useState(2);
  const [reward, setReward] = useState(3);

  const analysisFor = (id: string) => schedule.analyses.find((a) => a.taskId === id);

  const submit = () => {
    if (!title.trim()) return;
    addTask({ title: title.trim(), durationMin: duration, importance, difficulty, focus, stress, reward });
    setTitle("");
    setOpen(false);
  };

  const sorted = [...state.tasks].sort((a, b) => {
    if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1;
    return (analysisFor(b.id)?.executionScore ?? 0) - (analysisFor(a.id)?.executionScore ?? 0);
  });

  return (
    <Card>
      <CardHeader
        icon={<ListChecks size={18} />}
        title="Tasks"
        subtitle="Ranked by AI execution score"
        action={
          <Button size="sm" variant="subtle" onClick={() => setOpen((v) => !v)}>
            <Plus size={14} /> Add
          </Button>
        }
      />
      <CardBody className="space-y-2">
        {open && (
          <div className="animate-fade-in space-y-3 rounded-xl border border-border bg-surface-2/40 p-3">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="What needs doing?"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <label className="flex items-center justify-between gap-2 text-xs">
              <span className="w-16 text-muted">Duration</span>
              <input
                type="range"
                min={15}
                max={180}
                step={15}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="h-1 flex-1 accent-[hsl(var(--accent))]"
              />
              <span className="w-12 text-right tabular-nums text-fg/80">{fmtDuration(duration)}</span>
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              <Slider label="Importance" value={importance} onChange={setImportance} />
              <Slider label="Difficulty" value={difficulty} onChange={setDifficulty} />
              <Slider label="Focus" value={focus} onChange={setFocus} />
              <Slider label="Stress" value={stress} onChange={setStress} />
              <Slider label="Reward" value={reward} onChange={setReward} />
            </div>
            <Button size="sm" className="w-full" onClick={submit}>
              Add & re-optimize
            </Button>
          </div>
        )}

        {sorted.map((t) => {
          const a = analysisFor(t.id);
          return (
            <div
              key={t.id}
              className={`group flex items-center gap-3 rounded-xl border border-border bg-surface-2/30 p-2.5 ${t.completed ? "opacity-50" : ""}`}
            >
              <button
                onClick={() => toggleTask(t.id)}
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${t.completed ? "border-admin bg-admin/30 text-admin" : "border-border hover:border-accent"}`}
              >
                {t.completed && <Check size={12} />}
              </button>
              <button onClick={() => onFocus(t.id)} className="min-w-0 flex-1 text-left">
                <div className={`truncate text-sm font-medium ${t.completed ? "line-through" : ""}`}>
                  {t.title}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
                  <span>{fmtDuration(t.durationMin)}</span>
                  {a && (
                    <span className={QUAD_COLOR[a.quadrant]} title={QUADRANT_LABEL[a.quadrant]}>
                      {a.quadrant}
                    </span>
                  )}
                  {a && <span>score {Math.round(a.executionScore)}</span>}
                </div>
              </button>
              {a && (
                <div className="hidden w-10 shrink-0 sm:block">
                  <div className="h-1 overflow-hidden rounded-full bg-surface">
                    <div className="h-full bg-accent" style={{ width: `${a.executionScore}%` }} />
                  </div>
                </div>
              )}
              <button
                onClick={() => removeTask(t.id)}
                className="shrink-0 text-muted opacity-0 transition hover:text-warn group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}

        {schedule.deferred.length > 0 && (
          <div className="mt-2 rounded-xl border border-rest/30 bg-rest/5 p-3 text-xs">
            <div className="mb-1 font-semibold text-rest">Deferred to protect your day</div>
            {schedule.deferred.map((d) => {
              const t = state.tasks.find((x) => x.id === d.taskId);
              return (
                <div key={d.taskId} className="flex items-center justify-between gap-2 text-muted">
                  <span className="truncate">{t?.title}</span>
                  <Badge>tomorrow</Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
