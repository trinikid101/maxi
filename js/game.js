/* Maxi Taxi Madness — core engine, loop, input, and run lifecycle. */
(function () {
  const G = window.GAME;
  const UI = G.UI;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // ---------- state ----------
  let save = G.load();
  let W = 0, H = 0, DPR = 1;
  let running = false, lastT = 0;
  let cam = 0;                      // camera world-y
  let maxi = null;
  let world = { passengers: [], hazards: [], dropoff: null };
  let spawnY = 0;                   // furthest spawned forward
  let run = null;                   // per-run stats
  let input = { steer: 0, brake: false, horn: false, touchSteer: null };
  let shake = 0;
  const ROAD_HALF = 150;           // half width of drivable road in world units
  const SHIFT_LEN = 150;           // seconds per shift
  const MAXI_SCREEN = 0.80;        // maxi sits 80% down the screen (lots of road ahead)

  // ---------- audio (tiny WebAudio fx) ----------
  let actx = null;
  function audio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return actx; }
  function beep(freq, dur, type, vol) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.value = vol || 0.06;
    o.connect(g); g.connect(a.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.stop(a.currentTime + dur);
  }
  function hornSound() {
    const lvl = save.upgrades.horn || 0;
    beep(220 - lvl * 20, 0.28, 'sawtooth', 0.08);
    setTimeout(() => beep(180 - lvl * 20, 0.22, 'sawtooth', 0.07), 90);
  }

  // ---------- sizing ----------
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);

  // ---------- derived stats from upgrades + band ----------
  function maxSpeed() { return (300 + (save.upgrades.engine || 0) * 55) * maxi.band.accel; }
  function fuelMax() { return 100 + (save.upgrades.tank || 0) * 35; }
  function brakePower() { return 420 + (save.upgrades.brakes || 0) * 120; }
  function suspension() { return save.upgrades.suspension || 0; }

  // ---------- spawning ----------
  function ensureSpawned() {
    const ahead = cam + H + 400;
    while (spawnY < ahead) {
      spawnY += 120 + Math.random() * 140;
      const roll = Math.random();
      const x = (Math.random() * 2 - 1) * (ROAD_HALF - 30);
      if (roll < 0.42) {
        // passenger at roadside (just inside the edge)
        const side = Math.random() < 0.5 ? -1 : 1;
        world.passengers.push(new G.Passenger(G.pickPassenger(), side * (ROAD_HALF - 50), spawnY));
      } else if (roll < 0.92) {
        const kinds = ['pothole', 'pothole', 'goat', 'limer', 'flood', 'roadblock'];
        const kind = kinds[(Math.random() * kinds.length) | 0];
        world.hazards.push(new G.Hazard(kind, x, spawnY));
      }
    }
    // cull behind
    world.passengers = world.passengers.filter((p) => p.y > cam - 200 && !p.picked);
    world.hazards = world.hazards.filter((h) => h.y > cam - 200 && !h.dead);
  }

  // ---------- run lifecycle ----------
  function startRun() {
    maxi = new G.Maxi(G.BANDS[save.band]);
    maxi.y = 0; maxi.x = 0; maxi.speed = 0;
    cam = -H * (1 - MAXI_SCREEN); spawnY = 0;
    world = { passengers: [], hazards: [], dropoff: null };
    run = {
      money: 0, xp: 0, fuel: fuelMax(), time: SHIFT_LEN,
      delivered: 0, annoyed: 0, nearMiss: 0, horns: 0, potholes: 0, goats: 0,
      topSpeed: 0, rewardT: 0, eventT: 6 + Math.random() * 4, mood: 0,
    };
    ensureSpawned();
    running = true; lastT = performance.now();
    UI.showHud();
    UI.toast('🙋 Slow down beside a waving passenger to pick them up!');
    requestAnimationFrame(loop);
  }

  function endRun(reason) {
    running = false;
    save.bank += run.money;
    save.day += 1;
    save.best = Math.max(save.best, run.money);
    save.lastReturn = Date.now();
    G.save(save);
    const km = (run.topSpeed | 0);
    UI.results({
      title: reason === 'fuel' ? 'Out of Gas! ⛽' : 'Shift Done! 🏁',
      pay: run.money, delivered: run.delivered, annoyed: run.annoyed,
      nearMiss: run.nearMiss, horns: run.horns, potholes: run.potholes,
      goats: run.goats, topSpeed: km,
    });
    lastResult = {
      pay: run.money, horns: run.horns, nearMiss: run.nearMiss,
      annoyed: run.annoyed, goats: run.goats,
    };
  }
  let lastResult = null;

  // ---------- update ----------
  function update(dt) {
    run.time -= dt;
    if (run.time <= 0) { endRun('time'); return; }

    // steering
    const target = input.touchSteer != null ? input.touchSteer : input.steer;
    maxi.steer += (target - maxi.steer) * Math.min(1, dt * 10);
    const lateral = 230 + (save.upgrades.engine || 0) * 10;
    maxi.x += maxi.steer * lateral * dt;
    maxi.x = Math.max(-ROAD_HALF + 24, Math.min(ROAD_HALF - 24, maxi.x));

    // speed: auto-accelerate, brake input slows
    const ms = maxSpeed();
    if (input.brake) maxi.speed -= brakePower() * dt;
    else maxi.speed += (ms - maxi.speed) * Math.min(1, dt * 0.9);
    maxi.speed = Math.max(0, Math.min(ms, maxi.speed));
    maxi.y += maxi.speed * dt;
    run.topSpeed = Math.max(run.topSpeed, maxi.speed * 0.4); // ~km/h flavour

    // fuel burn (band economy + speed)
    run.fuel -= dt * (1.4 + maxi.speed / 260) * maxi.band.fuelMul;
    if (run.fuel <= 0) { run.fuel = 0; endRun('fuel'); return; }

    // camera follows — keep the maxi low so the player sees the road ahead
    cam = maxi.y - H * (1 - MAXI_SCREEN);
    ensureSpawned();

    // passenger pickup — wide, scroll-friendly zone; ease off the gas to grab them
    let nearWaver = false;
    world.passengers.forEach((p) => {
      p.update(dt);
      p._near = false;
      if (p.picked) return;
      const dx = p.x - maxi.x, dy = p.y - maxi.y;
      // generous: reachable across the lane, and a tall forward band so the
      // window doesn't fly past between frames at speed
      const inZone = Math.abs(dx) < 110 && dy < 130 && dy > -120;
      if (maxi.passenger) return;
      if (inZone) {
        p._near = true; // highlight so the player knows they're lined up
        if (maxi.speed < ms * 0.85) {
          p.picked = true; p._near = false;
          maxi.passenger = p.a;
          world.dropoff = new G.Dropoff(
            (Math.random() * 2 - 1) * (ROAD_HALF - 30),
            maxi.y + 700 + Math.random() * 700
          );
          beep(660, 0.12, 'triangle', 0.07);
          UI.fareCard(p.a, 0);
          UI.toast('🙋 ' + p.a.quip);
        } else {
          nearWaver = true; // in range but flooring it — prompt to ease off
        }
      } else if (Math.abs(dx) < 120 && dy < -120 && dy > -180 && maxi.speed > ms * 0.85) {
        // blew straight past a waving passenger too fast
        if (!p._annoyed) { p._annoyed = true; run.annoyed++; }
      }
    });
    // throttled "ease off the gas" hint
    if (nearWaver && !maxi.passenger) {
      run.hintT = (run.hintT || 0) - dt;
      if (run.hintT <= 0) { run.hintT = 2.5; UI.toast('🛑 Ease off the gas to pick them up!'); }
    }

    // dropoff
    if (world.dropoff) {
      world.dropoff.update(dt);
      const d = world.dropoff;
      if (Math.abs(d.x - maxi.x) < 50 && Math.abs(d.y - maxi.y) < 50) {
        const p = maxi.passenger;
        const dist = 1 + Math.min(2.2, (d.y) / 1400);
        const fare = Math.round((p.fare * dist + p.tip) * maxi.band.fareMul * (1 + run.mood * 0.05));
        run.money += fare; run.xp += 8 + p.fare; run.delivered++;
        UI.fareCard(p, fare);
        beep(880, 0.14, 'triangle', 0.08);
        maxi.passenger = null; world.dropoff = null;
      }
    }

    // hazards & collisions
    world.hazards.forEach((h) => {
      h.update(dt);
      const dx = h.x - maxi.x, dy = h.y - maxi.y;
      const hit = Math.abs(dx) < (h.r + 22) && Math.abs(dy) < (h.r + 40);
      if (hit && !h.dead) {
        if (h.kind === 'goat') {
          if (input.horn) { h.dead = true; run.goats++; UI.toast('🐐 Goat scatter!'); }
          else { collide(h, 0.45); UI.toast('🐐 Maxi vs goat!'); }
        } else if (h.kind === 'pothole') {
          h.dead = true; run.potholes++;
          collide(h, Math.max(0.12, 0.4 - suspension() * 0.06));
        } else if (h.kind === 'flood') {
          maxi.speed *= 0.86; // bog down
        } else if (h.kind === 'roadblock') {
          collide(h, 0.5); UI.toast('👮 Permit check!');
        } else if (h.kind === 'limer') {
          h.dead = true; collide(h, 0.2);
        }
      } else if (!h._passed && dy < -30 && dy > -90 && Math.abs(dx) < (h.r + 40) && Math.abs(dx) > (h.r + 18)) {
        h._passed = true; run.nearMiss++;
      }
    });

    // periodic reward (every 30s) — never go long without dopamine
    run.rewardT += dt;
    if (run.rewardT >= 30) {
      run.rewardT = 0;
      const bonus = 15 + Math.floor(Math.random() * 25);
      run.money += bonus; run.xp += 10;
      UI.reward('🎁 +' + bonus + ' Route Bonus!');
      beep(990, 0.1, 'sine', 0.07);
    }

    // random funny event
    run.eventT -= dt;
    if (run.eventT <= 0) {
      run.eventT = 9 + Math.random() * 7;
      const ev = G.EVENTS[(Math.random() * G.EVENTS.length) | 0];
      run.mood = Math.max(-3, Math.min(5, run.mood + ev.mood));
      if (ev.mood < 0) run.annoyed++;
      UI.toast(ev.text);
    }

    if (shake > 0) shake = Math.max(0, shake - dt * 60);
    UI.hud(run.money, run.xp, run.fuel, fuelMax(), run.time);
  }

  function collide(h, factor) {
    maxi.speed *= (1 - factor);
    shake = 10 * factor + 4;
    beep(120, 0.12, 'square', 0.09);
  }

  // ---------- render ----------
  function worldToScreen(x, y) {
    return [W / 2 + x, H - (y - cam)];
  }

  function render() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    // grass / roadside (Caribbean green)
    ctx.fillStyle = '#2f9e44';
    ctx.fillRect(0, 0, W, H);

    // roadside flavour: alternating shop blocks
    const blockH = 90;
    const startB = Math.floor(cam / blockH) - 1;
    for (let i = startB; i < startB + Math.ceil(H / blockH) + 2; i++) {
      const sy = H - (i * blockH - cam);
      const palette = ['#e9c46a', '#e76f51', '#f4a261', '#2a9d8f', '#e63946'];
      ctx.fillStyle = palette[((i % palette.length) + palette.length) % palette.length];
      const lw = W / 2 - ROAD_HALF;
      ctx.fillRect(0, sy - blockH, lw - 8, blockH - 8);
      ctx.fillRect(W / 2 + ROAD_HALF + 8, sy - blockH, lw - 8, blockH - 8);
    }

    // road surface
    ctx.fillStyle = '#3a3a40';
    ctx.fillRect(W / 2 - ROAD_HALF, 0, ROAD_HALF * 2, H);
    // edges
    ctx.fillStyle = '#f1d302';
    ctx.fillRect(W / 2 - ROAD_HALF, 0, 5, H);
    ctx.fillRect(W / 2 + ROAD_HALF - 5, 0, 5, H);

    // dashed lane lines (scroll with camera)
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const dash = 40, gap = 36, total = dash + gap;
    const off = ((cam % total) + total) % total;
    for (let y = -off; y < H + total; y += total) {
      ctx.fillRect(W / 2 - 3, y, 6, dash);
      ctx.fillRect(W / 2 - ROAD_HALF * 0.5 - 2, y + 18, 4, dash * 0.7);
      ctx.fillRect(W / 2 + ROAD_HALF * 0.5 - 2, y + 18, 4, dash * 0.7);
    }

    // entities
    world.passengers.forEach((p) => { const [sx, sy] = worldToScreen(p.x, p.y); if (sy > -60 && sy < H + 60) p.draw(ctx, sx, sy); });
    world.hazards.forEach((h) => { const [sx, sy] = worldToScreen(h.x, h.y); if (sy > -60 && sy < H + 60) h.draw(ctx, sx, sy); });
    if (world.dropoff) {
      const [sx, sy] = worldToScreen(world.dropoff.x, world.dropoff.y);
      if (sy < -20) drawArrow(world.dropoff.x); else world.dropoff.draw(ctx, sx, sy);
    }

    // the maxi
    const [mx, my] = worldToScreen(maxi.x, maxi.y);
    maxi.draw(ctx, mx, my);

    ctx.restore();
  }

  function drawArrow(targetX) {
    // off-screen dropoff indicator at top
    const sx = W / 2 + Math.max(-ROAD_HALF, Math.min(ROAD_HALF, targetX));
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(sx, 14); ctx.lineTo(sx - 12, 32); ctx.lineTo(sx + 12, 32);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#063'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('DROP', sx, 46);
  }

  // ---------- loop ----------
  function loop(t) {
    if (!running) return;
    let dt = (t - lastT) / 1000; lastT = t;
    if (dt > 0.05) dt = 0.05; // clamp big frame gaps
    update(dt);
    if (running) { render(); requestAnimationFrame(loop); }
  }

  // ---------- input ----------
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key === 'a' || e.key === 'ArrowLeft') input.steer = -1;
    if (e.key === 'd' || e.key === 'ArrowRight') input.steer = 1;
    if (e.key === 's' || e.key === 'ArrowDown') input.brake = true;
    if (e.key === ' ') { input.horn = true; if (running) { run.horns++; hornSound(); } }
  });
  document.addEventListener('keyup', (e) => {
    if ((e.key === 'a' || e.key === 'ArrowLeft') && input.steer < 0) input.steer = 0;
    if ((e.key === 'd' || e.key === 'ArrowRight') && input.steer > 0) input.steer = 0;
    if (e.key === 's' || e.key === 'ArrowDown') input.brake = false;
    if (e.key === ' ') input.horn = false;
  });

  // touch steering: drag anywhere on canvas left/right of maxi
  let touchId = null, touchStartX = 0;
  canvas.addEventListener('touchstart', (e) => {
    const tch = e.changedTouches[0];
    touchId = tch.identifier; touchStartX = tch.clientX;
    input.touchSteer = 0; e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    for (const tch of e.changedTouches) {
      if (tch.identifier === touchId) {
        const dx = (tch.clientX - touchStartX) / 80;
        input.touchSteer = Math.max(-1, Math.min(1, dx));
      }
    }
    e.preventDefault();
  }, { passive: false });
  function endTouch(e) {
    for (const tch of e.changedTouches) if (tch.identifier === touchId) { touchId = null; input.touchSteer = null; }
  }
  canvas.addEventListener('touchend', endTouch);
  canvas.addEventListener('touchcancel', endTouch);

  // horn / brake buttons (touch + mouse)
  function bindHold(id, on, off) {
    const el = document.getElementById(id);
    const down = (e) => { on(); e.preventDefault(); };
    const up = (e) => { off(); e.preventDefault(); };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up); el.addEventListener('touchcancel', up);
    el.addEventListener('mousedown', down); el.addEventListener('mouseup', up);
    el.addEventListener('mouseleave', up);
  }
  bindHold('btn-horn', () => { input.horn = true; if (running) { run.horns++; hornSound(); } }, () => { input.horn = false; });
  bindHold('btn-brake', () => { input.brake = true; }, () => { input.brake = false; });

  // ---------- idle income on return ----------
  function idleIncome() {
    const dtMs = Date.now() - (save.lastReturn || Date.now());
    const hours = Math.min(8, dtMs / 3.6e6);
    const rate = 20 + (save.upgrades.engine || 0) * 6; // $/hr passive empire
    const earned = Math.floor(hours * rate);
    if (earned > 5) {
      save.bank += earned; G.save(save);
      setTimeout(() => UI.toast(`🏝️ Your maxi earned ${UI.fmt(earned)} while away!`), 600);
    }
    save.lastReturn = Date.now();
  }

  // ---------- wire up menus ----------
  function refreshAll() { UI.renderBands(save, pickBand); UI.refreshMenu(save); }
  function pickBand(id) { save.band = id; G.save(save); refreshAll(); }

  document.getElementById('btn-play').onclick = () => { audio(); startRun(); };
  document.getElementById('btn-again').onclick = () => startRun();
  document.getElementById('btn-garage').onclick = () => { UI.renderGarage(save, buyUpgrade); UI.show('garage'); };
  document.getElementById('btn-leaderboard').onclick = () => { UI.renderLeaderboard(save); UI.show('leaderboard'); };
  document.getElementById('btn-howto').onclick = () => UI.show('howto');
  document.querySelectorAll('[data-back]').forEach((b) => b.onclick = () => { refreshAll(); UI.show('menu'); });

  document.getElementById('btn-share').onclick = () => { if (lastResult) UI.shareCard(lastResult); };
  document.getElementById('btn-screenshot').onclick = shareScreenshot;

  function buyUpgrade(id) {
    const u = GAME.UPGRADES.find((x) => x.id === id);
    const lvl = save.upgrades[id] || 0;
    if (lvl >= u.max) return;
    const cost = G.upgradeCost(u, lvl);
    if (save.bank < cost) { UI.toast('Not enough cash, dread! 💸'); return; }
    save.bank -= cost; save.upgrades[id] = lvl + 1; G.save(save);
    beep(770, 0.1, 'triangle', 0.07);
    UI.renderGarage(save, buyUpgrade);
  }

  function shareScreenshot() {
    try {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url; a.download = 'maxi-taxi-madness.png'; a.click();
      UI.toast('📸 Screenshot saved!');
    } catch (e) { UI.toast('📸 Screenshot blocked here.'); }
  }

  // ---------- boot ----------
  resize();
  idleIncome();
  refreshAll();
  UI.show('menu');
})();
