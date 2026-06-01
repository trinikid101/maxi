# Maxi Taxi Madness: Trini Road King — Production Design Document

This document is the bridge between the **playable HTML5 prototype** in this
repo and the **full production mobile game**. The prototype validates that the
core loop is fun and shareable; this doc specifies everything required to ship
the definitive Trinidad & Tobago mobile hit.

---

## 1. Vision & pillars

Blend **Crazy Taxi** (pick-up/drop-off urgency) + **Subway Surfers** (snackable
runs, constant rewards) + **Hill Climb Racing** (upgrade-driven progression) +
**GTA-style humour** + **idle business mechanics**, wrapped in an authentic,
affectionate Trini atmosphere.

Five design pillars, applied to every feature:

1. **Dopamine loops** — a reward at least every 30 seconds.
2. **Progression** — always one affordable upgrade away.
3. **Humour** — emergent, screenshot-worthy chaos.
4. **Competition** — async leaderboards + weekly tournaments.
5. **Sharing** — auto-generated clips and stat cards built for TikTok.

A run is **2–5 minutes**. The session always ends with a number to beat and a
reason to tap "One more run."

---

## 2. Status legend

| Mark | Meaning |
| --- | --- |
| ✅ | Implemented in the playable prototype |
| 🔶 | Stubbed / simplified in prototype, needs production build |
| 🔲 | Production-only (not in prototype) |

---

## 3. Feature map

### Core gameplay
- ✅ Pick up → drive → drop off → earn → upgrade → unlock → repeat loop
- ✅ Short 2–3 min shifts with a fuel + timer fail state
- ✅ Auto-accelerate, manual brake, lane steering
- 🔶 Crazy-Taxi-style multi-passenger queues & combo fares
- 🔲 3D stylised driving with drift, jumps, and physics-based potholes

### The maxi (vehicle)
- ✅ Procedural maxi recreated from the reference photo (white body + band stripe)
- ✅ Red / Green / Yellow **bands** with distinct bonuses
  (accel / fuel economy / fare income)
- 🔶 Upgrade-driven handling (engine, suspension, brakes, fuel tank, horn)
- 🔲 Full customization: stripe designs, wheels, roof racks, decals, window
  tint, headlights, horn sound packs, license plates
- 🔲 Rare skins: Carnival King, Gold, Chrome, Zombie, Futuristic maxis

### Passengers
- ✅ 7 archetypes (School Child, Office Worker, Market Vendor, Tourist, Drunk
  Limer, Politician, rare Celebrity) with fares, tips, weighted spawns, quips
- 🔶 Mood system influencing tips
- 🔲 Per-passenger destinations tied to the open-world map; VIP escort missions

### Funny Trini events
- ✅ Goat crossing, Carnival road block, flash flooding, police permit check,
  soca blasting, "Driver hold on!", change arguments, maxi road rage, doubles stop
- 🔲 Branching event outcomes with player choices (pay the bribe? wait it out?)
- 🔲 Voiced one-liners in authentic Trini dialect

### World & map
- 🔶 Procedural scrolling road with roadside shops & Caribbean palette
- 🔶 City list (Port of Spain, Curepe, Chaguanas, San Fernando, Arima, Sangre
  Grande, Princes Town, Point Fortin) with cash-gated unlocks
- 🔲 Large open-world Trinidad-inspired map; each area adds roads, passengers,
  challenges, events
- 🔲 Living streets: doubles & coconut vendors, food carts, rum shops, Carnival
  decorations, street dogs, traffic jams

### Progression & economy
- ✅ Cash, XP, persistent bank, day counter
- ✅ Garage upgrades with scaling cost curve
- ✅ Idle income while away ("your maxi earned money")
- 🔲 Tickets, crates, lucky wheel, daily login & streak bonuses, Battle Pass
- 🔲 Route bonuses & area-completion rewards

