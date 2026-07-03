/* ============ CampusQuest — gamified student productivity ============ */

// ---------- helpers ----------

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const DAY_MS = 24 * 60 * 60 * 1000;

function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function offsetDateStr(days) {
  return localDateStr(new Date(Date.now() + days * DAY_MS));
}

function formatDue(dateStr) {
  const today = localDateStr();
  if (dateStr === today) return "Today";
  if (dateStr === offsetDateStr(1)) return "Tomorrow";
  if (dateStr === offsetDateStr(-1)) return "Yesterday";
  const d = new Date(dateStr + "T00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

// ---------- XP / leveling (exponential curve) ----------

const XP_BY_DIFFICULTY = { easy: 10, medium: 25, hard: 50 };
const XP_EVENT_CHECKIN = 30;
const XP_DAILY_LOGIN = 5;
const XP_STREAK_BONUS = 50;

// Lv1: 0, Lv2: 100, Lv3: 250, Lv4: 500, Lv5: 1000, then doubling
function thresholdForLevel(level) {
  const base = [0, 0, 100, 250, 500, 1000]; // index = level
  if (level <= 5) return base[level];
  let t = 1000;
  for (let i = 5; i < level; i++) t *= 2;
  return t;
}

function levelFromXp(xp) {
  let level = 1;
  while (xp >= thresholdForLevel(level + 1)) level++;
  return level;
}

function levelInfo(xp) {
  const level = levelFromXp(xp);
  const cur = thresholdForLevel(level);
  const next = thresholdForLevel(level + 1);
  const pct = Math.min(100, Math.round(((xp - cur) / (next - cur)) * 100));
  return { level, cur, next, pct };
}

// ---------- static data: clubs, events, achievements, leaderboard ----------

const CLUBS = [
  { id: "cs", name: "Computer Science Society", logo: "💻", category: "Academic" },
  { id: "drama", name: "Drama Club", logo: "🎭", category: "Arts" },
  { id: "hike", name: "Hiking & Outdoors", logo: "🥾", category: "Sports" },
  { id: "photo", name: "Photography Club", logo: "📸", category: "Arts" },
  { id: "debate", name: "Debate Society", logo: "🗣️", category: "Academic" },
  { id: "isa", name: "International Students Association", logo: "🌏", category: "Social" },
];

const EVENTS = [
  { id: "ev1", club: "cs", title: "Intro to Python Workshop", category: "Academic", dayOffset: 2, time: "17:00", location: "Engineering Building 204", max: 40, base: 28 },
  { id: "ev2", club: "hike", title: "Weekend Nature Hike", category: "Sports", dayOffset: 4, time: "09:00", location: "North Gate meetup point", max: 25, base: 17 },
  { id: "ev3", club: "drama", title: "Open Mic Night", category: "Arts", dayOffset: 3, time: "20:00", location: "Student Union Bar", max: 80, base: 54 },
  { id: "ev4", club: "photo", title: "Golden Hour Photo Walk", category: "Arts", dayOffset: 5, time: "18:00", location: "Campus Lake", max: 20, base: 11 },
  { id: "ev5", club: "debate", title: "Beginners' Debate Night", category: "Academic", dayOffset: 6, time: "19:00", location: "Law Building 1.02", max: 30, base: 19 },
  { id: "ev6", club: "isa", title: "International Food Fair", category: "Social", dayOffset: 7, time: "12:00", location: "Main Quad", max: 200, base: 132 },
  { id: "ev7", club: "cs", title: "Retro Game Night", category: "Social", dayOffset: 1, time: "19:00", location: "CS Common Room", max: 35, base: 22 },
  { id: "ev8", club: "isa", title: "Coffee & Conversation", category: "Social", dayOffset: 2, time: "16:00", location: "Library Café", max: 30, base: 14 },
];

const ACHIEVEMENTS = [
  { id: "first-task", icon: "✅", name: "First Steps", desc: "Complete your first task", check: (s) => s.tasksCompleted >= 1 },
  { id: "task-10", icon: "📚", name: "Task Machine", desc: "Complete 10 tasks", check: (s) => s.tasksCompleted >= 10 },
  { id: "hard-task", icon: "💪", name: "Challenge Accepted", desc: "Complete a Hard task", check: (s) => s.hardCompleted >= 1 },
  { id: "first-event", icon: "🎪", name: "Show Up", desc: "Check in to an event", check: (s) => s.eventsAttended >= 1 },
  { id: "event-3", icon: "🦋", name: "Social Butterfly", desc: "Attend 3 events", check: (s) => s.eventsAttended >= 3 },
  { id: "streak-7", icon: "🔥", name: "Week Warrior", desc: "Keep a 7-day streak", check: (s) => s.streak >= 7 },
  { id: "level-3", icon: "🌟", name: "Rising Star", desc: "Reach level 3", check: (s) => s.level >= 3 },
  { id: "level-5", icon: "👑", name: "Campus Royalty", desc: "Reach level 5", check: (s) => s.level >= 5 },
  { id: "resource-1", icon: "🔗", name: "Helpful Human", desc: "Share a resource", check: (s) => s.resourcesShared >= 1 },
];

// Demo leaderboard players (summarised stats only — privacy by design)
const FRIENDS = [
  { name: "Maya", avatar: "🦊", weekly: 165, monthly: 540, alltime: 1430, weeklyTasks: 7 },
  { name: "Dev", avatar: "🐼", weekly: 140, monthly: 470, alltime: 1210, weeklyTasks: 6 },
  { name: "Sofia", avatar: "🐸", weekly: 120, monthly: 410, alltime: 980, weeklyTasks: 5 },
  { name: "Liam", avatar: "🐨", weekly: 95, monthly: 350, alltime: 860, weeklyTasks: 4 },
  { name: "Amara", avatar: "🐯", weekly: 90, monthly: 300, alltime: 720, weeklyTasks: 4 },
  { name: "Jonas", avatar: "🦁", weekly: 75, monthly: 260, alltime: 640, weeklyTasks: 3 },
  { name: "Priya", avatar: "🐰", weekly: 70, monthly: 240, alltime: 590, weeklyTasks: 3 },
  { name: "Tom", avatar: "🐻", weekly: 55, monthly: 210, alltime: 450, weeklyTasks: 2 },
  { name: "Zoe", avatar: "🐱", weekly: 40, monthly: 170, alltime: 380, weeklyTasks: 2 },
  { name: "Hassan", avatar: "🦅", weekly: 30, monthly: 130, alltime: 290, weeklyTasks: 1 },
  { name: "Elif", avatar: "🐢", weekly: 20, monthly: 90, alltime: 180, weeklyTasks: 1 },
];

const SUBJECTS = ["Mathematics", "Computer Science", "Literature", "Biology", "Economics", "Psychology"];

const DIFF_LABELS = { easy: "🟢 Easy", medium: "🟡 Medium", hard: "🔴 Hard" };

const CATEGORY_ICONS = {
  "Assignments": "📄", "Exams": "🧠", "Projects": "🛠️", "Study Sessions": "📖", "Readings": "📚",
};

// ---------- persistent state ----------

const STORAGE_KEY = "campusquest-v2";

function defaultState() {
  return {
    totalXp: 0,
    streakDays: 0,
    lastLogin: null,
    xpLog: [], // { amt, ts }
    tasks: [
      { id: 1, title: "COMP1511 assignment 2 — linked lists", category: "Assignments", difficulty: "hard", due: offsetDateStr(3), completed: false, completedAt: null },
      { id: 2, title: "Calculus problem set (ch. 4)", category: "Assignments", difficulty: "medium", due: offsetDateStr(-1), completed: false, completedAt: null },
      { id: 3, title: "Read: memory & learning (PSYC1001)", category: "Readings", difficulty: "easy", due: offsetDateStr(1), completed: false, completedAt: null },
      { id: 4, title: "Group project: user research plan", category: "Projects", difficulty: "medium", due: offsetDateStr(6), completed: false, completedAt: null },
    ],
    rsvps: {}, // eventId -> { status: "rsvp" | "checkedin", ts }
    resources: [
      { id: 101, title: "3Blue1Brown — Essence of Linear Algebra", url: "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab", subject: "Mathematics", upvotes: 18, upvoted: false, mine: false },
      { id: 102, title: "CS50 lecture notes", url: "https://cs50.harvard.edu/x/notes/", subject: "Computer Science", upvotes: 14, upvoted: false, mine: false },
      { id: 103, title: "Khan Academy — Microeconomics", url: "https://www.khanacademy.org/economics-finance-domain/microeconomics", subject: "Economics", upvotes: 9, upvoted: false, mine: false },
      { id: 104, title: "SparkNotes — Modernist literature guides", url: "https://www.sparknotes.com/lit/", subject: "Literature", upvotes: 6, upvoted: false, mine: false },
    ],
    earnedAchievements: [],
    nextId: 200,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* corrupted storage -> start fresh */ }
  return defaultState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();
let taskFilter = "all";
let eventClubFilter = "all";
let eventCatFilter = "all";
let leaderboardPeriod = "weekly";
let resourceSubjectFilter = "all";

// ---------- XP engine ----------

function addXp(amount, reason, opts = {}) {
  const before = levelFromXp(state.totalXp);
  state.totalXp = Math.max(0, state.totalXp + amount);
  state.xpLog.push({ amt: amount, ts: Date.now() });
  const after = levelFromXp(state.totalXp);
  saveState();
  renderAll();

  if (amount > 0 && after > before) {
    showLevelUp(after);
    burstConfetti();
  } else if (amount > 0 && reason && !opts.quiet) {
    toast(`+${amount} XP · ${reason}`);
  }
  checkAchievements();
}

function xpInWindow(days) {
  const cutoff = Date.now() - days * DAY_MS;
  return Math.max(0, state.xpLog.filter((e) => e.ts >= cutoff).reduce((sum, e) => sum + e.amt, 0));
}

// ---------- daily login & streak ----------

function handleDailyLogin() {
  const today = localDateStr();
  if (state.lastLogin === today) return;

  const yesterday = offsetDateStr(-1);
  state.streakDays = state.lastLogin === yesterday ? state.streakDays + 1 : 1;
  state.lastLogin = today;
  saveState();

  addXp(XP_DAILY_LOGIN, "daily login");
  if (state.streakDays > 0 && state.streakDays % 7 === 0) {
    addXp(XP_STREAK_BONUS, `${state.streakDays}-day streak bonus! 🔥`);
  }
}

// ---------- computed stats ----------

function computeStats() {
  const weekCutoff = Date.now() - 7 * DAY_MS;
  return {
    tasksCompleted: state.tasks.filter((t) => t.completed).length,
    weeklyTasks: state.tasks.filter((t) => t.completed && t.completedAt >= weekCutoff).length,
    hardCompleted: state.tasks.filter((t) => t.completed && t.difficulty === "hard").length,
    eventsAttended: Object.values(state.rsvps).filter((r) => r.status === "checkedin").length,
    streak: state.streakDays,
    level: levelFromXp(state.totalXp),
    resourcesShared: state.resources.filter((r) => r.mine).length,
  };
}

// ---------- achievements ----------

function checkAchievements() {
  const stats = computeStats();
  let newOnes = false;
  ACHIEVEMENTS.forEach((a) => {
    if (a.check(stats) && !state.earnedAchievements.includes(a.id)) {
      state.earnedAchievements.push(a.id);
      toast(`🏅 Achievement unlocked: ${a.name}!`);
      burstConfetti();
      newOnes = true;
    }
  });
  if (newOnes) {
    saveState();
    renderAchievements();
  }
}

// ---------- rendering ----------

function renderProfile() {
  const info = levelInfo(state.totalXp);
  $("#dash-level-badge").textContent = `Lv ${info.level}`;
  $("#dash-streak").textContent = `🔥 ${state.streakDays} day streak`;
  $("#dash-level-hint").textContent =
    `${state.totalXp} XP total — ${info.next - state.totalXp} XP to Lv ${info.level + 1}`;
  $("#dash-xp-fill").style.width = `${info.pct}%`;
  $("#dash-xp-label").textContent = `${state.totalXp - info.cur} / ${info.next - info.cur} XP`;
  $("#dash-next-level").textContent = `next: Lv ${info.level + 1}`;
  $("#side-level").textContent = `Lv ${info.level} · ${state.totalXp} XP`;
  $("#side-streak").textContent = `🔥 ${state.streakDays}`;
}

function renderStats() {
  const stats = computeStats();
  $("#stat-week-tasks").textContent = stats.weeklyTasks;
  $("#stat-events").textContent = stats.eventsAttended;
  $("#stat-streak").textContent = stats.streak;
  $("#stat-xp").textContent = state.totalXp;
}

function renderAchievements() {
  const grid = $("#achievements-grid");
  grid.innerHTML = "";
  ACHIEVEMENTS.forEach((a) => {
    const unlocked = state.earnedAchievements.includes(a.id);
    const card = document.createElement("div");
    card.className = `achievement ${unlocked ? "unlocked" : "locked"}`;
    card.title = unlocked ? `${a.name} — unlocked!` : `${a.name} — locked`;

    const icon = document.createElement("span");
    icon.className = "ach-icon";
    icon.textContent = a.icon;
    const name = document.createElement("span");
    name.className = "ach-name";
    name.textContent = a.name;
    const desc = document.createElement("span");
    desc.className = "ach-desc";
    desc.textContent = a.desc;

    card.append(icon, name, desc);
    grid.append(card);
  });
}

function renderUpNext() {
  const list = $("#upnext-list");
  list.innerHTML = "";

  const today = localDateStr();
  const pending = state.tasks
    .filter((t) => !t.completed)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 4);

  if (pending.length === 0) {
    const done = document.createElement("div");
    done.className = "upnext";
    done.textContent = "🎉 Nothing pending — you're all caught up!";
    list.append(done);
    return;
  }

  pending.forEach((t) => {
    const overdue = t.due < today;
    const row = document.createElement("div");
    row.className = `upnext${overdue ? " overdue" : ""}`;

    const icon = document.createElement("span");
    icon.textContent = CATEGORY_ICONS[t.category] || "📌";
    const title = document.createElement("span");
    title.textContent = t.title;
    const when = document.createElement("span");
    when.className = "upnext-when";
    when.textContent = overdue ? `overdue · ${formatDue(t.due)}` : formatDue(t.due);

    row.append(icon, title, when);
    list.append(row);
  });
}

function renderTasks() {
  const list = $("#task-list");
  const today = localDateStr();

  const tasks = state.tasks.filter((t) => {
    if (taskFilter === "todo") return !t.completed;
    if (taskFilter === "done") return t.completed;
    return true;
  });

  list.innerHTML = "";
  $("#task-empty").classList.toggle("hidden", tasks.length > 0);

  tasks
    .slice()
    .sort((a, b) => (a.completed - b.completed) || a.due.localeCompare(b.due))
    .forEach((task) => {
      const overdue = !task.completed && task.due < today;
      const row = document.createElement("div");
      row.className = `task${task.completed ? " done" : ""}${overdue ? " overdue" : ""}`;
      row.dataset.taskId = task.id;

      const check = document.createElement("button");
      check.className = "task-check";
      check.title = task.completed ? "Mark as not done" : "Mark done";
      check.textContent = task.completed ? "✓" : "";
      check.addEventListener("click", () => toggleTask(task.id));

      const body = document.createElement("div");
      body.className = "task-body";

      const title = document.createElement("div");
      title.className = "task-title";
      title.textContent = task.title;

      const meta = document.createElement("div");
      meta.className = "task-meta";
      meta.innerHTML =
        `<span class="badge cat">${CATEGORY_ICONS[task.category] || ""} ${task.category}</span>` +
        `<span class="badge diff-${task.difficulty}">${DIFF_LABELS[task.difficulty]}</span>` +
        `<span class="badge due${overdue ? " due-overdue" : ""}">📆 ${overdue ? "Overdue · " : ""}${formatDue(task.due)}</span>` +
        `<span class="badge xp">+${XP_BY_DIFFICULTY[task.difficulty]} XP</span>`;

      body.append(title, meta);

      const del = document.createElement("button");
      del.className = "task-del";
      del.title = "Delete task";
      del.textContent = "🗑";
      del.addEventListener("click", () => deleteTask(task.id));

      row.append(check, body, del);
      list.append(row);
    });
}

function renderEvents() {
  const list = $("#event-list");
  list.innerHTML = "";

  const filtered = EVENTS.filter((ev) => {
    if (eventClubFilter !== "all" && ev.club !== eventClubFilter) return false;
    if (eventCatFilter !== "all" && ev.category !== eventCatFilter) return false;
    return true;
  }).sort((a, b) => a.dayOffset - b.dayOffset);

  $("#event-empty").classList.toggle("hidden", filtered.length > 0);

  filtered.forEach((ev) => {
    const club = CLUBS.find((c) => c.id === ev.club);
    const rsvp = state.rsvps[ev.id];
    const attendees = ev.base + (rsvp ? 1 : 0);

    const card = document.createElement("div");
    card.className = "event-card";

    const top = document.createElement("div");
    top.className = "event-top";

    const logo = document.createElement("span");
    logo.className = "club-logo";
    logo.textContent = club.logo;

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "event-name";
    name.textContent = ev.title;
    const clubName = document.createElement("div");
    clubName.className = "event-club";
    clubName.textContent = club.name;
    info.append(name, clubName);

    const cat = document.createElement("span");
    cat.className = `event-cat ${ev.category}`;
    cat.textContent = ev.category;

    top.append(logo, info, cat);

    const details = document.createElement("div");
    details.className = "event-details";
    const when = new Date(offsetDateStr(ev.dayOffset) + "T" + ev.time);
    details.innerHTML =
      `<span>🗓️ ${when.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" })} · ${when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>` +
      `<span>📍 ${ev.location}</span>`;

    const actions = document.createElement("div");
    actions.className = "event-actions";

    const btn = document.createElement("button");
    if (!rsvp) {
      btn.className = "btn btn-rsvp";
      btn.textContent = "RSVP";
      btn.addEventListener("click", () => rsvpEvent(ev.id, ev.title));
    } else if (rsvp.status === "rsvp") {
      btn.className = "btn btn-checkin";
      btn.textContent = "Check in (+30 XP)";
      btn.addEventListener("click", () => checkInEvent(ev.id, ev.title));
    } else {
      btn.className = "btn btn-attended";
      btn.textContent = "✓ Attended";
      btn.disabled = true;
    }
    actions.append(btn);

    const goers = document.createElement("span");
    goers.className = "event-goers";
    goers.textContent = `👥 ${attendees} / ${ev.max} going`;
    actions.append(goers);

    card.append(top, details, actions);
    list.append(card);
  });
}

function renderLeaderboard() {
  const container = $("#leaderboard");
  container.innerHTML = "";

  const stats = computeStats();
  const myXp = {
    weekly: xpInWindow(7),
    monthly: xpInWindow(30),
    alltime: state.totalXp,
  };

  const me = {
    name: "You",
    avatar: "🦉",
    isYou: true,
    xp: myXp[leaderboardPeriod],
    level: stats.level,
    weeklyTasks: stats.weeklyTasks,
  };

  const players = [
    ...FRIENDS.map((f) => ({
      name: f.name,
      avatar: f.avatar,
      xp: f[leaderboardPeriod],
      level: levelFromXp(f.alltime),
      weeklyTasks: f.weeklyTasks,
    })),
    me,
  ].sort((a, b) => b.xp - a.xp);

  const myRank = players.findIndex((p) => p.isYou) + 1;
  const top10 = players.slice(0, 10);
  const medals = ["🥇", "🥈", "🥉"];

  const makeRow = (p, rank) => {
    const row = document.createElement("div");
    row.className = `lb-row${p.isYou ? " you" : ""}`;

    const rankEl = document.createElement("span");
    rankEl.className = "lb-rank";
    rankEl.textContent = medals[rank - 1] || `#${rank}`;

    const avatar = document.createElement("span");
    avatar.className = "lb-avatar";
    avatar.textContent = p.avatar;

    const main = document.createElement("div");
    main.className = "lb-main";

    const nameRow = document.createElement("div");
    nameRow.className = "lb-name-row";
    const nameEl = document.createElement("span");
    nameEl.className = "lb-name";
    nameEl.textContent = p.name;
    const badge = document.createElement("span");
    badge.className = "level-badge";
    badge.textContent = `Lv ${p.level}`;
    nameRow.append(nameEl, badge);

    main.append(nameRow);

    if (p.isYou) {
      // Detailed private view — only you see this
      const detail = document.createElement("div");
      detail.className = "lb-detail";
      detail.innerHTML =
        `<span class="badge cat">📝 ${stats.tasksCompleted} tasks all-time</span>` +
        `<span class="badge diff-easy">🎪 ${stats.eventsAttended} events</span>` +
        `<span class="badge due">🔥 ${stats.streak}-day streak</span>` +
        `<span class="badge xp">🏅 ${state.earnedAchievements.length}/${ACHIEVEMENTS.length} achievements</span>`;
      main.append(detail);

      const privacy = document.createElement("div");
      privacy.className = "lb-privacy";
      privacy.textContent = "🔒 Only you can see your detailed stats";
      main.append(privacy);
    }

    const right = document.createElement("div");
    right.className = "lb-right";
    const xpEl = document.createElement("span");
    xpEl.className = "lb-xp";
    xpEl.textContent = `${p.xp} XP`;
    const sub = document.createElement("span");
    sub.className = "lb-sub";
    sub.textContent = `${p.weeklyTasks} tasks this week`;
    right.append(xpEl, sub);

    row.append(rankEl, avatar, main, right);
    return row;
  };

  top10.forEach((p, i) => container.append(makeRow(p, i + 1)));

  // Your rank is always shown, even outside the top 10
  if (myRank > 10) {
    const divider = document.createElement("div");
    divider.className = "lb-divider";
    divider.textContent = "···";
    container.append(divider);
    container.append(makeRow(me, myRank));
  }
}

function renderResources() {
  const list = $("#resource-list");
  list.innerHTML = "";

  const filtered = state.resources
    .filter((r) => resourceSubjectFilter === "all" || r.subject === resourceSubjectFilter)
    .sort((a, b) => b.upvotes - a.upvotes);

  filtered.forEach((r) => {
    const row = document.createElement("div");
    row.className = "resource";

    const up = document.createElement("button");
    up.className = `upvote${r.upvoted ? " upvoted" : ""}`;
    up.innerHTML = `<span>▲</span><span>${r.upvotes}</span>`;
    up.title = r.upvoted ? "Remove upvote" : "Upvote";
    up.addEventListener("click", () => toggleUpvote(r.id));

    const body = document.createElement("div");
    body.className = "resource-body";

    const title = document.createElement("div");
    title.className = "resource-title";
    const link = document.createElement("a");
    link.href = r.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = r.title;
    title.append(link);

    const meta = document.createElement("div");
    meta.className = "resource-meta";
    meta.innerHTML =
      `<span class="badge subj">${r.subject}</span>` +
      (r.mine ? `<span class="badge mine">shared by you</span>` : "");

    body.append(title, meta);
    row.append(up, body);
    list.append(row);
  });
}

function renderAll() {
  renderProfile();
  renderStats();
  renderAchievements();
  renderUpNext();
  renderTasks();
  renderEvents();
  renderLeaderboard();
  renderResources();
}

// ---------- actions ----------

function toggleTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  const xp = XP_BY_DIFFICULTY[task.difficulty];

  task.completed = !task.completed;
  task.completedAt = task.completed ? Date.now() : null;
  saveState();

  if (task.completed) {
    addXp(xp, `${DIFF_LABELS[task.difficulty].split(" ")[1]} task done`);
    const row = $(`.task[data-task-id="${id}"]`);
    if (row) row.classList.add("just-done");
  } else {
    addXp(-xp, null);
  }
}

function deleteTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  state.tasks = state.tasks.filter((t) => t.id !== id);
  saveState();
  if (task.completed) {
    addXp(-XP_BY_DIFFICULTY[task.difficulty], null);
  } else {
    renderAll();
  }
}

