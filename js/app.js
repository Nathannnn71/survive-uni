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
  profile: {
    displayName: "You",
    handle: "campusquest",
    avatar: "🦉",
    major: "",
    bio: "",
  },
  mbti: {
    completed: false,
    type: null,
    scores: { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 },
    answers: [],
  },
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
    if (raw) {
      const saved = JSON.parse(raw);
      return {
        ...structuredClone(defaultState),
        ...saved,
        profile: { ...defaultState.profile, ...(saved.profile || {}) },
        mbti: { ...defaultState.mbti, ...(saved.mbti || {}), scores: { ...defaultState.mbti.scores, ...(saved.mbti?.scores || {}) } },
      };
    }
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
  { name: "Maya", avatar: "🦊", xp: 415, joined: 9, hosted: 2, mbti: "ENFP", major: "Psychology" },
  { name: "Dev", avatar: "🐼", xp: 350, joined: 7, hosted: 3, mbti: "INTJ", major: "Computer Science" },
  { name: "Sofia", avatar: "🐸", xp: 280, joined: 6, hosted: 1, mbti: "INFP", major: "Fine Arts" },
  { name: "Liam", avatar: "🐨", xp: 190, joined: 4, hosted: 0, mbti: "ESTP", major: "Business" },
  { name: "Amara", avatar: "🐯", xp: 120, joined: 3, hosted: 1, mbti: "ISFJ", major: "Nursing" },
];

const CAMPUS_STUDENTS = [
  ...FRIENDS,
  { name: "Zara", avatar: "🦄", mbti: "ENTJ", major: "Law" },
  { name: "Noah", avatar: "🐺", mbti: "INTP", major: "Physics" },
  { name: "Priya", avatar: "🦋", mbti: "ESFJ", major: "Education" },
  { name: "Oscar", avatar: "🦁", mbti: "ISTP", major: "Engineering" },
  { name: "Hana", avatar: "🐰", mbti: "ENFJ", major: "Social Work" },
  { name: "Kai", avatar: "🐙", mbti: "ENTP", major: "Economics" },
  { name: "Ella", avatar: "🌸", mbti: "ISFP", major: "Design" },
  { name: "Marcus", avatar: "🐻", mbti: "ESTJ", major: "Finance" },
  { name: "Yuki", avatar: "🐱", mbti: "INFJ", major: "Philosophy" },
  { name: "Jordan", avatar: "🦜", mbti: "ISTJ", major: "Medicine" },
  { name: "Riley", avatar: "🦔", mbti: "ESFP", major: "Music" },
];

const AVATAR_OPTIONS = ["🦉", "🦊", "🐼", "🐸", "🐨", "🐯", "🦄", "🐺", "🦋", "🦁", "🐰", "🐙", "🌸", "🐻", "🐱", "🦜"];

const MBTI_QUESTIONS = [
  { text: "At a campus party you usually…", a: { label: "Mingle with lots of people", dim: "E" }, b: { label: "Stick with a small group", dim: "I" } },
  { text: "After a long day of lectures you recharge by…", a: { label: "Calling a friend or heading out", dim: "E" }, b: { label: "Quiet time alone in your room", dim: "I" } },
  { text: "When learning something new you prefer…", a: { label: "Hands-on examples and facts", dim: "S" }, b: { label: "Big-picture ideas and patterns", dim: "N" } },
  { text: "In a group project you trust…", a: { label: "What you've tested and seen work", dim: "S" }, b: { label: "Your gut about what could work", dim: "N" } },
  { text: "A friend vents about a flatmate. You…", a: { label: "Offer practical solutions", dim: "T" }, b: { label: "Listen and validate their feelings", dim: "F" } },
  { text: "Picking a society to join, you care most about…", a: { label: "Whether the goals make logical sense", dim: "T" }, b: { label: "Whether the people feel welcoming", dim: "F" } },
  { text: "Your study planner is…", a: { label: "Colour-coded weeks ahead", dim: "J" }, b: { label: "Flexible — you go with the flow", dim: "P" } },
  { text: "Assignment due tomorrow. You…", a: { label: "Already finished (mostly)", dim: "J" }, b: { label: "Work best under last-minute pressure", dim: "P" } },
  { text: "Library study session — you sit…", a: { label: "Where you can people-watch", dim: "E" }, b: { label: "In a quiet corner", dim: "I" } },
  { text: "Reading a textbook you focus on…", a: { label: "Definitions and step-by-step proofs", dim: "S" }, b: { label: "Connections to other topics", dim: "N" } },
  { text: "Debating in tute, you argue with…", a: { label: "Evidence and consistency", dim: "T" }, b: { label: "Impact on real people", dim: "F" } },
  { text: "Weekend plans — you prefer…", a: { label: "Something booked in advance", dim: "J" }, b: { label: "Seeing how you feel on the day", dim: "P" } },
];