### Challenges & modes
- 🔶 Hazard-driven difficulty (rain/flood, roadblocks)
- 🔲 Dedicated modes: Speed, Rush Hour, Rainstorm, Carnival, Midnight Run, Flood Mode

### Social / viral
- ✅ Viral end-of-run stats (Horn Pressed, Near Misses, Passengers Annoyed, etc.)
- ✅ Shareable hashtag stat card + PNG screenshot export
- 🔶 Replay framing (camera built for clips)
- 🔲 Auto-generated TikTok-ready replay clips; native share sheet; replay camera

### Multiplayer & live-ops
- ✅ Async leaderboard vs rival drivers (synthetic data in prototype)
- 🔲 Real backend leaderboards (Richest / Fastest / Most Passengers / Longest Route)
- 🔲 Weekly tournaments + seasonal events
- 🔲 Push notifications ("Passengers waiting in Chaguanas!")

### Audio
- ✅ WebAudio horn + pickup/reward SFX
- 🔲 Engine layers, passenger chatter, ambient city beds, licensed/original
  soca-inspired soundtrack

### Monetization (no pay-to-win)
- 🔲 Cosmetic skins, Battle Pass, optional rewarded ads, premium customization

---

## 4. Recommended production tech stack

- **Engine:** Unity (URP) — best mobile tooling, addressables, and asset
  ecosystem for a stylised 3D Caribbean look at 60 FPS on mid-range devices.
- **Backend / live-ops:** PlayFab or Nakama for leaderboards, tournaments,
  cloud save, and player accounts; remote config for live tuning of the
  economy and event tables (mirroring `js/data.js`).
- **Analytics:** GameAnalytics / Firebase for funnel, retention (D1/D7/D30),
  and economy sink/source balancing.
- **Ads & IAP:** Unity LevelPlay (mediation) for rewarded video; native store
  IAP for the Battle Pass and cosmetics.
- **Build/CI:** Unity Cloud Build → TestFlight + Google Play internal track.

The prototype's data layer (`js/data.js`) is intentionally a flat config of
bands, passengers, events, upgrades, and unlock thresholds — it maps directly
onto remote-config tables so designers can tune the live game without code.

---

## 5. Performance budget (mobile target)

- 60 FPS on mid-range hardware (e.g. Snapdragon 6-series, iPhone SE 2).
- Stylised, low-poly assets with baked lighting; GPU instancing for crowds,
  vendors, and traffic.
- Object pooling for passengers, hazards, and VFX (already mirrored by the
  prototype's spawn/cull logic).
- Offline mode + cloud save; low battery draw via capped simulation step.

---

## 6. Roadmap

1. **Phase 0 — Loop validation (this repo).** Playable web prototype proving
   the core loop, economy feel, humour, and share hooks.
2. **Phase 1 — Vertical slice (Unity).** One city (Port of Spain) in 3D, full
   pickup/drop-off loop, garage, 3 bands, 8 events, viral stat card.
3. **Phase 2 — Progression & content.** Open-world map expansion, upgrades,
   crates/wheel, daily rewards, challenge modes, skins.
4. **Phase 3 — Live-ops & social.** Backend leaderboards, weekly tournaments,
   auto-clip sharing, push notifications, Battle Pass.
5. **Phase 4 — Soft launch & tuning.** Limited-region launch, retention &
   monetization tuning via analytics + remote config.
6. **Phase 5 — Global launch.** Caribbean-first marketing push, creator
   campaign, worldwide rollout.

---

## 7. Viral secret sauce — designing for "one more run"

Every system is tuned to manufacture shareable chaos: goats that scatter when
you blow the horn, a politician passenger who triggers a roadblock, a flood
that bogs you down right before a big drop-off. The end-of-run card turns that
chaos into a brag ("📢 178 horns · 😱 43 near misses") with a built-in
challenge ("Think you could do better? 🇹🇹"). Short shifts + a guaranteed
30-second reward + an always-affordable upgrade = the compulsion loop.
