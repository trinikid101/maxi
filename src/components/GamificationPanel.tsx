"use client";
import { useDay } from "@/lib/useDay";
import { Card, CardBody, CardHeader } from "./ui/card";
import { Progress } from "./ui/misc";
import { Trophy, Flame, Lock } from "lucide-react";

export function GamificationPanel() {
  const { game } = useDay();
  const pct = Math.round((game.levelXp / game.nextLevelXp) * 100);

  return (
    <Card>
      <CardHeader
        icon={<Trophy size={18} />}
        title="Progress & XP"
        subtitle={`Level ${game.level} · ${game.xp} XP`}
        action={
          <span className="inline-flex items-center gap-1 rounded-full bg-rest/15 px-2.5 py-1 text-xs font-semibold text-rest">
            <Flame size={13} /> {game.streak}d
          </span>
        }
      />
      <CardBody className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted">
            <span>Level {game.level}</span>
            <span className="tabular-nums">
              {game.levelXp}/{game.nextLevelXp} XP → Lv {Math.min(100, game.level + 1)}
            </span>
          </div>
          <Progress value={pct} barClassName="bg-gradient-to-r from-deep to-focus" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {game.achievements.map((a) => (
            <div
              key={a.id}
              title={a.description}
              className={`flex items-center gap-2 rounded-xl border p-2 text-[11px] ${
                a.unlocked
                  ? "border-accent/40 bg-accent/10 text-fg"
                  : "border-border bg-surface-2/40 text-muted"
              }`}
            >
              {a.unlocked ? <Trophy size={14} className="text-accent" /> : <Lock size={14} />}
              <span className="truncate font-medium">{a.title}</span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