const MBTI_TYPE_INFO = {
  INTJ: { title: "The Architect", blurb: "Strategic and independent — great study-buddy for deep dives." },
  INTP: { title: "The Logician", blurb: "Curious problem-solver who loves debating ideas over coffee." },
  ENTJ: { title: "The Commander", blurb: "Natural organiser — will run your group project like a CEO." },
  ENTP: { title: "The Debater", blurb: "Energetic brainstormer — perfect for hackathons and startups." },
  INFJ: { title: "The Advocate", blurb: "Thoughtful and supportive — ideal for late-night life chats." },
  INFP: { title: "The Mediator", blurb: "Creative and empathetic — brings calm to stressful exam weeks." },
  ENFJ: { title: "The Protagonist", blurb: "Warm motivator — will drag you to events and make you love it." },
  ENFP: { title: "The Campaigner", blurb: "Enthusiastic connector — knows everyone on campus." },
  ISTJ: { title: "The Logistician", blurb: "Reliable and organised — shares colour-coded notes." },
  ISFJ: { title: "The Defender", blurb: "Caring and dependable — remembers your birthday and deadlines." },
  ESTJ: { title: "The Executive", blurb: "Efficient planner — keeps the flat roster actually working." },
  ESFJ: { title: "The Consul", blurb: "Social glue — hosts the best pre-drinks." },
  ISTP: { title: "The Virtuoso", blurb: "Cool under pressure — fixes your Wi-Fi and your bike." },
  ISFP: { title: "The Adventurer", blurb: "Easy-going artist — great for spontaneous food runs." },
  ESTP: { title: "The Entrepreneur", blurb: "Action-oriented — always up for intramural sport or a night out." },
  ESFP: { title: "The Entertainer", blurb: "Life of the party — makes O-Week unforgettable." },
};

