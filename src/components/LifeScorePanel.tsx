"use client";
import { useDay } from "@/lib/useDay";
import { Card, CardBody, CardHeader } from "./ui/card";
import { Ring, Progress } from "./ui/misc";
import { Activity } from "lucide-react";

const DIMS: { key: keyof ReturnType<typeof useDay>["lifeScore"]; label: string }[] = [
  { key: "productivity", label: "Productivity" },
  { key: "habits", label: "Habits" },
  { key: "consistency", label: "Consistency" },
  { key: "goals", label: "Goal progress" },
  { key: "health", label: "Health" },
  { key: "fitness", label: "Fitness" },
  { key: "learning", label: "Learning" },
  { key: "relationships", label: "Relationships" },
];

export function LifeScorePanel() {
  const { lifeScore } = useDay();
  return (
    <Card>
      <CardHeader icon={<Activity size={18} />} title="Life Score" subtitle="Daily · across every dimension" />
      <CardBody className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <Ring value={lifeScore.overall} label={lifeScore.overall} sublabel="overall" />
        </div>
        <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2">
          {DIMS.map((d) => (
            <div key={d.key}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">{d.label}</span>
                <span className="tabular-nums text-fg/80">{lifeScore[d.key]}</span>
              </div>
              <Progress value={lifeScore[d.key] as number} className="mt-1 h-1.5" />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
