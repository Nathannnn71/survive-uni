# ⚡ CampusQuest

CampusQuest is a gamified productivity app where students earn XP by completing tasks and attending club events. Inspired by Pokemon Go's personal progress system — you see detailed stats about yourself, but only general info about others.

Built with plain HTML, CSS and JavaScript — no build step, no dependencies. Progress persists in the browser via `localStorage`.

## Running it

Open `index.html` in any browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Features

### 🏠 Personal Dashboard
- Profile card with avatar, name and level badge.
- Animated **XP "fun bar"** showing progress to the next level.
- Weekly stats: tasks completed, events attended, current streak, total XP.
- Achievement badges in a grid (locked/unlocked), plus quick actions and an "Up next" deadline list.

### ✅ Task Manager
- Add tasks with title, category (Assignments, Exams, Projects, Study Sessions, Readings), due date and difficulty.
- Satisfying completion animation; overdue tasks highlighted in red.
- XP by difficulty: Easy **+10**, Medium **+25**, Hard **+50**.

### 🎪 Club Events
- Browse events hosted by campus clubs — only clubs can host, no user-created events (prevents XP farming).
- Filter by club and category (Academic, Social, Sports, Arts).
- RSVP, then check in at the event to earn **+30 XP**.
- Cards show club logo, date/time, location and attendee counts.

### ⭐ XP & Leveling

| Action | XP |
| --- | --- |
| Complete easy task | +10 |
| Complete medium task | +25 |
| Complete hard task | +50 |
| Attend club event | +30 |
| Daily login | +5 |
| 7-day streak bonus | +50 |

Exponential level curve: Lv 2 at 100 XP, Lv 3 at 250, Lv 4 at 500, Lv 5 at 1000, doubling from there. Level-ups trigger a celebration overlay with confetti.

### 🏆 Campus Leaderboard
- **Your view:** detailed stats — tasks all-time, events, streak, achievements.
- **Others' view:** just level, XP and weekly task count (privacy by design).
- Weekly / Monthly / All-time toggle; top 10 shown and your rank always visible.

### 📚 Resource Library
- Share helpful links (notes, videos, tools) categorised by subject.
- Upvote system; sorted by votes.

## Data layer

The app runs fully client-side against `localStorage`. A Supabase-ready schema matching the app's data model (users, tasks, clubs, events, event_attendees, achievements, user_achievements, resources) with row-level-security policies and a summarised leaderboard view lives in [`supabase/schema.sql`](supabase/schema.sql) for when a real backend is needed.

## Project structure

```
index.html          — markup for the five screens
css/style.css       — purple/indigo + mint theme, animations
js/app.js           — state, XP/level engine, streaks, achievements, rendering
supabase/schema.sql — database schema + RLS for a future Supabase backend
```