// Complementary / high-compatibility pairings (classic MBTI dynamics)
const MBTI_COMPAT = {
  INTJ: ["ENFP", "ENTP", "INFJ"],
  INTP: ["ENTJ", "ENFJ", "INFJ"],
  ENTJ: ["INTP", "INFP", "ISFP"],
  ENTP: ["INFJ", "INTJ", "ISFJ"],
  INFJ: ["ENTP", "ENFP", "INTJ"],
  INFP: ["ENFJ", "ENTJ", "ESFJ"],
  ENFJ: ["INFP", "ISFP", "INTP"],
  ENFP: ["INTJ", "INFJ", "ESTJ"],
  ISTJ: ["ESFP", "ESTP", "ISFP"],
  ISFJ: ["ESFP", "ESTP", "ENFP"],
  ESTJ: ["ISFP", "ISTP", "INFP"],
  ESFJ: ["ISFP", "INFP", "ESTP"],
  ISTP: ["ESTJ", "ESFJ", "ENFJ"],
  ISFP: ["ENFJ", "ESFJ", "ESTJ"],
  ESTP: ["ISFJ", "ISTJ", "ESFJ"],
  ESFP: ["ISFJ", "ISTJ", "ESTJ"],
};

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
  profileHandle: $("#profile-handle"),
  sidebarAvatar: $("#sidebar-avatar"),
  sidebarName: $("#sidebar-name"),
  sceneDino: $("#scene-dino"),
  scenePct: $("#scene-pct"),
  sceneLevel: $("#scene-level"),
  sceneTrackFill: $("#scene-track-fill"),
  statTasks: $("#stat-tasks"),
  statJoined: $("#stat-joined"),
  statHosted: $("#stat-hosted"),
  statXp: $("#stat-xp"),
  taskForm: $("#task-form"),
  taskTitle: $("#task-title"),
  taskSubject: $("#task-subject"),
  taskType: $("#task-type"),
  taskDay: $("#task-day"),
  taskList: $("#task-list"),
  taskEmpty: $("#task-empty"),
  weekProgressText: $("#week-progress-text"),
  weekProgressFill: $("#week-progress-fill"),
  hostForm: $("#host-form"),
  hostTitle: $("#host-title"),
  eventList: $("#event-list"),
  leaderboard: $("#leaderboard"),
  notifList: $("#notif-list"),
  confettiLayer: $("#confetti-layer"),
  profileForm: $("#profile-form"),
  profileName: $("#profile-name"),
  profileHandleInput: $("#profile-handle-input"),
  profileMajor: $("#profile-major"),
  profileBio: $("#profile-bio"),
  avatarPicker: $("#avatar-picker"),
  profileAvatarDisplay: $("#profile-avatar-display"),
  profileNameDisplay: $("#profile-name-display"),
  profileHandleDisplay: $("#profile-handle-display"),
  mbtiSummary: $("#mbti-summary"),
  mbtiRetakeBtn: $("#mbti-retake-btn"),
  recommendationsHint: $("#recommendations-hint"),
  recommendationsList: $("#recommendations-list"),
  mbtiQuestionArea: $("#mbti-question-area"),
  mbtiProgressFill: $("#mbti-progress-fill"),
  mbtiProgressText: $("#mbti-progress-text"),
  mbtiBackBtn: $("#mbti-back-btn"),
  mbtiNextBtn: $("#mbti-next-btn"),
};

let taskFilter = "all";
let mbtiStep = 0;
let mbtiDraftAnswers = [];

// ---------- pixel headings: alternate letter colours ----------

function pixelifyHeadings() {
  document.querySelectorAll(".pixel-alt").forEach((el) => {
    const [a, b] = (el.dataset.alt || "pink,blue").split(",");
    const text = el.textContent;
    el.textContent = "";
    let i = 0;
    for (const ch of text) {
      if (ch === " ") {
        el.append(" ");
        continue;
      }
      const span = document.createElement("span");
      span.className = i % 2 === 0 ? `alt-${a}` : `alt-${b}`;
      span.textContent = ch;
      el.append(span);
      i++;
    }
  });
}

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
    pushNotif("green", "🎉", "LEVEL UP!", `You're now Lv ${after} — ${titleForLevel(after)}`);
    burstConfetti();
  } else if (reason) {
    pushNotif("blue", "⭐", `+${amount} XP`, reason);
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
  const pct = Math.round((into / XP_PER_LEVEL) * 100);
  const { displayName, handle, avatar } = state.profile;

  els.profileHandle.textContent = `@${handle} · Lv ${level}`;
  if (els.sidebarAvatar) els.sidebarAvatar.textContent = avatar;
  if (els.sidebarName) els.sidebarName.textContent = displayName;
  els.scenePct.textContent = `${pct}%`;
  els.sceneLevel.textContent = titleForLevel(level);
  els.sceneTrackFill.style.width = `${pct}%`;
  // dino walks from 4% (start of track) towards ~78% (just before the trophy)
  els.sceneDino.style.left = `calc(4% + ${pct * 0.74}%)`;
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
  renderStats();
}

