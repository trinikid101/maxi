/* Maxi Taxi Madness — 3D engine (Three.js, GTA-style chase cam).
 * Reuses the global GAME data + UI/HUD layer from data.js / ui.js.
 * Drives a 3D maxi down an endless Trini street; same loop as before:
 * pick up passengers, dodge hazards, bank fares, upgrade, climb the ranks. */
import * as THREE from '../vendor/three.module.js';

const G = window.GAME;
const UI = G.UI;

// ---------- tunables (in metres) ----------
const ROAD_HALF = 11;     // half road width
const GRAB_X = 11;        // lateral pickup reach
const CULL_BEHIND = 40;   // remove things this far behind the maxi
const VIEW_AHEAD = 150;   // spawn things up to here ahead
const CAM_BACK = 10.5;
const CAM_HEIGHT = 5.2;
const CAM_LOOK = 16;
const SHIFT_LEN = 150;

// ---------- renderer / scene / camera ----------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#8fd3ff');
scene.fog = new THREE.Fog('#9fd8ff', 70, 190);

const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 800);
camera.position.set(0, CAM_HEIGHT, -CAM_BACK);

// lights — bright Caribbean midday
const hemi = new THREE.HemisphereLight('#cfeaff', '#5f7d3a', 1.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff6dc', 1.15);
sun.position.set(30, 60, 20);
scene.add(sun);

// ---------- shared materials / geometry ----------
const MAT = {
  grass: new THREE.MeshStandardMaterial({ color: '#3fa34d', roughness: 1 }),
  road: new THREE.MeshStandardMaterial({ color: '#3a3a40', roughness: 1 }),
  walk: new THREE.MeshStandardMaterial({ color: '#9aa0a6', roughness: 1 }),
  edge: new THREE.MeshStandardMaterial({ color: '#f1d302', roughness: 0.8 }),
  dash: new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: 0.8 }),
  pothole: new THREE.MeshStandardMaterial({ color: '#161616', roughness: 1 }),
  flood: new THREE.MeshStandardMaterial({ color: '#3b82c4', transparent: true, opacity: 0.55, roughness: 0.3 }),
  block: new THREE.MeshStandardMaterial({ color: '#1f6feb', roughness: 0.6 }),
};
const BUILDING_COLORS = ['#e9c46a', '#e76f51', '#f4a261', '#2a9d8f', '#e63946', '#457b9d', '#f6bd60', '#84a59d'];

// emoji billboard sprite (keeps the Trini flavour cheap & cheerful)
function emojiSprite(emoji, size) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const cx = c.getContext('2d');
  cx.font = '96px system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  cx.textAlign = 'center'; cx.textBaseline = 'middle';
  cx.fillText(emoji, 64, 72);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  spr.scale.set(size, size, 1);
  return spr;
}

// ---------- the maxi (built from primitives, white body + colour band) ----------
function buildMaxi(stripeHex) {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: '#f6f6f0', roughness: 0.5, metalness: 0.1 });
  const glass = new THREE.MeshStandardMaterial({ color: '#2d3b49', roughness: 0.2, metalness: 0.3 });
  const stripe = new THREE.MeshStandardMaterial({ color: new THREE.Color(stripeHex), roughness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.9 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.7, 5.2), white);
  body.position.y = 1.35; g.add(body);
  // colour band stripe down the flanks
  const band = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.42, 5.24), stripe);
  band.position.y = 1.02; g.add(band);
  // windscreen (front = +z) and rear glass
  const wind = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.85, 0.12), glass);
  wind.position.set(0, 1.85, 2.45); g.add(wind);
  const rear = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 0.12), glass);
  rear.position.set(0, 1.8, -2.55); g.add(rear);
  // side windows
  for (const sx of [-1.22, 1.22]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 3.0), glass);
    sw.position.set(sx, 1.85, 0.2); g.add(sw);
  }
  // headlights / taillights
  const yellow = new THREE.MeshStandardMaterial({ color: '#fff3b0', emissive: '#fff3b0', emissiveIntensity: 0.6 });
  const red = new THREE.MeshStandardMaterial({ color: '#c81d25', emissive: '#c81d25', emissiveIntensity: 0.5 });
  for (const sx of [-0.8, 0.8]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.1), yellow);
    hl.position.set(sx, 0.95, 2.6); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.3, 0.1), red);
    tl.position.set(sx, 0.95, -2.6); g.add(tl);
  }
  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 18);
  for (const wx of [-1.25, 1.25]) for (const wz of [1.6, -1.6]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.5, wz); g.add(w);
  }
  // roof "MAXI" tag
  const tag = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.5), stripe);
  tag.position.set(0, 2.24, 0); g.add(tag);

  g.userData.stripeMat = stripe;
  return g;
}

