/* Maxi Taxi Madness — game data & config.
 * Plain global namespace (no ES modules) so index.html runs by double-click. */
window.GAME = window.GAME || {};

GAME.BANDS = {
  red: {
    id: 'red', name: 'Red Band', stripe: '#e63946',
    bonus: 'Faster acceleration', accel: 1.25, fuelMul: 1.0, fareMul: 1.0,
  },
  green: {
    id: 'green', name: 'Green Band', stripe: '#2a9d4a',
    bonus: 'Better fuel economy', accel: 1.0, fuelMul: 0.7, fareMul: 1.0,
  },
  yellow: {
    id: 'yellow', name: 'Yellow Band', stripe: '#f4c20d',
    bonus: 'More passenger income', accel: 1.0, fuelMul: 1.0, fareMul: 1.3,
  },
};

// Passenger archetypes. fare scaled by distance + band; weight = spawn chance.
GAME.PASSENGERS = [
  { type: 'School Child',   color: '#3b82f6', fare: 6,   weight: 24, tip: 0,  quip: 'Driver, by de school please!' },
  { type: 'Office Worker',  color: '#6b7280', fare: 12,  weight: 26, tip: 1,  quip: 'POS, and step on it!' },
  { type: 'Market Vendor',  color: '#16a34a', fare: 14,  weight: 16, tip: 6,  quip: 'Help me wid dese bags nah.' },
  { type: 'Tourist',        color: '#06b6d4', fare: 28,  weight: 12, tip: 4,  quip: 'To the beach, my friend!' },
  { type: 'Drunk Limer',    color: '#a855f7', fare: 18,  weight: 12, tip: 3,  quip: 'Awwwww gyaaal... one more lime!' },
  { type: 'Politician',     color: '#0ea5e9', fare: 35,  weight: 6,  tip: 8,  quip: 'I have a meeting, fast fast!' },
  { type: 'Celebrity',      color: '#f43f5e', fare: 60,  weight: 4,  tip: 20, quip: '...keep it low key, eh.' },
];

// Funny Trini events. effect handled in game loop by id.
GAME.EVENTS = [
  { id: 'argue',    text: 'Passenger arguing over change! 💸',          mood: -1 },
  { id: 'holdon',   text: '"DRIVER, HOLD ONNN!" 🙋',                     mood: -1 },
  { id: 'stopstop', text: 'Passenger want to stop EVERY minute 🙄',     mood: -1 },
  { id: 'carnival', text: 'Road block — Carnival band passing! 🎺',     mood: 0  },
  { id: 'goat',     text: 'Goat crossing the road! 🐐 Blow yuh horn!',  mood: 0  },
  { id: 'flood',    text: 'Flash flooding ahead! 🌊 Slow down!',        mood: 0  },
  { id: 'police',   text: 'Police checking permits 👮 Stay cool.',      mood: 0  },
  { id: 'soca',     text: 'Passenger blasting soca! 🔊 Vibes high!',    mood: +1 },
  { id: 'roadrage', text: 'Maxi vs maxi road rage! 😤',                 mood: -1 },
  { id: 'doubles',  text: 'Doubles vendor waving — quick stop? 🫓',     mood: +1 },
];

// Cities / routes — unlock by reaching cash thresholds. Used in menu + map flavour.
GAME.CITIES = [
  { name: 'Port of Spain', unlock: 0 },
  { name: 'Curepe',        unlock: 150 },
  { name: 'Chaguanas',     unlock: 400 },
  { name: 'San Fernando',  unlock: 800 },
  { name: 'Arima',         unlock: 1400 },
  { name: 'Sangre Grande', unlock: 2200 },
  { name: 'Princes Town',  unlock: 3200 },
  { name: 'Point Fortin',  unlock: 4500 },
];

// Upgrade tracks. cost grows per level; effect read by id in game.
GAME.UPGRADES = [
  { id: 'engine',     name: 'Engine',     icon: '⚙️', desc: 'Top speed + acceleration', max: 5, base: 120 },
  { id: 'suspension', name: 'Suspension', icon: '🛞', desc: 'Potholes hurt less',        max: 5, base: 100 },
  { id: 'brakes',     name: 'Brakes',     icon: '🛑', desc: 'Sharper stopping',          max: 5, base: 90  },
  { id: 'horn',       name: 'Horn',       icon: '📢', desc: 'Louder, funnier, scares goats', max: 3, base: 80 },
  { id: 'tank',       name: 'Fuel Tank',  icon: '⛽', desc: 'Bigger tank, longer shifts', max: 5, base: 110 },
];

GAME.upgradeCost = function (u, level) {
  return Math.round(u.base * Math.pow(1.6, level));
};

// weighted random passenger pick
GAME.pickPassenger = function () {
  const total = GAME.PASSENGERS.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const p of GAME.PASSENGERS) {
    if ((r -= p.weight) <= 0) return p;
  }
  return GAME.PASSENGERS[0];
};

// --- persistence (localStorage) ---
GAME.SAVE_KEY = 'maxi_taxi_save_v1';
GAME.defaultSave = function () {
  return {
    bank: 0, day: 1, band: 'red', best: 0,
    upgrades: { engine: 0, suspension: 0, brakes: 0, horn: 0, tank: 0 },
    lastReturn: Date.now(),
  };
};
GAME.load = function () {
  try {
    const raw = localStorage.getItem(GAME.SAVE_KEY);
    if (!raw) return GAME.defaultSave();
    return Object.assign(GAME.defaultSave(), JSON.parse(raw));
  } catch (e) { return GAME.defaultSave(); }
};
GAME.save = function (s) {
  try { localStorage.setItem(GAME.SAVE_KEY, JSON.stringify(s)); } catch (e) {}
};
