/* ===================== DayQuest ===================== *
 * A simple gamified task list.
 * Pick a difficulty (10/15/20/25/30 pts), build a task list (1–3 pts each)
 * WITHIN that point budget, tick tasks off to fill the bar, then end the day
 * for a score + A–F grade. Every finished day is stored in localStorage and
 * shown in Analytics. Optional Google Sign-In personalizes the app.
 * No build step — drop onto any static host (e.g. Hostinger).
 * ==================================================== */

(function () {
  'use strict';

  /* ===================== CONFIG ===================== */
  /* Paste your Google OAuth 2.0 *Web* Client ID here to enable Sign in with
   * Google. Leave it as '' to hide the button and show setup instructions.
   * Create one at https://console.cloud.google.com/apis/credentials and add
   * your site (and http://localhost:8000 for local testing) to the
   * "Authorized JavaScript origins". */
  var GOOGLE_CLIENT_ID = '';

  /* ---------- Storage keys ---------- */
  var LS_CURRENT = 'dayquest.current.v1';   // the in-progress day (or null)
  var LS_HISTORY = 'dayquest.history.v1';   // array of finished days
  var LS_USER    = 'dayquest.user.v1';      // signed-in Google profile (or null)

  function load(key, fallback) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  /* ---------- State ---------- */
  var current = load(LS_CURRENT, null);   // { goal, difficulty, tasks: [] }
  var history = load(LS_HISTORY, []);
  if (!Array.isArray(history)) history = [];
  var user = load(LS_USER, null);

  var selectedPoints = 1;  // points chosen in the add-task picker

  /* ---------- DOM helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  var DIFFICULTY = {
    10: { name: 'Easy',   cls: 'easy' },
    15: { name: 'Light',  cls: 'light' },
    20: { name: 'Medium', cls: 'medium' },
    25: { name: 'Tough',  cls: 'tough' },
    30: { name: 'Hard',   cls: 'hard' }
  };
  var TIERS = [10, 15, 20, 25, 30];

  /* ===================== Navigation ===================== */
  function showScreen(name) {
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove('active');
    var target = $('screen-' + name);
    if (target) target.classList.add('active');

    var navBtns = document.querySelectorAll('.nav-btn');
    for (var j = 0; j < navBtns.length; j++) {
      var n = navBtns[j].getAttribute('data-nav');
      navBtns[j].classList.toggle('active',
        (n === 'analytics' && name === 'analytics') ||
        (n === 'home' && name !== 'analytics'));
    }
    window.scrollTo(0, 0);
  }

  /* ===================== Difficulty screen ===================== */
  function startDay(goal) {
    current = { goal: goal, difficulty: DIFFICULTY[goal].name, tasks: [], createdAt: Date.now() };
    save(LS_CURRENT, current);
    selectedPoints = 1;
    renderTasks();
    showScreen('tasks');
  }

  function initDifficultyScreen() {
    var cards = document.querySelectorAll('.diff-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function () {
        startDay(parseInt(this.getAttribute('data-goal'), 10));
      });
    }
    var hint = $('resume-hint');
    if (current && current.goal) {
      hint.hidden = false;
      $('resume-btn').addEventListener('click', function () {
        renderTasks();
        showScreen('tasks');
      });
    }
  }

  /* ===================== Points helpers ===================== */
  // Points actually earned (completed tasks) — drives the top tally.
  function earnedPoints() {
    if (!current) return 0;
    return current.tasks.reduce(function (s, t) { return s + (t.done ? t.points : 0); }, 0);
  }
  // Points committed to the list (all tasks) — capped by the goal/budget.
  function committedPoints() {
    if (!current) return 0;
    return current.tasks.reduce(function (s, t) { return s + t.points; }, 0);
  }

  /* ===================== Task screen ===================== */
  function renderProgress() {
    if (!current) return;
    var earned = earnedPoints();
    var goal = current.goal;
    var pct = Math.min(100, Math.round((earned / goal) * 100));

    $('tally-earned').textContent = earned;
    $('tally-goal').textContent = goal;

    var fill = $('progress-fill');
    fill.style.width = pct + '%';
    fill.classList.toggle('complete', earned >= goal);

    $('progress-pct').textContent = pct + '%';
    var remaining = Math.max(0, goal - earned);
    $('progress-remaining').textContent = remaining > 0 ? (remaining + ' to go') : 'Goal reached! 🎉';

    var d = DIFFICULTY[goal];
    var badge = $('diff-badge');
    badge.textContent = d.name;
    badge.className = 'diff-badge ' + d.cls;
  }

  // Enforce the point budget in the UI: capacity text, disabled controls,
  // valid point options, and the increase-difficulty buttons.
  function renderCapacity() {
    if (!current) return;
    var committed = committedPoints();
    var goal = current.goal;
    var left = Math.max(0, goal - committed);

    var capBar = $('capacity-bar');
    if (left > 0) {
      $('capacity-text').textContent =
        committed + ' of ' + goal + ' points planned · ' + left + ' left to assign';
      capBar.classList.remove('full');
    } else {
      $('capacity-text').textContent = 'Budget full — ' + committed + '/' + goal + ' points planned';
      capBar.classList.add('full');
    }

    // Add form: disabled when there's no room left.
    var nameInput = $('task-name');
    var addBtn = document.querySelector('.add-btn');
    nameInput.disabled = left <= 0;
    addBtn.disabled = left <= 0;
    nameInput.placeholder = left <= 0
      ? 'Budget full — increase difficulty to add more'
      : 'Add a task…';

    // Point buttons: disable any value that would exceed the remaining budget.
    var ptBtns = document.querySelectorAll('.pt-btn');
    var maxValid = Math.min(3, left);
    if (maxValid >= 1) {
      if (selectedPoints > maxValid) selectedPoints = maxValid;
      if (selectedPoints < 1) selectedPoints = 1;
    }
    for (var i = 0; i < ptBtns.length; i++) {
      var pts = parseInt(ptBtns[i].getAttribute('data-pts'), 10);
      var disabled = left <= 0 || pts > left;
      ptBtns[i].disabled = disabled;
      ptBtns[i].classList.toggle('disabled', disabled);
      ptBtns[i].classList.toggle('selected', !disabled && pts === selectedPoints);
    }

    renderUpgradeOptions();
  }

  function renderUpgradeOptions() {
    var box = $('upgrade-options');
    var label = $('upgrade-label');
    box.innerHTML = '';
    var higher = TIERS.filter(function (t) { return t > current.goal; });
    if (!higher.length) {
      label.textContent = "You're at the top tier (30 pts) 🏔️";
      return;
    }
    label.textContent = 'Need more room? Increase difficulty:';
    higher.forEach(function (t) {
      var b = el('button', 'upgrade-btn ' + DIFFICULTY[t].cls);
      b.type = 'button';
      b.textContent = '↑ ' + t + ' · ' + DIFFICULTY[t].name;
      b.addEventListener('click', function () { increaseDifficulty(t); });
      box.appendChild(b);
    });
  }

  function increaseDifficulty(goal) {
    if (!current || goal <= current.goal) return;
    current.goal = goal;
    current.difficulty = DIFFICULTY[goal].name;
    save(LS_CURRENT, current);
    renderTasks();
  }

  function renderTasks() {
    if (!current) { showScreen('difficulty'); return; }
    var listEl = $('task-list');
    listEl.innerHTML = '';

    $('empty-state').hidden = current.tasks.length > 0;

    current.tasks.forEach(function (task) {
      var li = el('li', 'task-item' + (task.done ? ' done' : ''));

      var check = el('button', 'task-check');
      check.setAttribute('aria-label', task.done ? 'Mark not done' : 'Mark done');
      check.addEventListener('click', function () { toggleTask(task.id); });

      var text = el('span', 'task-text');
      text.textContent = task.name;

      var pts = el('span', 'task-pts');
      pts.textContent = task.points + (task.points === 1 ? ' pt' : ' pts');

      var del = el('button', 'task-del');
      del.innerHTML = '&times;';
      del.setAttribute('aria-label', 'Delete task');
      del.addEventListener('click', function () { deleteTask(task.id); });

      li.appendChild(check);
      li.appendChild(text);
      li.appendChild(pts);
      li.appendChild(del);
      listEl.appendChild(li);
    });

    $('end-day-btn').disabled = current.tasks.length === 0;
    renderProgress();
    renderCapacity();
  }

  function addTask(name, points) {
    name = (name || '').trim();
    if (!name) return false;
    points = Math.max(1, Math.min(3, parseInt(points, 10) || 1));
    // Hard guard: never let the list exceed the point budget.
    if (committedPoints() + points > current.goal) return false;
    current.tasks.push({
      id: 't' + Date.now() + Math.random().toString(36).slice(2, 6),
      name: name,
      points: points,
      done: false
    });
    save(LS_CURRENT, current);
    renderTasks();
    return true;
  }

  function toggleTask(id) {
    var t = current.tasks.find(function (x) { return x.id === id; });
    if (!t) return;
    var wasComplete = earnedPoints() >= current.goal;
    t.done = !t.done;
    save(LS_CURRENT, current);
    renderTasks();
    if (!wasComplete && earnedPoints() >= current.goal) burstConfetti();
  }

  function deleteTask(id) {
    current.tasks = current.tasks.filter(function (x) { return x.id !== id; });
    save(LS_CURRENT, current);
    renderTasks();
  }

  function initTaskScreen() {
    var ptBtns = document.querySelectorAll('.pt-btn');
    for (var i = 0; i < ptBtns.length; i++) {
      ptBtns[i].addEventListener('click', function () {
        if (this.disabled) return;
        selectedPoints = parseInt(this.getAttribute('data-pts'), 10);
        for (var k = 0; k < ptBtns.length; k++) ptBtns[k].classList.remove('selected');
        this.classList.add('selected');
      });
    }

    $('add-task-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('task-name');
      if (addTask(input.value, selectedPoints)) {
        input.value = '';
        input.focus();
      }
    });

    $('end-day-btn').addEventListener('click', endDay);

    $('abandon-btn').addEventListener('click', function () {
      if (current && current.tasks.length > 0 &&
          !confirm('Start over? Your current tasks for today will be cleared.')) return;
      current = null;
      save(LS_CURRENT, null);
      showScreen('difficulty');
    });
  }

  /* ===================== Grading ===================== */
  function gradeFor(pct) {
    if (pct >= 90) return { letter: 'A', color: '#2ecc71' };
    if (pct >= 80) return { letter: 'B', color: '#7bed9f' };
    if (pct >= 70) return { letter: 'C', color: '#ff9f43' };
    if (pct >= 60) return { letter: 'D', color: '#ffb142' };
    if (pct >= 50) return { letter: 'E', color: '#ff7f50' };
    return { letter: 'F', color: '#ff5e7e' };
  }

  function messageFor(pct) {
    if (pct >= 100) return 'Flawless — you crushed your goal! 🏆';
    if (pct >= 90) return 'Outstanding day. Keep this rhythm going!';
    if (pct >= 70) return 'Strong effort — you showed up. 💪';
    if (pct >= 50) return 'Halfway there. Tomorrow is another quest.';
    if (pct > 0) return 'Every point counts. Reset and go again.';
    return 'No points yet — but starting is the hardest part.';
  }

  function endDay() {
    if (!current || current.tasks.length === 0) return;

    var earned = earnedPoints();
    var goal = current.goal;
    var pct = Math.min(100, Math.round((earned / goal) * 100));
    var score = Math.round((pct / 10) * 10) / 10;   // out of 10, one decimal
    var grade = gradeFor(pct);

    var record = {
      date: new Date().toISOString(),
      difficulty: current.difficulty,
      goal: goal,
      earned: earned,
      taskCount: current.tasks.length,
      doneCount: current.tasks.filter(function (t) { return t.done; }).length,
      percentage: pct,
      score: score,
      grade: grade.letter,
      reachedGoal: earned >= goal
    };
    history.push(record);
    save(LS_HISTORY, history);

    current = null;
    save(LS_CURRENT, null);

    renderResults(record, grade);
    showScreen('results');
    if (pct >= 90) burstConfetti();
  }

  function renderResults(rec, grade) {
    var ring = $('grade-ring');
    ring.style.setProperty('--ring', grade.color);
    ring.style.setProperty('--deg', Math.round((rec.percentage / 100) * 360) + 'deg');
    $('grade-letter').textContent = grade.letter;
    $('grade-letter').style.color = grade.color;

    $('result-score').textContent = rec.score;
    $('result-pct').textContent = rec.percentage + '%';
    $('result-detail').textContent =
      'You earned ' + rec.earned + ' of ' + rec.goal + ' points across ' +
      rec.doneCount + ' of ' + rec.taskCount + ' tasks.';
    $('result-message').textContent = messageFor(rec.percentage);
  }

  function initResultsScreen() {
    $('new-day-btn').addEventListener('click', function () { showScreen('difficulty'); });
    $('view-analytics-btn').addEventListener('click', renderAnalytics);
  }

  /* ===================== Analytics ===================== */
  function gradePoint(letter) {
    return { A: 4, B: 3, C: 2, D: 1, E: 0.5, F: 0 }[letter] || 0;
  }

  function renderAnalytics() {
    showScreen('analytics');
    $('stat-days').textContent = history.length;

    if (history.length) {
      var avgScore = history.reduce(function (s, d) { return s + d.score; }, 0) / history.length;
      $('stat-avg').textContent = (Math.round(avgScore * 10) / 10) + '/10';

      var best = history.reduce(function (b, d) {
        return gradePoint(d.grade) > gradePoint(b.grade) ? d : b;
      });
      $('stat-best').textContent = best.grade;

      var streak = 0;
      for (var i = history.length - 1; i >= 0; i--) {
        if (history[i].reachedGoal) streak++; else break;
      }
      $('stat-streak').textContent = streak;
    } else {
      $('stat-avg').textContent = '–';
      $('stat-best').textContent = '–';
      $('stat-streak').textContent = '0';
    }

    renderChart();
    renderHistoryTable();
  }

  function renderChart() {
    var chart = $('chart');
    chart.innerHTML = '';
    var recent = history.slice(-14);
    if (!recent.length) {
      var empty = el('p', 'chart-empty');
      empty.textContent = 'No data yet.';
      chart.appendChild(empty);
      return;
    }
    recent.forEach(function (d) {
      var wrap = el('div', 'chart-bar-wrap');
      var bar = el('div', 'chart-bar' + (d.reachedGoal ? ' complete' : ''));
      bar.style.height = Math.max(3, d.percentage) + '%';
      bar.title = d.percentage + '% · ' + d.grade + ' · ' + d.difficulty;
      var lbl = el('span', 'chart-bar-lbl');
      lbl.textContent = shortDate(d.date);
      wrap.appendChild(bar);
      wrap.appendChild(lbl);
      chart.appendChild(wrap);
    });
  }

  function renderHistoryTable() {
    var body = $('history-body');
    body.innerHTML = '';
    $('history-empty').hidden = history.length > 0;
    $('clear-history-btn').hidden = history.length === 0;

    history.slice().reverse().forEach(function (d) {
      var tr = el('tr');
      tr.appendChild(td(fullDate(d.date)));
      tr.appendChild(td(d.difficulty));
      tr.appendChild(td(d.earned + '/' + d.goal));
      tr.appendChild(td(d.score + '/10'));
      tr.appendChild(td(d.percentage + '%'));

      var gtd = el('td');
      var pill = el('span', 'grade-pill');
      pill.textContent = d.grade;
      pill.style.color = gradeFor(d.percentage).color;
      pill.style.background = 'rgba(255,255,255,.06)';
      gtd.appendChild(pill);
      tr.appendChild(gtd);

      body.appendChild(tr);
    });
  }

  function td(text) { var c = el('td'); c.textContent = text; return c; }
  function shortDate(iso) { var d = new Date(iso); return (d.getMonth() + 1) + '/' + d.getDate(); }
  function fullDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function initAnalyticsScreen() {
    $('clear-history-btn').addEventListener('click', function () {
      if (!confirm('Clear all logged days? This cannot be undone.')) return;
      history = [];
      save(LS_HISTORY, history);
      renderAnalytics();
    });
  }

  /* ===================== Google Sign-In ===================== */
  // Decode a JWT payload (no verification — used only for display/personalization).
  function decodeJwt(token) {
    var part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    var json = decodeURIComponent(atob(part).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(json);
  }

  function handleCredential(resp) {
    try {
      var p = decodeJwt(resp.credential);
      user = { name: p.name, given_name: p.given_name, email: p.email, picture: p.picture, sub: p.sub };
      save(LS_USER, user);
      renderAuth();
    } catch (e) { /* ignore malformed token */ }
  }

  function renderAuth() {
    var chip = $('profile-chip');
    var signedout = $('auth-signedout');
    var signedin = $('auth-signedin');
    if (user) {
      if (chip) {
        chip.hidden = false;
        $('profile-avatar').src = user.picture || '';
        $('profile-name').textContent = user.given_name || user.name || 'You';
      }
      if (signedout) signedout.hidden = true;
      if (signedin) {
        signedin.hidden = false;
        $('auth-avatar').src = user.picture || '';
        $('auth-hello').textContent = 'Signed in as ' + (user.name || user.email || 'you');
      }
    } else {
      if (chip) chip.hidden = true;
      if (signedout) signedout.hidden = false;
      if (signedin) signedin.hidden = true;
    }
  }

  function initGoogle() {
    var setup = $('auth-setup');
    var host = $('g_id_signin');
    if (!GOOGLE_CLIENT_ID) {
      if (setup) setup.hidden = false;
      if (host) host.style.display = 'none';
      return;
    }
    if (setup) setup.hidden = true;
    if (!(window.google && window.google.accounts && window.google.accounts.id)) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleCredential,
      auto_select: false
    });
    if (host) {
      host.style.display = '';
      window.google.accounts.id.renderButton(host, {
        type: 'standard', theme: 'filled_blue', size: 'large', shape: 'pill', text: 'signin_with'
      });
    }
  }
  // GSI calls this global once its script finishes loading.
  window.onGoogleLibraryLoad = initGoogle;

  function signOut() {
    user = null;
    save(LS_USER, null);
    try { if (window.google && window.google.accounts) window.google.accounts.id.disableAutoSelect(); }
    catch (e) { /* ignore */ }
    renderAuth();
  }

  /* ===================== Confetti ===================== */
  var confettiCanvas, cctx, confettiPieces = [], confettiRAF = null;
  function burstConfetti() {
    confettiCanvas = $('confetti');
    if (!confettiCanvas) return;
    cctx = confettiCanvas.getContext('2d');
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;

    var colors = ['#6c5ce7', '#8a7bff', '#2ecc71', '#ff9f43', '#ff5e7e', '#7bed9f'];
    for (var i = 0; i < 120; i++) {
      confettiPieces.push({
        x: Math.random() * confettiCanvas.width,
        y: -20 - Math.random() * confettiCanvas.height * 0.4,
        r: 4 + Math.random() * 5,
        c: colors[Math.floor(Math.random() * colors.length)],
        vx: -2 + Math.random() * 4,
        vy: 2 + Math.random() * 4,
        rot: Math.random() * Math.PI,
        vr: -0.2 + Math.random() * 0.4,
        life: 100 + Math.random() * 60
      });
    }
    if (!confettiRAF) animateConfetti();
  }

  function animateConfetti() {
    cctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    for (var i = confettiPieces.length - 1; i >= 0; i--) {
      var p = confettiPieces[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.vr; p.life--;
      cctx.save();
      cctx.translate(p.x, p.y);
      cctx.rotate(p.rot);
      cctx.fillStyle = p.c;
      cctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
      cctx.restore();
      if (p.life <= 0 || p.y > confettiCanvas.height + 30) confettiPieces.splice(i, 1);
    }
    if (confettiPieces.length) {
      confettiRAF = requestAnimationFrame(animateConfetti);
    } else {
      cctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      confettiRAF = null;
    }
  }

  /* ===================== Boot ===================== */
  function goHome() {
    if (current && current.goal) { renderTasks(); showScreen('tasks'); }
    else { showScreen('difficulty'); }
  }

  function init() {
    initDifficultyScreen();
    initTaskScreen();
    initResultsScreen();
    initAnalyticsScreen();

    var navBtns = document.querySelectorAll('.nav-btn');
    for (var i = 0; i < navBtns.length; i++) {
      navBtns[i].addEventListener('click', function () {
        if (this.getAttribute('data-nav') === 'analytics') renderAnalytics();
        else goHome();
      });
    }
    $('brand-home').addEventListener('click', goHome);

    // Auth wiring
    var soA = $('auth-signout'); if (soA) soA.addEventListener('click', signOut);
    var soB = $('signout-btn');  if (soB) soB.addEventListener('click', signOut);
    renderAuth();
    initGoogle(); // in case the GSI script already loaded

    if (current && current.goal) { renderTasks(); showScreen('tasks'); }
    else { showScreen('difficulty'); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