// ---------- world (ground/road follow the maxi; props recycle) ----------
const groundGeo = new THREE.PlaneGeometry(500, 9000);
const ground = new THREE.Mesh(groundGeo, MAT.grass);
ground.rotation.x = -Math.PI / 2; scene.add(ground);

const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, 9000), MAT.road);
road.rotation.x = -Math.PI / 2; road.position.y = 0.02; scene.add(road);

for (const sx of [-1, 1]) {
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(5, 9000), MAT.walk);
  walk.rotation.x = -Math.PI / 2; walk.position.set(sx * (ROAD_HALF + 2.5), 0.03, 0); scene.add(walk);
  walk.userData.follow = true;
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 9000), MAT.edge);
  edge.position.set(sx * ROAD_HALF, 0.06, 0); scene.add(edge);
  edge.userData.follow = true;
}
const followers = [ground, road, ...scene.children.filter((c) => c.userData.follow)];

// lane dashes (recycled)
const dashes = [];
const DASH_SPACING = 7, DASH_COUNT = 40;
for (let i = 0; i < DASH_COUNT; i++) {
  const d = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 3), MAT.dash);
  d.position.set(0, 0.05, i * DASH_SPACING);
  scene.add(d); dashes.push(d);
}
const DASH_SPAN = DASH_COUNT * DASH_SPACING;

// buildings (recycled, both sides)
const buildings = [];
const BLD_SPACING = 15, BLD_PER_SIDE = 16;
function randomizeBuilding(b, side) {
  const w = 6 + Math.random() * 7, h = 6 + Math.random() * 26, d = 6 + Math.random() * 7;
  b.scale.set(w, h, d);
  b.position.x = side * (ROAD_HALF + 6 + Math.random() * 10 + w / 2);
  b.position.y = h / 2;
  b.material.color.set(BUILDING_COLORS[(Math.random() * BUILDING_COLORS.length) | 0]);
}
const unitBox = new THREE.BoxGeometry(1, 1, 1);
for (const side of [-1, 1]) {
  for (let i = 0; i < BLD_PER_SIDE; i++) {
    const b = new THREE.Mesh(unitBox, new THREE.MeshStandardMaterial({ roughness: 0.85 }));
    randomizeBuilding(b, side);
    b.position.z = i * BLD_SPACING;
    b.userData.side = side;
    scene.add(b); buildings.push(b);
  }
}
const BLD_SPAN = BLD_PER_SIDE * BLD_SPACING;

// ---------- entity pools ----------
const passengers = [];
const hazards = [];
let dropoff = null;
let spawnZ = 0;

function makePassenger(a, x, z) {
  const grp = new THREE.Group();
  const col = new THREE.Color(a.color);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 1.5, 12),
    new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 }));
  body.position.y = 1.05; grp.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12),
    new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 0.9 }));
  head.position.y = 2.0; grp.add(head);
  const ringMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.7, 24), ringMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; grp.add(ring);
  grp.position.set(x, 0, z);
  grp.userData = { a, picked: false, near: false, ringMat, baseY: 0, wave: Math.random() * 6 };
  scene.add(grp); passengers.push(grp);
}