function rsvpEvent(id, title) {
  state.rsvps[id] = { status: "rsvp", ts: Date.now() };
  saveState();
  renderEvents();
  toast(`🎟️ RSVP'd to "${title}" — check in at the event for +30 XP`);
}

function checkInEvent(id, title) {
  state.rsvps[id] = { status: "checkedin", ts: Date.now() };
  saveState();
  addXp(XP_EVENT_CHECKIN, `checked in at "${title}"`);
}

function toggleUpvote(id) {
  const r = state.resources.find((x) => x.id === id);
  if (!r) return;
  r.upvoted = !r.upvoted;
  r.upvotes += r.upvoted ? 1 : -1;
  saveState();
  renderResources();
}

// ---------- toasts, level-up, confetti ----------

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  $("#toasts").append(el);
  setTimeout(() => el.remove(), 3200);
}

function showLevelUp(level) {
  $("#levelup-text").textContent = "LEVEL UP!";
  $("#levelup-sub").textContent = `You reached Lv ${level} 🎓`;
  const overlay = $("#levelup-overlay");
  overlay.classList.remove("hidden");
  setTimeout(() => overlay.classList.add("hidden"), 2200);
}

function burstConfetti() {
  const pieces = ["🎉", "⭐", "✨", "🎊", "💜", "💚"];
  const layer = $("#confetti-layer");
  for (let i = 0; i < 26; i++) {
    const el = document.createElement("span");
    el.className = "confetti";
    el.textContent = pieces[Math.floor(Math.random() * pieces.length)];
    el.style.left = `${Math.random() * 100}vw`;
    el.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
    el.style.animationDelay = `${Math.random() * 0.4}s`;
    layer.append(el);
    setTimeout(() => el.remove(), 4000);
  }
}

