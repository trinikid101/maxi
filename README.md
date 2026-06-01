# 🚐 Maxi Taxi Madness: Trini Road King

A free-to-play arcade driving + business sim inspired by Trinidad & Tobago's
iconic maxi taxis. Pick up passengers, dodge potholes and goats, blow your
horn, bank your fares, upgrade your maxi, and climb the Road King ranks.

> **What's in this repo:** a **fully playable HTML5 prototype** of the core
> gameplay loop that runs in any browser (desktop or mobile) with **no build
> step**, plus a [production design document](DESIGN.md) that maps this
> prototype to the full Unity/Unreal mobile vision (3D, multiplayer, store
> deployment).

---

## ▶️ Play it now

No install, no tooling. Just open the game:

```bash
# Option A — double-click index.html in a file browser
# Option B — serve it locally (recommended; enables audio + screenshots)
cd maxi
python3 -m http.server 8000
# then visit http://localhost:8000
```

On a phone: serve it on your LAN and open the URL in mobile Safari/Chrome,
or "Add to Home Screen" for a fullscreen, app-like experience.

---

## 🎮 Controls

| Action | Touch (phone) | Keyboard (desktop) |
| --- | --- | --- |
| Steer | Drag the screen left/right | `A` / `D` or `←` / `→` |
| Brake | Hold **BRAKE** button | `S` or `↓` |
| Horn  | Hold **HORN** button | `Space` |
| Gas   | Automatic (manage your fuel!) | Automatic |

**Goal:** slow down beside a waving passenger to pick them up, then reach the
glowing 🏁 drop-off to bank the fare. Survive the shift, dodge hazards, and
keep an eye on your fuel.

---

## ✅ What the prototype implements (from the brief)

- **Core loop** — pick up → drive → drop off → earn → upgrade → repeat, in
  short 2–3 minute shifts.
- **The maxi, recreated** — white body with a colour **band stripe**, big
  windscreen, drawn procedurally to echo the reference photo.
- **Three bands with unique bonuses** — 🔴 Red (faster acceleration),
  🟢 Green (better fuel economy), 🟡 Yellow (more passenger income).
- **Passenger system** — School Child, Office Worker, Market Vendor, Tourist,
  Drunk Limer, Politician, and a rare Celebrity, each with fares, tips, and
  Trini one-liners.
- **Funny Trini events** — goats crossing, Carnival road blocks, flash
  flooding, police permit checks, soca blasting, maxi-vs-maxi road rage, and
  more.
- **Addictive reward cadence** — a route bonus every 30 seconds so the player
  is never far from a dopamine hit.
- **Upgrade system / garage** — Engine, Suspension, Brakes, Horn, and Fuel
  Tank, with a scaling cost curve and persistent levels.
- **Viral results screen** — "Horn Pressed: 178", "Near Misses: 43",
  "Passengers Annoyed: 12", a shareable hashtag card, and PNG screenshot
  export.
- **Async multiplayer leaderboard** — your best score ranked against rival
  drivers.
- **Idle income** — your maxi empire earns cash while you're away.
- **Persistence** — bank, day, band choice, and upgrades saved via
  `localStorage` (the stand-in for cloud save).
- **Mobile-first + 60 FPS** — `requestAnimationFrame` loop, DPR-aware canvas,
  touch controls, safe-area insets, WebAudio horn/ding SFX.

See [DESIGN.md](DESIGN.md) for the full feature map, including everything that
belongs in the production 3D build (open-world map, Battle Pass, rare skins
like the Carnival King / Gold / Chrome / Zombie maxis, tournaments, push
notifications, etc.).

---

## 🗂️ Project structure

```
index.html        # markup: canvas, HUD, menus, results
css/style.css     # Caribbean-palette, mobile-first styling
js/data.js        # config: bands, passengers, events, cities, upgrades, save/load
js/entities.js    # the Maxi, passengers, drop-offs, hazards (canvas drawing)
js/ui.js          # screen routing, HUD, garage, leaderboard, viral cards
js/game.js        # engine: loop, input, spawning, collisions, run lifecycle
DESIGN.md         # production design doc (full mobile vision + roadmap)
```

Pure vanilla JS + Canvas 2D — zero dependencies, zero build. This keeps the
prototype instantly runnable and easy to iterate on while validating that the
loop is *fun* before committing to a heavy 3D engine pipeline.

---

## 🛣️ From prototype to store-ready

This web build is the **playable design spec**. The next milestone is porting
the validated loop into Unity (recommended for mobile) with 3D stylised
assets, the open-world Trinidad map, live-ops backend (leaderboards,
tournaments, cloud save), and store builds for iOS + Android. The full plan,
including tech stack and a phased roadmap, lives in [DESIGN.md](DESIGN.md).

🇹🇹 *"One more run."*