function makeHazard(kind, x, z) {
  let obj;
  if (kind === 'pothole') {
    obj = new THREE.Mesh(new THREE.CircleGeometry(1.3, 16), MAT.pothole);
    obj.rotation.x = -Math.PI / 2; obj.position.set(x, 0.04, z);
  } else if (kind === 'flood') {
    obj = new THREE.Group();
    const p = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), MAT.flood);
    p.rotation.x = -Math.PI / 2; p.position.y = 0.05; obj.add(p);
    const s = emojiSprite('🌊', 2.4); s.position.y = 1.2; obj.add(s);
    obj.position.set(x, 0, z);
  } else if (kind === 'roadblock') {
    obj = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(9, 1.2, 0.6), MAT.block);
    bar.position.y = 0.6; obj.add(bar);
    const s = emojiSprite('👮', 2.4); s.position.set(0, 2.0, 0); obj.add(s);
    obj.position.set(x, 0, z);
  } else { // goat / limer
    obj = emojiSprite(kind === 'goat' ? '🐐' : '🍺', 2.4);
    obj.position.set(x, 1.1, z);
  }
  obj.userData = { kind, dead: false, passed: false, t: Math.random() * 6, x };
  scene.add(obj); hazards.push(obj);
}

function makeDropoff(x, z) {
  const grp = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 9, 14),
    new THREE.MeshStandardMaterial({ color: '#10b981', emissive: '#10b981', emissiveIntensity: 0.7, transparent: true, opacity: 0.5 }));
  beam.position.y = 4.5; grp.add(beam);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.2, 24),
    new THREE.MeshBasicMaterial({ color: '#10b981', transparent: true, opacity: 0.8 }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.07; grp.add(ring);
  const s = emojiSprite('🏁', 2.6); s.position.y = 2.4; grp.add(s);
  grp.position.set(x, 0, z);
  return grp;
}

function clearEntities() {
  for (const p of passengers) scene.remove(p);
  for (const h of hazards) scene.remove(h);
  if (dropoff) scene.remove(dropoff);
  passengers.length = 0; hazards.length = 0; dropoff = null;
}

// ---------- audio ----------
let actx = null;
function audio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return actx; }
function beep(freq, dur, type, vol) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), gn = a.createGain();
  o.type = type || 'square'; o.frequency.value = freq; gn.gain.value = vol || 0.06;
  o.connect(gn); gn.connect(a.destination);
  o.start(); gn.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.stop(a.currentTime + dur);
}
function hornSound() {
  const lvl = save.upgrades.horn || 0;
  beep(220 - lvl * 20, 0.28, 'sawtooth', 0.08);
  setTimeout(() => beep(180 - lvl * 20, 0.22, 'sawtooth', 0.07), 90);
}

// ---------- state ----------
let save = G.load();
let maxi = null;
let car = null;
let run = null;
let running = false;
let lastT = 0;
let shake = 0;
let lastResult = null;
const input = { steer: 0, brake: false, horn: false, touchSteer: null };
const camPos = new THREE.Vector3(0, CAM_HEIGHT, -CAM_BACK);

// derived
function maxSpeed() { return (38 + (save.upgrades.engine || 0) * 7) * maxi.userData.band.accel; }
function fuelMax() { return 100 + (save.upgrades.tank || 0) * 35; }
function brakePower() { return 50 + (save.upgrades.brakes || 0) * 14; }

// ---------- sizing ----------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// ---------- spawning ----------
function ensureSpawned() {
  const ahead = car.z + VIEW_AHEAD;
  while (spawnZ < ahead) {
    spawnZ += 16 + Math.random() * 20;
    const roll = Math.random();
    if (roll < 0.42) {
      const side = Math.random() < 0.5 ? -1 : 1;
      makePassenger(G.pickPassenger(), side * (ROAD_HALF - 2.5), spawnZ);
    } else if (roll < 0.9) {
      const x = (Math.random() * 2 - 1) * (ROAD_HALF - 2);
      const kinds = ['pothole', 'pothole', 'goat', 'limer', 'flood', 'roadblock'];
      makeHazard(kinds[(Math.random() * kinds.length) | 0], x, spawnZ);
    }
  }
  // cull behind
  for (let i = passengers.length - 1; i >= 0; i--) {
    const p = passengers[i];
    if (p.userData.picked || p.position.z < car.z - CULL_BEHIND) { scene.remove(p); passengers.splice(i, 1); }
  }
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    if (h.userData.dead || h.position.z < car.z - CULL_BEHIND) { scene.remove(h); hazards.splice(i, 1); }
  }
}