function renderWeekProgress() {
  const total = state.tasks.length;
  const done = state.tasks.filter((t) => t.done).length;
  els.weekProgressText.textContent = `${done} / ${total} done this week`;
  els.weekProgressFill.style.width = total ? `${(done / total) * 100}%` : "0%";
}

function renderStats() {
  els.statTasks.textContent = state.tasks.filter((t) => t.done).length;
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
    name: state.profile.displayName,
    avatar: state.profile.avatar,
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

// ---------- profile & MBTI ----------

function mbtiCompatibilityScore(userType, otherType) {
  if (!userType || !otherType) return 0;
  if (userType === otherType) return 72;
  const ideal = MBTI_COMPAT[userType] || [];
  if (ideal.includes(otherType)) return 95 - ideal.indexOf(otherType) * 5;
  let score = 40;
  for (let i = 0; i < 4; i++) {
    if (userType[i] === otherType[i]) score += 8;
  }
  return Math.min(score, 88);
}

function getRecommendations() {
  const type = state.mbti.type;
  if (!type) return [];

  return CAMPUS_STUDENTS
    .map((s) => ({ ...s, match: mbtiCompatibilityScore(type, s.mbti) }))
    .sort((a, b) => b.match - a.match)
    .slice(0, 5);
}

function renderAvatarPicker() {
  if (!els.avatarPicker) return;
  els.avatarPicker.innerHTML = "";
  AVATAR_OPTIONS.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `avatar-opt${state.profile.avatar === emoji ? " selected" : ""}`;
    btn.textContent = emoji;
    btn.title = emoji;
    btn.addEventListener("click", () => {
      state.profile.avatar = emoji;
      saveState();
      renderAvatarPicker();
      renderProfile();
      renderPlayer();
      renderLeaderboard();
    });
    els.avatarPicker.append(btn);
  });
}

function renderProfile() {
  if (!els.profileForm) return;

  const p = state.profile;
  els.profileName.value = p.displayName;
  els.profileHandleInput.value = p.handle;
  els.profileMajor.value = p.major;
  els.profileBio.value = p.bio;
  els.profileAvatarDisplay.textContent = p.avatar;
  els.profileNameDisplay.textContent = p.displayName;
  els.profileHandleDisplay.textContent = `@${p.handle}`;

  renderAvatarPicker();

  if (state.mbti.completed && state.mbti.type) {
    const info = MBTI_TYPE_INFO[state.mbti.type];
    els.mbtiSummary.innerHTML = `
      <div class="mbti-result">
        <span class="mbti-type-badge pixel">${state.mbti.type}</span>
        <strong>${info?.title || "Your type"}</strong>
        <p class="muted">${info?.blurb || ""}</p>
      </div>`;
    els.recommendationsHint.textContent = `Top matches for ${state.mbti.type} personalities on campus:`;
  } else {
    els.mbtiSummary.innerHTML = `
      <p class="muted">You haven't taken the test yet. Discover your type to unlock friend recommendations.</p>`;
    els.recommendationsHint.textContent = "Complete the MBTI test to unlock personalised matches.";
  }

  const recs = getRecommendations();
  els.recommendationsList.innerHTML = "";
  if (!recs.length) {
    const empty = document.createElement("p");
    empty.className = "empty-msg";
    empty.textContent = "Take the MBTI test above to see who you'd vibe with 🧠";
    els.recommendationsList.append(empty);
    return;
  }

  recs.forEach((s) => {
    const row = document.createElement("div");
    row.className = "rec-row";
    const info = MBTI_TYPE_INFO[s.mbti];
    row.innerHTML = `
      <span class="rec-avatar">${s.avatar}</span>
      <div class="rec-main">
        <div class="rec-name-row">
          <span class="rec-name">${s.name}</span>
          <span class="rec-match">${s.match}% match</span>
        </div>
        <div class="rec-meta">${s.major} · <span class="rec-mbti">${s.mbti}</span> ${info?.title ? "— " + info.title : ""}</div>
        <div class="rec-bar"><div class="rec-bar-fill" style="width:${s.match}%"></div></div>
      </div>`;
    els.recommendationsList.append(row);
  });
}

