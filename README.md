# 🎯 DayQuest — Gamify Your Day

A tiny, no-fuss web app that turns your to-do list into a daily quest.

1. **Pick a difficulty** — commit to earning **10 (Easy)**, **20 (Medium)** or **30 (Hard)** points today.
2. **Build your task list** — add tasks and assign each one **1–3 points**.
3. **Tick them off** — every completed task fills the bar at the top (e.g. a 2‑point task moves you `2/10`, another moves you `4/10`…).
4. **End the day** — get a **score out of 10**, a **percentage**, and an **A–F grade**, just like an exam.
5. **Track progress** — every finished day is saved to a built-in **Analytics dashboard** (chart + history + stats).

No accounts, no servers, no build step. Everything is stored locally in your
browser via `localStorage`, so it works fully offline and is ready to drop onto
static hosting like **Hostinger**.

---

## ▶️ Run it locally

Just open `index.html` in a browser. That's it.

Or serve it (recommended, so paths behave exactly like production):

```bash
# Python
python3 -m http.server 8000
# then visit http://localhost:8000
```

---

## ☁️ Deploy to Hostinger

This is a plain static site, so deployment is copy‑and‑paste:

1. Log in to **hPanel** → your hosting plan → **File Manager** (or use FTP).
2. Open the `public_html` folder.
3. Upload the contents of this repo **into** `public_html`:
   - `index.html`
   - `css/style.css`
   - `js/app.js`
4. Visit your domain — DayQuest is live.

> Tip: upload the files themselves into `public_html` (so `index.html` sits at
> the root), not the parent folder.

---

## 📊 How scoring works

| Term         | Meaning                                                        |
|--------------|----------------------------------------------------------------|
| **Goal**     | 10 / 20 / 30 depending on the difficulty you picked.           |
| **Earned**   | Sum of points from the tasks you ticked off.                   |
| **Percentage** | `earned ÷ goal`, capped at 100%.                             |
| **Score /10**  | The percentage expressed out of 10 (e.g. 75% → 7.5/10).      |
| **Grade**    | A ≥ 90% · B ≥ 80% · C ≥ 70% · D ≥ 60% · E ≥ 50% · F otherwise. |

A **goal streak** counts how many of your most recent days hit their target.

---

## 🗂️ Project structure

```
index.html      → markup for all four screens (difficulty, tasks, results, analytics)
css/style.css   → all styling (dark theme, responsive, mobile-friendly)
js/app.js       → all logic + localStorage persistence (no dependencies)
```

---

## 🔒 Where is my data?

Entirely in your browser (`localStorage`). Nothing is uploaded anywhere.
Clearing your browser data — or using the **Clear all** button in Analytics —
removes your history.

---

## 🛣️ Roadmap (future)

- Mobile app wrapper (the core is already touch-friendly).
- Optional cloud sync / accounts.
- Recurring tasks and templates.
- Reminders / notifications.