// ---------- run lifecycle ----------
function startRun() {
  if (maxi) scene.remove(maxi);
  maxi = buildMaxi(G.BANDS[save.band].stripe);
  maxi.userData.band = G.BANDS[save.band];
  scene.add(maxi);
  car = { x: 0, z: 0, speed: 0, steer: 0 };
  clearEntities();
  spawnZ = 0;
  run = {
    money: 0, xp: 0, fuel: fuelMax(), time: SHIFT_LEN,
    delivered: 0, annoyed: 0, nearMiss: 0, horns: 0, potholes: 0, goats: 0,
    topSpeed: 0, rewardT: 0, eventT: 6 + Math.random() * 4, mood: 0, hintT: 0,
  };
  ensureSpawned();
  camPos.set(0, CAM_HEIGHT, -CAM_BACK);
  running = true; lastT = performance.now();
  UI.showHud();
  UI.toast('🙋 Steer into a waving passenger’s lane to pick them up!');
  requestAnimationFrame(loop);
}

function endRun(reason) {
  running = false;
  save.bank += run.money; save.day += 1;
  save.best = Math.max(save.best, run.money);
  save.lastReturn = Date.now();
  G.save(save);
  UI.results({
    title: reason === 'fuel' ? 'Out of Gas! ⛽' : 'Shift Done! 🏁',
    pay: run.money, delivered: run.delivered, annoyed: run.annoyed,
    nearMiss: run.nearMiss, horns: run.horns, potholes: run.potholes,
    goats: run.goats, topSpeed: run.topSpeed | 0,
  });
  lastResult = { pay: run.money, horns: run.horns, nearMiss: run.nearMiss, annoyed: run.annoyed, goats: run.goats };
}

