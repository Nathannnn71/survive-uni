/* ============ CampusQuest app logic ============ */

// ---------- XP / level system ----------

const XP_VALUES = {
  assignment: 25,
  class: 10,
  deadline: 30,
  study: 15,
  group: 20,
  joinEvent: 30,
  hostEvent: 60,
};

const XP_PER_LEVEL = 100;

const LEVEL_TITLES = [
  "Fresh Fresher",        // Lv 1
  "Lecture Lurker",       // Lv 2
  "Library Regular",      // Lv 3
  "Group Chat MVP",       // Lv 4
  "Deadline Dodger",      // Lv 5
  "Society Star",         // Lv 6
  "Campus Legend",        // Lv 7
  "Dean's Favourite",     // Lv 8+
];

function levelFromXp(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function levelProgress(xp) {
  return xp % XP_PER_LEVEL; // 0..99 XP into current level
}

function titleForLevel(level) {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
}

// ---------- persistent state ----------

const STORAGE_KEY = "campusquest-v1";

const defaultState = {
  xp: 0,
  eventsJoined: 0,
  eventsHosted: 0,
  tasks: [
    { id: 1, title: "COMP1511 assignment 2 — linked lists", subject: "COMP1511", type: "assignment", day: "Wed", done: false },
    { id: 2, title: "MATH1131 tutorial homework (ch. 4)", subject: "MATH1131", type: "deadline", day: "Fri", done: false },
    { id: 3, title: "PSYC1001 lecture — memory & learning", subject: "PSYC1001", type: "class", day: "Tue", done: false },
    { id: 4, title: "Split flat cleaning roster with the group", subject: "LIFE", type: "group", day: "Sat", done: false },
  ],
  joinedEventIds: [],
  hostedEvents: [],
  nextId: 5,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* corrupted storage -> start fresh */ }
  return structuredClone(defaultState);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

// ---------- static demo data ----------

const CAMPUS_EVENTS = [
  { id: "e1", emoji: "🍕", name: "CompSoc pizza & code night", host: "CompSoc", goers: 42 },
  { id: "e2", emoji: "🏸", name: "Badminton club social — beginners welcome", host: "Badminton Club", goers: 18 },
  { id: "e3", emoji: "🎬", name: "Film society: exam-season comfort movies", host: "Film Society", goers: 27 },
  { id: "e4", emoji: "📖", name: "Library level-3 silent study sprint", host: "StudyWell", goers: 55 },
  { id: "e5", emoji: "🎤", name: "Open mic night at the campus bar", host: "Student Union", goers: 63 },
  { id: "e6", emoji: "🧠", name: "Psych society trivia showdown", host: "PsychSoc", goers: 31 },
];

const FRIENDS = [
  { name: "Maya", avatar: "🦊", xp: 415, joined: 9, hosted: 2 },
  { name: "Dev", avatar: "🐼", xp: 350, joined: 7, hosted: 3 },
  { name: "Sofia", avatar: "🐸", xp: 280, joined: 6, hosted: 1 },
  { name: "Liam", avatar: "🐨", xp: 190, joined: 4, hosted: 0 },
  { name: "Amara", avatar: "🐯", xp: 120, joined: 3, hosted: 1 },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TYPE_LABELS = {
  assignment: "📝 Assignment",
  class: "🏫 Class",
  deadline: "⏰ Deadline",
  study: "📖 Study",
  group: "👥 Group task",
};

// ---------- element handles ----------

const $ = (sel) => document.querySelector(sel);

const els = {
  playerLevelBadge: $("#player-level-badge"),
  playerTitle: $("#player-title"),
  playerXpFill: $("#player-xp-fill"),
  playerXpLabel: $("#player-xp-label"),
  taskForm: $("#task-form"),
  taskTitle: $("#task-title"),
  taskSubject: $("#task-subject"),
  taskType: $("#task-type"),
  taskDay: $("#task-day"),
  taskList: $("#task-list"),
  taskEmpty: $("#task-empty"),
  weekProgressText: $("#week-progress-text"),
  weekProgressFill: $("#week-progress-fill"),
  statJoined: $("#stat-joined"),
  statHosted: $("#stat-hosted"),
  statXp: $("#stat-xp"),
  hostForm: $("#host-form"),
  hostTitle: $("#host-title"),
  eventList: $("#event-list"),
  leaderboard: $("#leaderboard"),
  toast: $("#toast"),
  confettiLayer: $("#confetti-layer"),
};

let taskFilter = "all";

// ---------- XP helpers ----------

function awardXp(amount, reason) {
  const before = levelFromXp(state.xp);
  state.xp += amount;
  const after = levelFromXp(state.xp);
  saveState();
  renderPlayer();
  renderStats();
  renderLeaderboard();
  if (after > before) {
    showToast(`🎉 LEVEL UP! You're now Lv ${after} — ${titleForLevel(after)}`);
    burstConfetti();
  } else if (reason) {
    showToast(`+${amount} XP · ${reason}`);
  }
}

function removeXp(amount) {
  state.xp = Math.max(0, state.xp - amount);
  saveState();
  renderPlayer();
  renderStats();
  renderLeaderboard();
}

// ---------- rendering ----------

function renderPlayer() {
  const level = levelFromXp(state.xp);
  const into = levelProgress(state.xp);
  els.playerLevelBadge.textContent = `Lv ${level}`;
  els.playerTitle.textContent = titleForLevel(level);
  els.playerXpFill.style.width = `${(into / XP_PER_LEVEL) * 100}%`;
  els.playerXpLabel.textContent = `${into} / ${XP_PER_LEVEL} XP · ${state.xp} total`;
}

function renderTasks() {
  const tasks = state.tasks.filter((t) => {
    if (taskFilter === "todo") return !t.done;
    if (taskFilter === "done") return t.done;
    return true;
  });

  els.taskList.innerHTML = "";
  els.taskEmpty.classList.toggle("hidden", tasks.length > 0);

  // Sort by day of week, done tasks sink to the bottom
  tasks
    .slice()
    .sort((a, b) => (a.done - b.done) || (DAYS.indexOf(a.day) - DAYS.indexOf(b.day)))
    .forEach((task) => {
      const row = document.createElement("div");
      row.className = `task${task.done ? " done" : ""}`;

      const check = document.createElement("button");
      check.className = "task-check";
      check.title = task.done ? "Mark as not done" : "Mark done";
      check.textContent = task.done ? "✓" : "";
      check.addEventListener("click", () => toggleTask(task.id));

      const body = document.createElement("div");
      body.className = "task-body";

      const title = document.createElement("div");
      title.className = "task-title";
      title.textContent = task.title;

      const meta = document.createElement("div");
      meta.className = "task-meta";
      meta.innerHTML =
        `<span class="badge subject">${task.subject}</span>` +
        `<span class="badge">${TYPE_LABELS[task.type]}</span>` +
        `<span class="badge day">📆 ${task.day}</span>` +
        `<span class="badge xp">+${XP_VALUES[task.type]} XP</span>`;

      body.append(title, meta);

      const del = document.createElement("button");
      del.className = "task-del";
      del.title = "Delete task";
      del.textContent = "🗑";
      del.addEventListener("click", () => deleteTask(task.id));

      row.append(check, body, del);
      els.taskList.append(row);
    });

  renderWeekProgress();
}

function renderWeekProgress() {
  const total = state.tasks.length;
  const done = state.tasks.filter((t) => t.done).length;
  els.weekProgressText.textContent = `${done} / ${total} done this week`;
  els.weekProgressFill.style.width = total ? `${(done / total) * 100}%` : "0%";
}

function renderStats() {
  els.statJoined.textContent = state.eventsJoined;
  els.statHosted.textContent = state.eventsHosted;
  els.statXp.textContent = state.xp;
}

function renderEvents() {
  els.eventList.innerHTML = "";

  const yourEvents = state.hostedEvents.map((ev) => ({ ...ev, hostedByYou: true }));
  const all = [...yourEvents, ...CAMPUS_EVENTS];

  all.forEach((ev) => {
    const card = document.createElement("div");
    card.className = `event-card${ev.hostedByYou ? " hosted-by-you" : ""}`;

    const top = document.createElement("div");
    top.className = "event-top";

    const emoji = document.createElement("span");
    emoji.className = "event-emoji";
    emoji.textContent = ev.emoji;

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "event-name";
    name.textContent = ev.name;
    const host = document.createElement("div");
    host.className = "event-host";
    host.textContent = `hosted by ${ev.hostedByYou ? "you 🎤" : ev.host}`;
    info.append(name, host);

    top.append(emoji, info);

    const actions = document.createElement("div");
    actions.className = "event-actions";

    if (ev.hostedByYou) {
      const tag = document.createElement("span");
      tag.className = "host-tag";
      tag.textContent = "You're the host · +60 XP earned";
      actions.append(tag);
    } else {
      const joined = state.joinedEventIds.includes(ev.id);
      const btn = document.createElement("button");
      btn.className = `btn btn-join${joined ? " joined" : ""}`;
      btn.textContent = joined ? "✓ Joined" : "Join (+30 XP)";
      btn.disabled = joined;
      btn.addEventListener("click", () => joinEvent(ev.id, ev.name));
      actions.append(btn);
    }

    const goers = document.createElement("span");
    goers.className = "event-goers";
    const count = ev.goers + (state.joinedEventIds.includes(ev.id) ? 1 : 0);
    goers.textContent = `👥 ${count} going`;
    actions.append(goers);

    card.append(top, actions);
    els.eventList.append(card);
  });
}

function renderLeaderboard() {
  const you = {
    name: "You",
    avatar: "🦉",
    xp: state.xp,
    joined: state.eventsJoined,
    hosted: state.eventsHosted,
    isYou: true,
  };

  const players = [...FRIENDS, you].sort((a, b) => b.xp - a.xp);
  const medals = ["🥇", "🥈", "🥉"];

  els.leaderboard.innerHTML = "";

  players.forEach((p, i) => {
    const level = levelFromXp(p.xp);
    const into = levelProgress(p.xp);

    const row = document.createElement("div");
    row.className = `lb-row${p.isYou ? " you" : ""}`;

    row.innerHTML = `
      <span class="lb-rank">${medals[i] || "#" + (i + 1)}</span>
      <span class="lb-avatar">${p.avatar}</span>
      <div class="lb-main">
        <div class="lb-name-row">
          <span class="lb-name"></span>
          <span class="lb-title">${titleForLevel(level)}</span>
        </div>
        <div class="lb-stats">🎪 ${p.joined} joined · 🎤 ${p.hosted} hosted</div>
        <div class="funbar lb-funbar" title="XP to next level">
          <div class="funbar-fill" style="width:${(into / XP_PER_LEVEL) * 100}%"></div>
          <span class="funbar-label">${into} / ${XP_PER_LEVEL} XP</span>
        </div>
      </div>
      <div class="lb-level">
        <span class="lb-lv">Lv ${level}</span>
        <span class="lb-xp">${p.xp} XP</span>
      </div>
    `;
    row.querySelector(".lb-name").textContent = p.name;

    els.leaderboard.append(row);
  });
}

// ---------- actions ----------

function addTask(title, subject, type, day) {
  state.tasks.push({ id: state.nextId++, title, subject, type, day, done: false });
  saveState();
  renderTasks();
  showToast("Task added — go get that XP 💪");
}

function toggleTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  task.done = !task.done;
  saveState();
  renderTasks();
  if (task.done) {
    awardXp(XP_VALUES[task.type], `${TYPE_LABELS[task.type]} done`);
  } else {
    removeXp(XP_VALUES[task.type]);
  }
}

function deleteTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  if (task.done) removeXp(XP_VALUES[task.type]);
  state.tasks = state.tasks.filter((t) => t.id !== id);
  saveState();
  renderTasks();
}

