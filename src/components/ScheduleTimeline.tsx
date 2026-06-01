"use client";
import { useDay } from "@/lib/useDay";
import { useStore } from "@/lib/store";
import { fmtDuration, fmtTime } from "@/lib/utils";
import { BLOCK_META } from "./blockStyles";
import { Card, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/misc";
import { CalendarRange, Sparkles, Check, Clock } from "lucide-react";

const PX_PER_MIN = 1.05;

export function ScheduleTimeline({ onFocus }: { onFocus: (taskId: string) => void }) {
  const { schedule, state } = useDay();
  const toggleTask = useStore((s) => s.toggleTask);
  const reoptimize = useStore((s) => s.reoptimize);

  const start = state.work.start;
  const end = state.work.end;
  const totalMin = end - start;
  const height = totalMin * PX_PER_MIN;
  const nowTop = (state.now - start) * PX_PER_MIN;
  const hourLines = [];
  for (let h = Math.ceil(start / 60); h <= Math.floor(end / 60); h++) {
    hourLines.push(h * 60);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        icon={<CalendarRange size={18} />}
        title="Today's engineered schedule"
        subtitle={`${schedule.blocks.filter((b) => b.refId && b.kind !== "event").length} blocks · ${fmtTime(start)}–${fmtTime(end)}`}
        action={
          <Button size="sm" variant="subtle" onClick={reoptimize}>
            <Sparkles size={14} /> Re-optimize
          </Button>
        }
      />
      <div className="flex flex-wrap gap-1.5 px-5 pb-3">
        {schedule.emphasis.slice(0, 5).map((m) => (
          <Badge key={m}>{m.replace("-", " ")}</Badge>
        ))}
      </div>

      <div className="relative px-5 pb-5">
        <div className="relative" style={{ height }}>
          {/* hour gridlines */}
          {hourLines.map((m) => (
            <div
              key={m}
              className="absolute left-12 right-0 border-t border-border/50"
              style={{ top: (m - start) * PX_PER_MIN }}
            >
              <span className="absolute -top-2 -left-12 text-[10px] tabular-nums text-muted">
                {fmtTime(m)}
              </span>
            </div>
          ))}

          {/* now indicator */}
          {state.now >= start && state.now <= end && (
            <div className="absolute left-12 right-0 z-20" style={{ top: nowTop }}>
              <div className="relative -top-px h-px bg-accent">
                <span className="absolute -left-12 -top-2 rounded bg-accent px-1 text-[10px] font-semibold text-accent-fg">
                  now
                </span>
              </div>
            </div>
          )}

          {/* blocks */}
          {schedule.blocks.map((b) => {
            const meta = BLOCK_META[b.kind];
            const top = (b.start - start) * PX_PER_MIN;
            const h = Math.max(22, (b.end - b.start) * PX_PER_MIN - 3);
            const task = state.tasks.find((t) => t.id === b.refId);
            const tiny = h < 40;
            return (
              <div
                key={b.id}
                className={`group absolute left-12 right-0 rounded-xl border p-2 pl-3 transition-all hover:z-10 hover:brightness-110 ${meta.color}`}
                style={{ top, height: h }}
                title={b.rationale}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
                      <span
                        className={`truncate text-xs font-semibold ${task?.completed ? "text-muted line-through" : ""}`}
                      >
                        {b.title}
                      </span>
                    </div>
                    {!tiny && (
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted">
                        <span className="tabular-nums">
                          {fmtTime(b.start)} · {fmtDuration(b.end - b.start)}
                        </span>
                        <span className={`uppercase tracking-wide ${meta.ring}`}>{meta.label}</span>
                      </div>
                    )}
                  </div>
                  {task && (
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                      <button
                        onClick={() => onFocus(task.id)}
                        className="rounded-md bg-surface px-1.5 py-1 text-[10px] hover:bg-surface-2"
                        title="Enter focus mode"
                      >
                        <Clock size={12} />
                      </button>
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`rounded-md px-1.5 py-1 text-[10px] ${task.completed ? "bg-admin/30" : "bg-surface hover:bg-surface-2"}`}
                        title="Mark complete"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
