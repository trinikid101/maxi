/* UI: screen routing, menus, garage, leaderboard, viral results card. */
window.GAME = window.GAME || {};

GAME.UI = {
  el(id) { return document.getElementById(id); },

  screens: ['menu', 'garage', 'leaderboard', 'howto', 'results'],

  show(id) {
    this.screens.forEach((s) => this.el(s).classList.toggle('hidden', s !== id));
    this.el('hud').classList.add('hidden');
    if (id) this.el(id).classList.remove('hidden');
  },

  showHud() {
    this.screens.forEach((s) => this.el(s).classList.add('hidden'));
    this.el('hud').classList.remove('hidden');
  },

  fmt(n) { return '$' + Math.floor(n).toLocaleString(); },

  // ---- band selector on the menu ----
  renderBands(save, onPick) {
    const wrap = this.el('band-select');
    wrap.innerHTML = '';
    Object.values(GAME.BANDS).forEach((b) => {
      const d = document.createElement('button');
      d.className = 'band-chip' + (save.band === b.id ? ' active' : '');
      d.style.setProperty('--stripe', b.stripe);
      d.innerHTML = `<span class="swatch"></span>${b.name}`;
      d.onclick = () => { onPick(b.id); };
      wrap.appendChild(d);
    });
    this.el('band-bonus').textContent = '✦ ' + GAME.BANDS[save.band].bonus;
  },

  refreshMenu(save) {
    this.el('menu-bank').textContent = this.fmt(save.bank);
    this.el('menu-day').textContent = save.day;
  },

  // ---- garage upgrades ----
  renderGarage(save, onBuy) {
    this.el('garage-bank').textContent = this.fmt(save.bank);
    const list = this.el('upgrade-list');
    list.innerHTML = '';
    GAME.UPGRADES.forEach((u) => {
      const lvl = save.upgrades[u.id] || 0;
      const maxed = lvl >= u.max;
      const cost = GAME.upgradeCost(u, lvl);
      const afford = save.bank >= cost;
      const row = document.createElement('div');
      row.className = 'upg-row';
      const pips = Array.from({ length: u.max }, (_, i) =>
        `<span class="pip ${i < lvl ? 'on' : ''}"></span>`).join('');
      row.innerHTML = `
        <div class="upg-ico">${u.icon}</div>
        <div class="upg-main">
          <div class="upg-name">${u.name} <span class="pips">${pips}</span></div>
          <div class="upg-desc">${u.desc}</div>
        </div>
        <button class="upg-buy ${maxed ? 'maxed' : afford ? '' : 'broke'}">
          ${maxed ? 'MAX' : this.fmt(cost)}
        </button>`;
      const btn = row.querySelector('.upg-buy');
      if (!maxed) btn.onclick = () => onBuy(u.id);
      list.appendChild(row);
    });
  },

  // ---- leaderboard (synthetic async-multiplayer rivals + you) ----
  renderLeaderboard(save) {
    const rivals = [
      { n: 'Sookoo_Sando', s: 5210 }, { n: 'DougieMaxi', s: 4380 },
      { n: 'PriyaPOS', s: 3920 }, { n: 'BandAllyuh', s: 3110 },
      { n: 'AriMaXXX', s: 2540 }, { n: 'CurepeKing', s: 1880 },
      { n: 'GrandeGyal', s: 1320 }, { n: 'FortinFlyer', s: 760 },
    ];
    rivals.push({ n: 'YOU 🚐', s: save.best, me: true });
    rivals.sort((a, b) => b.s - a.s);
    const list = this.el('lb-list');
    list.innerHTML = '';
    rivals.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'lb-row' + (r.me ? ' me' : '');
      row.innerHTML = `<span class="lb-rank">${i + 1}</span>
        <span class="lb-name">${r.n}</span>
        <span class="lb-score">${this.fmt(r.s)}</span>`;
      list.appendChild(row);
    });
  },

  // ---- in-run HUD ----
  hud(money, xp, fuel, fuelMax, time) {
    this.el('hud-money').textContent = Math.floor(money);
    this.el('hud-xp').textContent = Math.floor(xp);
    this.el('hud-time').textContent = Math.max(0, Math.ceil(time));
    this.el('fuel-fill').style.width = Math.max(0, (fuel / fuelMax) * 100) + '%';
    this.el('fuel-fill').style.background = fuel / fuelMax < 0.25 ? '#ef4444' : '#22c55e';
  },

  toast(msg) {
    const t = this.el('event-toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(this._toastT);
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    this._toastT = setTimeout(() => t.classList.add('hidden'), 2600);
  },

  reward(text) {
    const r = this.el('reward-pop');
    r.textContent = text;
    r.classList.remove('hidden');
    r.style.animation = 'none'; void r.offsetWidth; r.style.animation = 'rewardPop 1.4s ease-out';
    clearTimeout(this._rewT);
    this._rewT = setTimeout(() => r.classList.add('hidden'), 1400);
  },

  fareCard(passenger, fare) {
    const c = this.el('fare-card');
    c.innerHTML = `<b>${passenger.type}</b><br>"${passenger.quip}"<br>
      <span class="fare-amt">+${this.fmt(fare)}</span>`;
    c.classList.remove('hidden');
    clearTimeout(this._fareT);
    this._fareT = setTimeout(() => c.classList.add('hidden'), 2200);
  },

  // ---- viral results ----
  results(data) {
    this.el('result-title').textContent = data.title;
    this.el('result-pay').textContent = Math.floor(data.pay).toLocaleString();
    const lines = [
      ['Passengers Carried', data.delivered],
      ['Passengers Annoyed', data.annoyed],
      ['Near Misses', data.nearMiss],
      ['Horn Pressed', data.horns],
      ['Potholes Hit', data.potholes],
      ['Goats Scared', data.goats],
      ['Top Speed', Math.round(data.topSpeed) + ' km/h'],
    ];
    this.el('result-stats').innerHTML = lines
      .map(([k, v]) => `<div class="rstat"><span>${k}</span><b>${v}</b></div>`).join('');
    this.el('share-card').classList.add('hidden');
    this.show('results');
  },

  shareCard(data) {
    const tags = [
      data.horns > 100 ? '#HornHero' : '',
      data.nearMiss > 20 ? '#AlmostDead' : '',
      data.annoyed > 8 ? '#VexPassengers' : '',
      data.goats > 0 ? '#GoatDodger' : '',
    ].filter(Boolean).join(' ');
    const c = this.el('share-card');
    c.innerHTML = `
      <div class="sc-head">🚐 MAXI TAXI MADNESS</div>
      <div class="sc-big">${this.fmt(data.pay)} in one shift!</div>
      <div class="sc-row">📢 ${data.horns} horns · 😱 ${data.nearMiss} near misses</div>
      <div class="sc-row">😤 ${data.annoyed} vex passengers · 🐐 ${data.goats} goats</div>
      <div class="sc-tags">${tags || '#TriniRoadKing'}</div>
      <div class="sc-foot">Think you could do better? 🇹🇹</div>`;
    c.classList.remove('hidden');
  },
};