function saveProfileFromForm() {
  const name = els.profileName.value.trim();
  const handle = els.profileHandleInput.value.trim().replace(/^@/, "");
  if (!name || !handle) return;

  state.profile.displayName = name;
  state.profile.handle = handle;
  state.profile.major = els.profileMajor.value.trim();
  state.profile.bio = els.profileBio.value.trim();
  saveState();
  renderProfile();
  renderPlayer();
  renderLeaderboard();
  pushNotif("green", "👤", "Profile saved", `@${handle} is ready to go`);
}

function computeMbtiType(scores) {
  return [
    scores.E >= scores.I ? "E" : "I",
    scores.S >= scores.N ? "S" : "N",
    scores.T >= scores.F ? "T" : "F",
    scores.J >= scores.P ? "J" : "P",
  ].join("");
}

function renderMbtiQuestion() {
  const q = MBTI_QUESTIONS[mbtiStep];
  const total = MBTI_QUESTIONS.length;
  const pct = ((mbtiStep + 1) / total) * 100;

  els.mbtiProgressFill.style.width = `${pct}%`;
  els.mbtiProgressText.textContent = `Question ${mbtiStep + 1} of ${total}`;
  els.mbtiBackBtn.disabled = mbtiStep === 0;
  els.mbtiNextBtn.textContent = mbtiStep === total - 1 ? "See results →" : "Next →";

  const selected = mbtiDraftAnswers[mbtiStep];
  els.mbtiQuestionArea.innerHTML = `
    <p class="mbti-q-text">${q.text}</p>
    <div class="mbti-options">
      <button type="button" class="mbti-opt${selected === "a" ? " selected" : ""}" data-choice="a">${q.a.label}</button>
      <button type="button" class="mbti-opt${selected === "b" ? " selected" : ""}" data-choice="b">${q.b.label}</button>
    </div>`;

  els.mbtiQuestionArea.querySelectorAll(".mbti-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      mbtiDraftAnswers[mbtiStep] = btn.dataset.choice;
      renderMbtiQuestion();
    });
  });
}

function startMbtiTest() {
  mbtiStep = 0;
  mbtiDraftAnswers = state.mbti.answers.length === MBTI_QUESTIONS.length
    ? [...state.mbti.answers]
    : new Array(MBTI_QUESTIONS.length).fill(null);
  goToPanel("mbti");
  renderMbtiQuestion();
}

function finishMbtiTest() {
  const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  mbtiDraftAnswers.forEach((choice, i) => {
    const q = MBTI_QUESTIONS[i];
    const dim = choice === "a" ? q.a.dim : q.b.dim;
    scores[dim] += 1;
  });

  const type = computeMbtiType(scores);
  state.mbti = {
    completed: true,
    type,
    scores,
    answers: [...mbtiDraftAnswers],
  };
  saveState();
  renderProfile();

  const info = MBTI_TYPE_INFO[type];
  pushNotif("peach", "🧠", `You're ${type}!`, info?.title || "MBTI test complete");
  goToPanel("profile");
}

function mbtiNext() {
  if (!mbtiDraftAnswers[mbtiStep]) {
    pushNotif("plain", "🧠", "Pick an answer", "Choose A or B to continue");
    return;
  }
  if (mbtiStep < MBTI_QUESTIONS.length - 1) {
    mbtiStep += 1;
    renderMbtiQuestion();
  } else {
    finishMbtiTest();
  }
}

function mbtiBack() {
  if (mbtiStep > 0) {
    mbtiStep -= 1;
    renderMbtiQuestion();
  }
}

