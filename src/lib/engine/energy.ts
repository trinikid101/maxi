import type { EnergyLevel, EnergyProfile, Minutes } from "./types";

const LEVEL_VALUE: Record<EnergyLevel, number> = {
  low: 0.35,
  medium: 0.65,
  high: 1,
};

/**
 * Build a smooth 24-hour energy curve from three coarse self-reports plus a
 * circadian baseline. The baseline encodes the well-documented pattern: a
 * morning rise, an early-afternoon post-lunch dip, a secondary evening peak,
 * and a night-time trough. User reports modulate the relevant windows.
 */
export function buildEnergyCurve(
  morning: EnergyLevel,
  afternoon: EnergyLevel,
  evening: EnergyLevel,
): number[] {
  const m = LEVEL_VALUE[morning];
  const a = LEVEL_VALUE[afternoon];
  const e = LEVEL_VALUE[evening];

  return Array.from({ length: 24 }, (_, h) => {
    // Circadian baseline 0..1.
    let base: number;
    if (h < 6) base = 0.15; // deep night
    else if (h < 12) base = 0.55 + 0.4 * Math.sin(((h - 6) / 6) * Math.PI * 0.5); // morning rise
    else if (h < 15) base = 0.7 - 0.25 * Math.sin(((h - 12) / 3) * Math.PI); // post-lunch dip
    else if (h < 20) base = 0.6 + 0.2 * Math.sin(((h - 15) / 5) * Math.PI); // evening peak
    else base = Math.max(0.1, 0.45 - (h - 20) * 0.09); // wind-down

    // Weight self-report into the matching window.
    let report = a;
    if (h < 12) report = m;
    else if (h >= 18) report = e;

    return round2(Math.max(0, Math.min(1, base * 0.45 + report * 0.55)));
  });
}

export function makeEnergyProfile(
  morning: EnergyLevel,
  afternoon: EnergyLevel,
  evening: EnergyLevel,
): EnergyProfile {
  return {
    morning,
    afternoon,
    evening,
    curve: buildEnergyCurve(morning, afternoon, evening),
  };
}

/** Average energy available across a [start, end) minute window. */
export function energyForWindow(
  profile: EnergyProfile,
  start: Minutes,
  end: Minutes,
): number {
  if (end <= start) return profile.curve[Math.floor(start / 60) % 24] ?? 0.5;
  let total = 0;
  let count = 0;
  for (let m = start; m < end; m += 15) {
    total += profile.curve[Math.floor(m / 60) % 24] ?? 0.5;
    count++;
  }
  return count ? total / count : 0.5;
}

/**
 * How well a task's energy demand (0..1) matches the energy available in a
 * window (0..1). Demanding tasks in low-energy windows score poorly; easy tasks
 * are fine anywhere. Returns 0..1.
 */
export function energyMatch(demand: number, available: number): number {
  if (available >= demand) return 1 - (available - demand) * 0.15; // slight waste penalty
  // Penalize placing a heavy task where energy is short.
  return Math.max(0, 1 - (demand - available) * 1.4);
}

const round2 = (n: number) => Math.round(n * 100) / 100;