// ---------- update ----------
function update(dt) {
  run.time -= dt;
  if (run.time <= 0) { endRun('time'); return; }

  // steering
  const target = input.touchSteer != null ? input.touchSteer : input.steer;
  car.steer += (target - car.steer) * Math.min(1, dt * 10);
  const lateralV = 16 + (save.upgrades.engine || 0) * 0.5;
  // world +x renders on the left (camera looks toward +z), so a "steer right"
  // input must decrease car.x to move the maxi to the screen-right.
  car.x -= car.steer * lateralV * dt;
  car.x = Math.max(-ROAD_HALF + 1.4, Math.min(ROAD_HALF - 1.4, car.x));

  // speed
  const ms = maxSpeed();
  if (input.brake) car.speed -= brakePower() * dt;
  else car.speed += (ms - car.speed) * Math.min(1, dt * 0.8);
  car.speed = Math.max(0, Math.min(ms, car.speed));
  car.z += car.speed * dt;
  run.topSpeed = Math.max(run.topSpeed, car.speed * 3); // km/h flavour

  // fuel
  run.fuel -= dt * (1.2 + car.speed / 40) * maxi.userData.band.fuelMul;
  if (run.fuel <= 0) { run.fuel = 0; endRun('fuel'); return; }

  // world follow + recycling
  for (const f of followers) f.position.z = car.z;
  for (const d of dashes) if (d.position.z < car.z - 20) d.position.z += DASH_SPAN;
  for (const b of buildings) if (b.position.z < car.z - CULL_BEHIND) { b.position.z += BLD_SPAN; randomizeBuilding(b, b.userData.side); }

  ensureSpawned();

  // passengers — pure proximity pickup (no speed gate)
  for (const p of passengers) {
    const u = p.userData;
    u.wave += dt * 5;
    p.position.y = Math.abs(Math.sin(u.wave)) * 0.12;
    u.near = false;
    if (u.picked || maxi.userData.carry) continue;
    const dx = p.position.x - car.x, dz = p.position.z - car.z;
    if (Math.abs(dx) < GRAB_X && dz < 9 && dz > -7) {
      u.picked = true;
      maxi.userData.carry = u.a;
      dropoff = makeDropoff((Math.random() * 2 - 1) * (ROAD_HALF - 3), car.z + 90 + Math.random() * 90);
      beep(660, 0.12, 'triangle', 0.07);
      UI.fareCard(u.a, 0);
      UI.toast('🙋 ' + u.a.quip);
    } else if (Math.abs(dx) < GRAB_X && dz > -7 && dz < 55) {
      u.near = true;
    } else if (dz < -8 && dz > -16 && !u.annoyed) {
      u.annoyed = true; run.annoyed++;
    }
    u.ringMat.color.set(u.near ? '#10b981' : u.a.color);
    u.ringMat.opacity = u.near ? 0.95 : 0.7;
  }

  // dropoff
  if (dropoff) {
    dropoff.userData.t = (dropoff.userData.t || 0) + dt * 3;
    const pulse = 1 + Math.sin(dropoff.userData.t) * 0.12;
    dropoff.scale.set(pulse, 1, pulse);
    const dx = dropoff.position.x - car.x, dz = dropoff.position.z - car.z;
    if (Math.abs(dx) < 3.2 && Math.abs(dz) < 4) {
      const p = maxi.userData.carry;
      const dist = 1 + Math.min(2.2, dropoff.position.z / 180);
      const fare = Math.round((p.fare * dist + p.tip) * maxi.userData.band.fareMul * (1 + run.mood * 0.05));
      run.money += fare; run.xp += 8 + p.fare; run.delivered++;
      UI.fareCard(p, fare);
      beep(880, 0.14, 'triangle', 0.08);
      maxi.userData.carry = null;
      scene.remove(dropoff); dropoff = null;
    }
  }

  // hazards
  for (const h of hazards) {
    const u = h.userData;
    u.t += dt;
    if (u.kind === 'goat') { h.position.x = u.x + Math.sin(u.t * 1.5) * 2.2; }
    const dx = h.position.x - car.x, dz = h.position.z - car.z;
    const hit = Math.abs(dx) < 1.9 && Math.abs(dz) < 2.6;
    if (hit && !u.dead) {
      if (u.kind === 'goat') {
        if (input.horn) { u.dead = true; run.goats++; UI.toast('🐐 Goat scatter!'); }
        else { collide(0.4); UI.toast('🐐 Maxi vs goat!'); }
      } else if (u.kind === 'pothole') {
        u.dead = true; run.potholes++;
        collide(Math.max(0.12, 0.4 - (save.upgrades.suspension || 0) * 0.06));
      } else if (u.kind === 'flood') { car.speed *= 0.86; }
      else if (u.kind === 'roadblock') { collide(0.5); UI.toast('👮 Permit check!'); }
      else if (u.kind === 'limer') { u.dead = true; collide(0.2); }
    } else if (!u.passed && dz < -2.6 && dz > -6 && Math.abs(dx) > 1.9 && Math.abs(dx) < 4) {
      u.passed = true; run.nearMiss++;
    }
  }

  // 30s reward
  run.rewardT += dt;
  if (run.rewardT >= 30) {
    run.rewardT = 0;
    const bonus = 15 + Math.floor(Math.random() * 25);
    run.money += bonus; run.xp += 10;
    UI.reward('🎁 +' + bonus + ' Route Bonus!');
    beep(990, 0.1, 'sine', 0.07);
  }

  // funny events
  run.eventT -= dt;
  if (run.eventT <= 0) {
    run.eventT = 9 + Math.random() * 7;
    const ev = G.EVENTS[(Math.random() * G.EVENTS.length) | 0];
    run.mood = Math.max(-3, Math.min(5, run.mood + ev.mood));
    if (ev.mood < 0) run.annoyed++;
    UI.toast(ev.text);
  }

  if (shake > 0) shake = Math.max(0, shake - dt * 3);

  // apply maxi transform
  maxi.position.set(car.x, 0, car.z);
  maxi.rotation.z = car.steer * 0.05;      // slight body roll into the turn
  maxi.rotation.y = -car.steer * 0.12;     // nose yaws toward travel (screen-right)

  // chase camera (GTA-style trailing)
  const k = Math.min(1, dt * 4);
  camPos.x += (car.x - camPos.x) * k;
  camPos.y += (CAM_HEIGHT - camPos.y) * k;
  camPos.z += ((car.z - CAM_BACK) - camPos.z) * k;
  camera.position.set(
    camPos.x + (Math.random() - 0.5) * shake,
    camPos.y + (Math.random() - 0.5) * shake,
    camPos.z
  );
  camera.lookAt(car.x, 1.6, car.z + CAM_LOOK);

  UI.hud(run.money, run.xp, run.fuel, fuelMax(), run.time);
}