function setupProfile() {
  if (!els.profileForm) return;

  els.profileForm.addEventListener("submit", (e) => {
    e.preventDefault();
    saveProfileFromForm();
  });

  els.mbtiRetakeBtn.addEventListener("click", startMbtiTest);
  els.mbtiBackBtn.addEventListener("click", mbtiBack);
  els.mbtiNextBtn.addEventListener("click", mbtiNext);
}

function routeFromHash() {
  const hash = location.hash.replace("#", "");
  const valid = ["progress", "week", "events", "leaderboard", "profile", "mbti"];
  if (valid.includes(hash)) goToPanel(hash);
}

// ---------- notifications ----------

function pushNotif(color, icon, heading, sub) {
  const card = document.createElement("div");
  card.className = `notif notif-${color}`;

  const iconEl = document.createElement("span");
  iconEl.className = "notif-icon";
  iconEl.textContent = icon;

  const body = document.createElement("div");
  body.className = "notif-body";
  const strong = document.createElement("strong");
  strong.textContent = heading;
  body.append(strong);
  if (sub) {
    const subEl = document.createElement("span");
    subEl.className = "notif-sub";
    subEl.textContent = sub;
    body.append(subEl);
  }

  const close = document.createElement("button");
  close.className = "notif-close";
  close.textContent = "✕";
  close.title = "Dismiss";
  close.addEventListener("click", () => card.remove());

  card.append(iconEl, body, close);
  els.notifList.prepend(card);

  // keep the panel tidy
  while (els.notifList.children.length > 7) {
    els.notifList.lastElementChild.remove();
  }
}

function seedNotifs() {
  pushNotif("peach", "🤘", "Start Your First Challenge",
    "You're just one step away! Tick off a task to kickstart your journey.");
  pushNotif("plain", "📒", "Set Up Your Week",
    "Add your assignments and deadlines to the This Week tab for tailored XP.");
  pushNotif("blue", "🌟", "Good job on reaching your goal today! 🤙", "");
}

// ---------- actions ----------

function addTask(title, subject, type, day) {
  state.tasks.push({ id: state.nextId++, title, subject, type, day, done: false });
  saveState();
  renderTasks();
  pushNotif("plain", "📝", "Task added", "Go get that XP 💪");
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

// ---------- confetti ----------

function burstConfetti() {
  const pieces = ["🎉", "⭐", "✨", "🎊", "💙"];
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

function setupNav() {
  document.querySelectorAll(".nav-item[data-panel]").forEach((item) => {
    item.addEventListener("click", () => goToPanel(item.dataset.panel, item));
  });

  document.querySelectorAll(".collection-card[data-goto]").forEach((card) => {
    card.addEventListener("click", () => goToPanel(card.dataset.goto));
  });

  document.querySelectorAll(".profile[data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => goToPanel(btn.dataset.panel));
  });

  window.addEventListener("hashchange", routeFromHash);
}

function goToPanel(panelId, navItem) {
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
  const panel = $(`#panel-${panelId}`);
  if (!panel) return;
  panel.classList.add("active");

  const target = navItem && !navItem.classList.contains("get-help")
    ? navItem
    : document.querySelector(`.nav-item[data-panel="${panelId}"]:not(.get-help)`);
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  if (target) target.classList.add("active");

  if (location.hash !== `#${panelId}`) {
    history.replaceState(null, "", `#${panelId}`);
  }

  if (panelId === "profile") renderProfile();
  if (panelId === "mbti") {
    if (!mbtiDraftAnswers.length) {
      mbtiStep = 0;
      mbtiDraftAnswers = state.mbti.answers.length === MBTI_QUESTIONS.length
        ? [...state.mbti.answers]
        : new Array(MBTI_QUESTIONS.length).fill(null);
    }
    renderMbtiQuestion();
  }
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

pixelifyHeadings();
setupNav();
setupForms();
setupProfile();
seedNotifs();
renderPlayer();
renderTasks();
renderStats();
renderEvents();
renderLeaderboard();
renderProfile();
routeFromHash();
