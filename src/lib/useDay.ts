"use client";
import { useMemo } from "react";
import {
  buildGamificationState,
  buildSchedule,
  coachBriefing,
  computeLifeScore,
  whatNow,
} from "./engine";
import { configFromState, useStore } from "./store";

const today = () => new Date().toISOString().slice(0, 10);

/** Single source of truth for everything the dashboard renders. */
export function useDay() {
  const s = useStore();

  const schedule = useMemo(
    () => buildSchedule(today(), s.tasks, s.habits, s.events, configFromState(s)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.tasks, s.habits, s.events, s.goals, s.work, s.energy, s.antiOverwhelm, s.now, s.seed],
  );

  const deepWorkMin = useMemo(
    () =>
      s.tasks
        .filter((t) => t.completed && t.focus >= 4 && t.difficulty >= 3)
        .reduce((sum, t) => sum + t.durationMin, 0),
    [s.tasks],
  );

  const lifeScore = useMemo(
    () => computeLifeScore({ tasks: s.tasks, habits: s.habits, schedule, streak: s.streak, deepWorkMin }),
    [s.tasks, s.habits, schedule, s.streak, deepWorkMin],
  );

  const game = useMemo(
    () =>
      buildGamificationState(s.xp, s.streak, {
        totalTasksCompleted: s.totalTasksCompleted,
        deepWorkSessions: s.deepWorkSessions,
      }),
    [s.xp, s.streak, s.totalTasksCompleted, s.deepWorkSessions],
  );

  const briefing = useMemo(
    () => coachBriefing({ schedule, lifeScore, now: s.now, streak: s.streak }),
    [schedule, lifeScore, s.now, s.streak],
  );

  const current = useMemo(() => whatNow(schedule, s.now), [schedule, s.now]);

  return { state: s, schedule, lifeScore, game, briefing, current, deepWorkMin };
}
