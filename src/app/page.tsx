"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { WhatNow } from "@/components/WhatNow";
import { ScheduleTimeline } from "@/components/ScheduleTimeline";
import { TaskPanel } from "@/components/TaskPanel";
import { EnergyPanel } from "@/components/EnergyPanel";
import { LifeScorePanel } from "@/components/LifeScorePanel";
import { GamificationPanel } from "@/components/GamificationPanel";
import { HabitPanel } from "@/components/HabitPanel";
import { CoachPanel } from "@/components/CoachPanel";
import { FocusMode } from "@/components/FocusMode";

export default function Home() {
  // Avoid hydration mismatch: the store rehydrates from localStorage on mount.
  const [mounted, setMounted] = useState(false);
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <main className="grid min-h-screen place-items-center text-muted">
        <div className="animate-pulse text-sm">Engineering your day…</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <Header />
      <WhatNow onFocus={setFocusTaskId} />

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Calendar-first centerpiece */}
        <div className="lg:col-span-5">
          <ScheduleTimeline onFocus={setFocusTaskId} />
        </div>

        {/* Working column */}
        <div className="space-y-5 lg:col-span-4">
          <TaskPanel onFocus={setFocusTaskId} />
          <HabitPanel />
          <EnergyPanel />
        </div>

        {/* Insight column */}
        <div className="space-y-5 lg:col-span-3">
          <CoachPanel />
          <LifeScorePanel />
          <GamificationPanel />
        </div>
      </div>

      <footer className="mt-10 border-t border-border pt-5 text-center text-xs text-muted">
        Life OS AI · deterministic scheduling engine (20+ methodologies) · runs offline ·
        OpenAI coach optional
      </footer>

      {focusTaskId && <FocusMode taskId={focusTaskId} onClose={() => setFocusTaskId(null)} />}
    </main>
  );
}