function joinEvent(id, name) {
  if (state.joinedEventIds.includes(id)) return;
  state.joinedEventIds.push(id);
  state.eventsJoined += 1;
  saveState();
  renderEvents();
  awardXp(XP_VALUES.joinEvent, `joined "${name}"`);
}

function hostEvent(name) {
  const emojis = ["🎉", "🍜", "🎮", "☕", "🧋", "🎲", "🏀", "🎧"];
  state.hostedEvents.unshift({
    id: `you-${Date.now()}`,
    emoji: emojis[Math.floor(Math.random() * emojis.length)],
    name,
    goers: Math.floor(Math.random() * 10) + 3,
  });
  state.eventsHosted += 1;
  saveState();
  renderEvents();
  awardXp(XP_VALUES.hostEvent, `hosting "${name}"`);
}

// ---------- toast + confetti ----------

let toastTimer = null;

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.add("hidden"), 2600);
}

function burstConfetti() {
  const pieces = ["🎉", "⭐", "✨", "🎊", "💜"];
  for (let i = 0; i < 24; i++) {
    const el = document.createElement("span");
    el.className = "confetti";
    el.textContent = pieces[Math.floor(Math.random() * pieces.length)];
    el.style.left = `${Math.random() * 100}vw`;
    el.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
    el.style.animationDelay = `${Math.random() * 0.4}s`;
    els.confettiLayer.append(el);
    setTimeout(() => el.remove(), 4000);
  }
}

// ---------- wiring ----------

function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      $(`#tab-${tab.dataset.tab}`).classList.add("active");
    });
  });
}

function setupForms() {
  DAYS.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    els.taskDay.append(opt);
  });

  els.taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = els.taskTitle.value.trim();
    if (!title) return;
    addTask(title, els.taskSubject.value, els.taskType.value, els.taskDay.value);
    els.taskTitle.value = "";
    els.taskTitle.focus();
  });

  els.hostForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = els.hostTitle.value.trim();
    if (!name) return;
    hostEvent(name);
    els.hostTitle.value = "";
  });

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      taskFilter = chip.dataset.filter;
      renderTasks();
    });
  });
}

// ---------- boot ----------

setupTabs();
setupForms();
renderPlayer();
renderTasks();
renderStats();
renderEvents();
renderLeaderboard();
