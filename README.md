# 🎓 CampusQuest

A gamified student survival web app: track your week, join campus events, and climb a level-based leaderboard with your friend group. Built with plain HTML, CSS and JavaScript — no build step, no dependencies.

## Running it

Open `index.html` in any browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Your progress is saved in the browser via `localStorage`.

## Features

### 📅 This Week
- Add assignments, classes, deadlines, study sessions and group tasks for the week ahead.
- Tag tasks with a subject (COMP1511, MATH1131, PSYC1001, …) and a day.
- Tick tasks off to earn XP; unticking or deleting a done task takes the XP back.
- Filter by *To do* / *Done* and watch the weekly progress bar fill up.

### 🎪 Campus Events
- Join society events (pizza & code night, badminton socials, trivia…) for **+30 XP**.
- Host your own events — pizza nights, cram sessions, anything — for **+60 XP**.
- Live counters for events joined, events hosted and total XP.

### 🏆 Leaderboard & the Fun Bar
- Level-based leaderboard alongside your friend group (demo friends included).
- Every player has a **fun bar** — an animated loading-style XP bar showing progress to their next level — plus their events joined & hosted counts to show off.
- Level up every 100 XP to unlock titles like *Library Regular*, *Group Chat MVP*, *Deadline Dodger* and *Campus Legend*, with a confetti burst on level-up.

## XP values

| Action | XP |
| --- | --- |
| Class attended | +10 |
| Study session | +15 |
| Group task | +20 |
| Assignment | +25 |
| Deadline hit | +30 |
| Event joined | +30 |
| Event hosted | +60 |

## Project structure

```
index.html    — markup for the three tabs (week, events, leaderboard)
css/style.css — theme, fun bars, cards, animations
js/app.js     — state, XP/level system, rendering, localStorage persistence
```