function collide(factor) {
  car.speed *= (1 - factor);
  shake = Math.min(1.4, 0.6 + factor);
  beep(120, 0.12, 'square', 0.09);
}

// ---------- loop ----------
function loop(t) {
  if (!running) return;
  let dt = (t - lastT) / 1000; lastT = t;
  if (dt > 0.05) dt = 0.05;
  update(dt);
  if (running) { renderer.render(scene, camera); requestAnimationFrame(loop); }
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

let touchId = null, touchStartX = 0;
canvas.addEventListener('touchstart', (e) => {
  const tch = e.changedTouches[0];
  touchId = tch.identifier; touchStartX = tch.clientX; input.touchSteer = 0; e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  for (const tch of e.changedTouches) if (tch.identifier === touchId) {
    input.touchSteer = Math.max(-1, Math.min(1, (tch.clientX - touchStartX) / 80));
  }
  e.preventDefault();
}, { passive: false });
function endTouch(e) { for (const tch of e.changedTouches) if (tch.identifier === touchId) { touchId = null; input.touchSteer = null; } }
canvas.addEventListener('touchend', endTouch);
canvas.addEventListener('touchcancel', endTouch);

function bindHold(id, on, off) {
  const el = document.getElementById(id);
  const down = (e) => { on(); e.preventDefault(); };
  const up = (e) => { off(); e.preventDefault(); };
  el.addEventListener('touchstart', down, { passive: false });
  el.addEventListener('touchend', up); el.addEventListener('touchcancel', up);
  el.addEventListener('mousedown', down); el.addEventListener('mouseup', up); el.addEventListener('mouseleave', up);
}
bindHold('btn-horn', () => { input.horn = true; if (running) { run.horns++; hornSound(); } }, () => { input.horn = false; });
bindHold('btn-brake', () => { input.brake = true; }, () => { input.brake = false; });

// ---------- idle income ----------
function idleIncome() {
  const dtMs = Date.now() - (save.lastReturn || Date.now());
  const hours = Math.min(8, dtMs / 3.6e6);
  const rate = 20 + (save.upgrades.engine || 0) * 6;
  const earned = Math.floor(hours * rate);
  if (earned > 5) { save.bank += earned; G.save(save); setTimeout(() => UI.toast(`🏝️ Your maxi earned ${UI.fmt(earned)} while away!`), 600); }
  save.lastReturn = Date.now();
}

// ---------- menus ----------
function refreshAll() { UI.renderBands(save, pickBand); UI.refreshMenu(save); }
function pickBand(id) { save.band = id; G.save(save); refreshAll(); }
function buyUpgrade(id) {
  const u = G.UPGRADES.find((x) => x.id === id);
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
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url; a.download = 'maxi-taxi-madness.png'; a.click();
    UI.toast('📸 Screenshot saved!');
  } catch (e) { UI.toast('📸 Screenshot blocked here.'); }
}

document.getElementById('btn-play').onclick = () => { audio(); startRun(); };
document.getElementById('btn-again').onclick = () => startRun();
document.getElementById('btn-garage').onclick = () => { UI.renderGarage(save, buyUpgrade); UI.show('garage'); };
document.getElementById('btn-leaderboard').onclick = () => { UI.renderLeaderboard(save); UI.show('leaderboard'); };
document.getElementById('btn-howto').onclick = () => UI.show('howto');
document.querySelectorAll('[data-back]').forEach((b) => b.onclick = () => { refreshAll(); UI.show('menu'); });
document.getElementById('btn-share').onclick = () => { if (lastResult) UI.shareCard(lastResult); };
document.getElementById('btn-screenshot').onclick = shareScreenshot;

// ---------- boot ----------
resize();
idleIncome();
refreshAll();
UI.show('menu');
renderer.render(scene, camera); // warm up the GL context