// ---------- wiring ----------

function setupNav() {
  $$(".nav-item").forEach((item) => {
    item.addEventListener("click", () => goToPanel(item.dataset.panel));
  });
  $$("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      goToPanel(btn.dataset.goto);
      if (btn.dataset.goto === "tasks") $("#task-title").focus();
    });
  });
}

function goToPanel(panelId) {
  $$(".panel").forEach((p) => p.classList.remove("active"));
  $(`#panel-${panelId}`).classList.add("active");
  $$(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.panel === panelId));
}

function setupForms() {
  // task form
  $("#task-due").value = offsetDateStr(1);
  $("#task-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("#task-title").value.trim();
    if (!title) return;
    state.tasks.push({
      id: state.nextId++,
      title,
      category: $("#task-category").value,
      difficulty: $("#task-difficulty").value,
      due: $("#task-due").value || localDateStr(),
      completed: false,
      completedAt: null,
    });
    saveState();
    renderAll();
    toast("📝 Task added — go earn that XP");
    $("#task-title").value = "";
    $("#task-title").focus();
  });

  // task filters
  $$("[data-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$("[data-filter]").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      taskFilter = chip.dataset.filter;
      renderTasks();
    });
  });

  // event filters
  const clubSelect = $("#event-club-filter");
  CLUBS.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.logo} ${c.name}`;
    clubSelect.append(opt);
  });
  clubSelect.addEventListener("change", () => {
    eventClubFilter = clubSelect.value;
    renderEvents();
  });

  $$(".cat-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$(".cat-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      eventCatFilter = chip.dataset.cat;
      renderEvents();
    });
  });

  // leaderboard period
  $$(".period-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$(".period-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      leaderboardPeriod = chip.dataset.period;
      renderLeaderboard();
    });
  });

  // resources
  const subjFilters = $("#subject-filters");
  SUBJECTS.forEach((s) => {
    const chip = document.createElement("button");
    chip.className = "chip subj-chip";
    chip.dataset.subj = s;
    chip.textContent = s;
    subjFilters.append(chip);
  });
  $$(".subj-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$(".subj-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      resourceSubjectFilter = chip.dataset.subj;
      renderResources();
    });
  });

  $("#resource-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("#resource-title").value.trim();
    const url = $("#resource-url").value.trim();
    if (!title || !url) return;
    state.resources.unshift({
      id: state.nextId++,
      title,
      url,
      subject: $("#resource-subject").value,
      upvotes: 1,
      upvoted: true,
      mine: true,
    });
    saveState();
    renderResources();
    checkAchievements();
    toast("🔗 Resource shared — thanks for helping out!");
    $("#resource-title").value = "";
    $("#resource-url").value = "";
  });
}

// ---------- boot ----------

setupNav();
setupForms();
renderAll();
handleDailyLogin();
checkAchievements();
