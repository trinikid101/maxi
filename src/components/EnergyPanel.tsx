"use client";
import { useStore } from "@/lib/store";
import { makeEnergyProfile, type EnergyLevel } from "@/lib/engine";
import { Card, CardBody, CardHeader } from "./ui/card";
import { BatteryCharging } from "lucide-react";

const LEVELS: EnergyLevel[] = ["low", "medium", "high"];

function Picker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: EnergyLevel;
  onChange: (v: EnergyLevel) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] text-muted">{label}</div>
      <div className="flex gap-1">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => onChange(l)}
            className={`flex-1 rounded-lg border px-1 py-1 text-[11px] capitalize transition ${
              value === l ? "border-accent bg-accent/15 text-fg" : "border-border text-muted hover:bg-surface-2"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EnergyPanel() {
  const energy = useStore((s) => s.energy);
  const setEnergy = useStore((s) => s.setEnergy);
  const work = useStore((s) => s.work);

  const profile = makeEnergyProfile(energy.morning, energy.afternoon, energy.evening);
  const startH = Math.floor(work.start / 60);
  const endH = Math.ceil(work.end / 60);
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i);

  return (
    <Card>
      <CardHeader
        icon={<BatteryCharging size={18} />}
        title="Energy engine"
        subtitle="Tasks are matched to your energy, not just your clock"
      />
      <CardBody className="space-y-4">
        <div className="flex items-end gap-1.5" style={{ height: 72 }}>
          {hours.map((h) => {
            const v = profile.curve[h % 24];
            return (
              <div key={h} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-accent/40 to-accent"
                    style={{ height: `${Math.max(6, v * 100)}%` }}
                    title={`${Math.round(v * 100)}% energy`}
                  />
                </div>
                <span className="text-[8px] tabular-nums text-muted">{h}</span>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Picker label="Morning" value={energy.morning} onChange={(v) => setEnergy({ morning: v })} />
          <Picker label="Afternoon" value={energy.afternoon} onChange={(v) => setEnergy({ afternoon: v })} />
          <Picker label="Evening" value={energy.evening} onChange={(v) => setEnergy({ evening: v })} />
        </div>
      </CardBody>
    </Card>
  );
}
