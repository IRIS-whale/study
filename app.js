"use strict";

/* ================= 基础工具 ================= */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const pad = n => String(n).padStart(2, "0");
const hm  = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const toMin = s => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };

const DAYS     = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const DAY_FULL = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];

const PALETTE = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b",
  "#10b981", "#06b6d4", "#3b82f6", "#84cc16", "#14b8a6"
];
function colorFor(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
function hexA(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ================= 日期 ================= */
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseKey(k) { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function dayOfWeek(d) { return d.getDay() === 0 ? 7 : d.getDay(); } // 周一=1 … 周日=7
function fmtCN(d) {
  const w = dayOfWeek(d);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${DAY_FULL[w - 1]}`;
}

/* ================= 数据存取 ================= */
const LS_KEY = "study-planner-v1";
let storageOK = true;

/* 2026年秋季学期课表（2026-09-06 更新） */
const DEFAULT_COURSES = [
  { id: "c1",  name: "线性代数A（Ⅰ）", day: 1, start: "10:10", end: "12:00", place: "理教407", teacher: "", note: "考试：20270106 上午", color: "#6366f1" },
  { id: "c2",  name: "线性代数习题课", day: 1, start: "18:40", end: "20:30", place: "三教206/104/308", teacher: "", note: "单周上课", color: "#6366f1" },
  { id: "c3",  name: "《理想国》讨论班", day: 1, start: "20:40", end: "21:30", place: "文史106", teacher: "", note: "需选修老师的 2332977 讨论课；随堂/论文/统一考试", color: "#14b8a6" },
  { id: "c4",  name: "高等数学A（一）习题课", day: 2, start: "08:00", end: "09:50", place: "一教303/二教412/二教414", teacher: "", note: "习题课", color: "#8b5cf6" },
  { id: "c5",  name: "健美操", day: 2, start: "13:00", end: "14:50", place: "邱德拔151（女生班）", teacher: "", note: "女生班；随堂/论文考核", color: "#10b981" },
  { id: "c6",  name: "线性代数A（Ⅰ）", day: 3, start: "08:00", end: "09:50", place: "理教407", teacher: "", note: "考试：20270106 上午", color: "#6366f1" },
  { id: "c7",  name: "计算概论A", day: 3, start: "13:00", end: "14:50", place: "二教410", teacher: "", note: "上机实习2班；考试：20261230 下午", color: "#3b82f6" },
  { id: "c8",  name: "大学生思想文化素养", day: 3, start: "15:10", end: "17:00", place: "理教203", teacher: "", note: "考试：20261231 晚上", color: "#f59e0b" },
  { id: "c9",  name: "高数习题课", day: 3, start: "18:40", end: "20:30", place: "一教303/二教412/二教414", teacher: "", note: "习题课", color: "#8b5cf6" },
  { id: "c10", name: "高等数学A（一）", day: 4, start: "10:10", end: "12:00", place: "二教307", teacher: "", note: "考试：20261231 上午", color: "#8b5cf6" },
  { id: "c11", name: "《理想国》讨论班", day: 4, start: "13:00", end: "14:50", place: "文史106", teacher: "", note: "讨论班；随堂/论文/统一考试", color: "#14b8a6" },
  { id: "c12", name: "银发经济与创意设计", day: 4, start: "15:10", end: "17:00", place: "文史216", teacher: "", note: "考试：随堂/论文/统一时间", color: "#ec4899" },
  { id: "c13", name: "计算概论A上机实习", day: 5, start: "10:10", end: "12:00", place: "1235机房", teacher: "", note: "上机实习", color: "#06b6d4" },
  { id: "c14", name: "计算概论A上机实习", day: 5, start: "13:00", end: "14:50", place: "1235机房", teacher: "", note: "上机实习", color: "#06b6d4" },
  { id: "c15", name: "人工智能初级研讨班", day: 5, start: "18:40", end: "20:30", place: "三教203", teacher: "", note: "随堂/论文/统一考试", color: "#f43f5e" }
];

/* 重大事项倒计时（2026-09-06 预置：学期考试安排，可自行增删改） */
const DEFAULT_EVENTS = [
  { id: "e1", title: "计算概论A 期末考试", date: "2026-12-30", note: "下午 考试", color: "#3b82f6" },
  { id: "e2", title: "高等数学A（一）期末考试", date: "2026-12-31", note: "上午 考试", color: "#8b5cf6" },
  { id: "e3", title: "大学生思想文化素养 结课考核", date: "2026-12-31", note: "晚上 考试", color: "#f59e0b" },
  { id: "e4", title: "线性代数A（Ⅰ）期末考试", date: "2027-01-06", note: "上午 考试", color: "#6366f1" }
];
/* 心情 / 天气 表情库（参考微信状态，可自定义 & 导入） */
const DEFAULT_MOODS = [
  { e: "😊", label: "开心" }, { e: "😄", label: "快乐" }, { e: "😌", label: "平静" },
  { e: "😴", label: "困" },    { e: "🥱", label: "疲惫" }, { e: "😢", label: "难过" },
  { e: "😠", label: "生气" }, { e: "🤔", label: "思考" }, { e: "🥰", label: "幸福" },
  { e: "😎", label: "酷" },    { e: "🤗", label: "抱抱" }, { e: "😐", label: "一般" },
  { e: "😭", label: "大哭" }, { e: "😡", label: "暴躁" }, { e: "🥳", label: "庆祝" },
  { e: "🤩", label: "兴奋" }
];
const DEFAULT_WEATHER = [
  { e: "☀️", label: "晴" },   { e: "⛅", label: "多云" }, { e: "☁️", label: "阴" },
  { e: "🌧️", label: "雨" },   { e: "⛈️", label: "雷雨" }, { e: "🌦️", label: "小雨" },
  { e: "❄️", label: "雪" },   { e: "🌫️", label: "雾" },   { e: "🌪️", label: "大风" },
  { e: "🌤️", label: "晴间多云" }, { e: "🌈", label: "彩虹" }
];
function defaultEmojiLib() {
  return {
    moods: DEFAULT_MOODS.map(x => ({ ...x })),
    weather: DEFAULT_WEATHER.map(x => ({ ...x }))
  };
}

const DEFAULT_CATEGORIES = ["学习事务", "日常事务", "短期内待办"];

/* 常用网址：分类与默认示例数据 */
const DEFAULT_LINK_CATEGORIES = ["学校日常事务", "学习", "常用工具"];
const DEFAULT_LINKS = [
  { id: "l1", name: "中国大学MOOC", url: "https://www.icourse163.org/", note: "名校公开课，在线学习", category: "学习", color: "#3b82f6" },
  { id: "l2", name: "中国知网 CNKI", url: "https://www.cnki.net/", note: "学术文献检索与下载", category: "学习", color: "#6366f1" },
  { id: "l3", name: "学堂在线", url: "https://www.xuetangx.com/", note: "多所高校慕课平台", category: "学习", color: "#8b5cf6" },
  { id: "l4", name: "哔哩哔哩", url: "https://www.bilibili.com/", note: "大学课程 / 学习经验视频", category: "学习", color: "#ec4899" }
];
function normalizeUrl(u) {
  u = String(u || "").trim();
  if (!u) return "";
  return new RegExp("^https?://", "i").test(u) ? u : "https://" + u;
}
function normalizeLink(l) {
  return { ...l, category: l.category || "其他", color: l.color || colorFor(l.name || "网址") };
}
function normalizeEvent(ev) {
  return { ...ev, category: ev.category || "学习事务", widget: ev.widget !== false };
}

let data = loadData();

function loadData() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      const events = (Array.isArray(d.events) && d.events.length
        ? d.events
        : DEFAULT_EVENTS.map(e => ({ ...e }))).map(e => normalizeEvent(e));
      return {
        courses: Array.isArray(d.courses) ? d.courses : [],
        tasks: Array.isArray(d.tasks) ? d.tasks : [],
        events,
        categories: Array.isArray(d.categories) && d.categories.length ? d.categories.map(c=>c) : DEFAULT_CATEGORIES.map(c=>c),
        notes: Array.isArray(d.notes) ? d.notes : [],
        links: Array.isArray(d.links) ? d.links.map(normalizeLink) : DEFAULT_LINKS.map(x => normalizeLink({ ...x })),
        linkCategories: (Array.isArray(d.linkCategories) && d.linkCategories.length) ? d.linkCategories.map(c=>c) : DEFAULT_LINK_CATEGORIES.map(c=>c),
        emojiLib: (d.emojiLib && Array.isArray(d.emojiLib.moods) && Array.isArray(d.emojiLib.weather))
          ? { moods: d.emojiLib.moods.map(x => ({ ...x })), weather: d.emojiLib.weather.map(x => ({ ...x })) }
          : defaultEmojiLib()
      };
    }
  } catch (e) { storageOK = false; }
  if (!storageOK) return { courses: [], tasks: [], events: [], categories: DEFAULT_CATEGORIES.map(c=>c), notes: [], links: DEFAULT_LINKS.map(x => normalizeLink({ ...x })), linkCategories: DEFAULT_LINK_CATEGORIES.map(c=>c), emojiLib: defaultEmojiLib() };
  return {
    courses: DEFAULT_COURSES.map(c => ({ ...c })),
    tasks: [],
    events: DEFAULT_EVENTS.map(e => normalizeEvent(e)),
    categories: DEFAULT_CATEGORIES.map(c=>c),
    notes: [],
    links: DEFAULT_LINKS.map(x => normalizeLink({ ...x })),
    linkCategories: DEFAULT_LINK_CATEGORIES.map(c=>c),
    emojiLib: defaultEmojiLib()
  };
}
function persist() {
  if (!storageOK) return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); }
  catch (e) { storageOK = false; toast("⚠️ 浏览器禁止本地存储，请及时使用「导出备份」保存数据"); }
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ================= 状态 ================= */
let currentDate = new Date();          // 任务页当前查看的日期
let currentNoteDate = new Date();      // 随笔页当前查看的日期
let noteDirty = false;
let noteSaveTimer = null;
let emojiEditingKind = null;
let editingCourseId = null;
let toastTimer = null;

/* ================= Toast ================= */
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 2600);
}

/* ================= 视图切换 ================= */
function switchView(name) {
  $$(".view").forEach(v => v.classList.remove("active"));
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === name));
  $("#view-" + name).classList.add("active");
  if (name === "timetable") renderTimetable();
  else if (name === "tasks") renderTasks();
  else if (name === "notes") renderNotes();
  else if (name === "countdown") renderCountdown();
  else if (name === "links") renderLinks();
  else if (name === "widget") renderWidget();
}


/* ================= 课表渲染 ================= */
function renderTimetable() {
  const tt = $("#tt");
  tt.innerHTML = "";
  const courses = data.courses;
  const todayWeek = dayOfWeek(new Date());

  // 计算一天的时间范围（以课程为准，空表使用 07:00 - 22:00）
  let min = Infinity, max = -Infinity;
  courses.forEach(c => {
    min = Math.min(min, toMin(c.start));
    max = Math.max(max, toMin(c.end));
  });
  const dayStart = Number.isFinite(min) ? Math.max(6 * 60, Math.floor(min / 30) * 30 - 30) : 7 * 60;
  const dayEnd   = Number.isFinite(max) ? Math.min(23 * 60, Math.ceil(max / 30) * 30 + 60) : 22 * 60;
  const slot = 30;
  const total = (dayEnd - dayStart) / slot;

  // 表头 + 时间列
  let html = '<div class="tt-head"><div class="tt-corner">时间</div>';
  DAYS.forEach((n, i) => {
    const wd = i + 1;
    html += `<div class="tt-dayhead${wd === todayWeek ? " today" : ""}">${n}${wd === todayWeek ? '<span class="tag-today">今天</span>' : ""}</div>`;
  });
  html += '</div><div class="tt-body"><div class="tt-times">';
  for (let t = dayStart; t < dayEnd; t += slot) {
    html += `<div class="tt-time">${hm(t)}</div>`;
  }
  html += '</div><div class="tt-grid">';
  for (let wd = 1; wd <= 7; wd++) {
    html += `<div class="tt-day${wd === todayWeek ? " today" : ""}" data-day="${wd}" style="height:${total * 46}px"></div>`;
  }
  html += "</div></div>";
  tt.innerHTML = html;

  // 空状态（覆盖层提示，不拦截点击，仍可直接点击空白格子添加课程）
  if (courses.length === 0) {
    const tip = document.createElement("div");
    tip.className = "tt-empty";
    tip.innerHTML = "还没有课程 🎈<br>点击上方「＋ 添加课程」，<br>或直接点击下方某一天的空白格子";
    tt.appendChild(tip);
  }

  // 放置课程卡片
  courses.forEach(c => {
    const col = $('.tt-day[data-day="' + c.day + '"]', tt);
    if (!col) return;
    const start = toMin(c.start), end = toMin(c.end);
    if (end <= start) return;
    const color = c.color || colorFor(c.name);
    const top = (start - dayStart) / slot * 46;
    const height = Math.max(30, (end - start) / slot * 46 - 4);

    const el = document.createElement("div");
    el.className = "course-card" + (c.day === todayWeek ? " on-today" : "");
    el.style.top = top + "px";
    el.style.height = height + "px";
    el.style.setProperty("--c", color);
    el.style.setProperty("--c-soft", hexA(color, 0.14));
    const meta = [];
    if (c.place) meta.push("📍 " + c.place);
    if (c.teacher) meta.push("👤 " + c.teacher);
    meta.push(`🕐 ${c.start} – ${c.end}`);
    el.innerHTML = `<div class="cc-name"></div><div class="cc-meta"></div>`;
    el.querySelector(".cc-name").textContent = c.name;
    el.querySelector(".cc-meta").textContent = meta.join(" · ");
      const noteLines = courseNoteLines(c.note);
      if (noteLines.length) {
        const noteEl = document.createElement("div");
        noteEl.className = "cc-note";
        noteEl.textContent = noteLines.map(l => "• " + l).join("\n");
        el.appendChild(noteEl);
      }
    el.addEventListener("click", ev => { ev.stopPropagation(); openCourseModal(c); });
    col.appendChild(el);
  });

  // 点击某一天空白处 -> 以该天添加课程
  $$(".tt-day", tt).forEach(col => {
    col.addEventListener("click", () => openCourseModal(null, +col.dataset.day));
  });
}

/* ================= 任务页渲染 ================= */
function renderTasks() {
  const k = dateKey(currentDate);
  const wd = dayOfWeek(currentDate);
  const dayCourses = data.courses.filter(c => c.day === wd);
  const tasks = data.tasks.filter(t => t.date === k);
  const done = tasks.filter(t => t.done).length;

  $("#dateTitle").textContent = fmtCN(currentDate);
  $("#dateSub").textContent =
    `这一天共有 ${dayCourses.length} 节课，任务已完成 ${done}/${tasks.length}`;
  $("#todayChip").textContent =
    `今天是 ${fmtCN(new Date())} · 今日已完成 ${data.tasks.filter(t => t.date === dateKey(new Date()) && t.done).length} 项`;

  // 当天课程
  const list = $("#dayCourseList");
  list.innerHTML = "";
  if (dayCourses.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-tip";
    li.textContent = "这一天没有课，好好休息吧 🎉";
    list.appendChild(li);
  } else {
    [...dayCourses]
      .sort((a, b) => toMin(a.start) - toMin(b.start))
      .forEach(c => {
        const color = c.color || colorFor(c.name);
        const li = document.createElement("li");
        li.className = "mini-course";
        li.style.setProperty("--c", color);
        const meta = [c.start + " – " + c.end];
        if (c.place) meta.push("📍 " + c.place);
        if (c.teacher) meta.push("👤 " + c.teacher);
        li.title = "双击可编辑此课程";
        li.innerHTML = `<div class="mc-name"></div><div class="mc-meta"></div>`;
        li.querySelector(".mc-name").textContent = c.name;
        li.querySelector(".mc-meta").textContent = meta.join(" · ");
        li.addEventListener("dblclick", () => openCourseModal(c));
        list.appendChild(li);
      });
  }

  // 进度
  $("#taskProgress").textContent = tasks.length ? `已完成 ${done}/${tasks.length}` : "今天还没有任务";
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  $("#taskProgress").style.color = tasks.length && pct === 100 ? "var(--success)" : "";

  // 任务列表（未完成在前，完成在后）
  const sorted = [...tasks].sort((a, b) =>
    (a.done - b.done) || (a.createdAt - b.createdAt)
  );
  const ul = $("#taskList");
  ul.innerHTML = "";
  if (sorted.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-tip";
    li.textContent = "暂无任务，先在上方添加一个吧 ✍️";
    ul.appendChild(li);
  }
  sorted.forEach(t => ul.appendChild(taskItem(t)));
}

function taskItem(t) {
  const li = document.createElement("li");
  li.className = "task-item" + (t.done ? " done" : "");
  li.dataset.id = t.id;

  const check = document.createElement("button");
  check.className = "task-check";
  check.textContent = "✓";
  check.title = t.done ? "标记为未完成" : "标记为已完成";
  check.addEventListener("click", () => {
    t.done = !t.done;
    persist();
    renderTasks();
  });

  const body = document.createElement("div");
  body.className = "task-body";
  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = t.text;
  text.title = "双击编辑";
  text.addEventListener("dblclick", () => startTaskEdit(li, t));
  body.appendChild(text);

  const extra = document.createElement("span");
  extra.className = "task-extra";
  const d = new Date(t.createdAt);
  extra.textContent = `添加于 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  body.appendChild(extra);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  const editBtn = document.createElement("button");
  editBtn.className = "icon-btn";
  editBtn.textContent = "✎";
  editBtn.title = "编辑";
  editBtn.addEventListener("click", () => startTaskEdit(li, t));
  const delBtn = document.createElement("button");
  delBtn.className = "icon-btn del";
  delBtn.textContent = "✕";
  delBtn.title = "删除";
  delBtn.addEventListener("click", () => {
    data.tasks = data.tasks.filter(x => x.id !== t.id);
    persist();
    renderTasks();
    toast("已删除任务");
  });
  actions.append(editBtn, delBtn);

  li.append(check, body, actions);
  return li;
}

function startTaskEdit(li, t) {
  const body = $(".task-body", li);
  const input = document.createElement("input");
  input.className = "task-edit-input";
  input.type = "text";
  input.maxLength = 120;
  input.value = t.text;
  body.innerHTML = "";
  body.appendChild(input);
  input.focus();
  input.select();

  let done = false;
  const commit = () => {
    if (done) return;
    done = true;
    const val = input.value.trim();
    if (val) { t.text = val; persist(); }
    renderTasks();
  };
  input.addEventListener("keydown", ev => {
    if (ev.key === "Enter") commit();
    if (ev.key === "Escape") renderTasks();
  });
  input.addEventListener("blur", commit);
}

/* ================= 课程弹窗 ================= */
function fillDaySelect(selected) {
  const sel = $("#f_day");
  sel.innerHTML = "";
  DAYS.forEach((n, i) => {
    const opt = document.createElement("option");
    opt.value = i + 1;
    opt.textContent = n;
    if (i + 1 === selected) opt.selected = true;
    sel.appendChild(opt);
  });
}

/* 备注：支持多行/多条，每行一条；兼容旧数据里用「；」分隔 */
function courseNoteLines(note) {
  if (!note) return [];
  return String(note).split(/\r?\n|；|;/).map(x => x.trim()).filter(Boolean);
}
function normalizeNote(value) {
  return courseNoteLines(value).join("\n");
}

function openCourseModal(course, presetDay) {
  editingCourseId = course ? course.id : null;
  $("#courseModalTitle").textContent = course ? "编辑课程" : "添加课程";
  $("#delCourseBtn").classList.toggle("hidden", !course);
  $("#courseId").value = course ? course.id : "";

  const todayWeek = dayOfWeek(new Date());
  fillDaySelect(course ? course.day : (presetDay || todayWeek));

  $("#f_name").value = course ? course.name : "";
  $("#f_start").value = course ? course.start : "08:00";
  $("#f_end").value = course ? course.end : "09:40";
  $("#f_place").value = course ? (course.place || "") : "";
  $("#f_teacher").value = course ? (course.teacher || "") : "";
  $("#f_note").value = course ? normalizeNote(course.note) : "";

  $("#overlay").classList.remove("hidden");
  setTimeout(() => $("#f_name").focus(), 50);
}

function closeModal() {
  $("#overlay").classList.add("hidden");
  editingCourseId = null;
}

function submitCourse(ev) {
  ev.preventDefault();
  const id = $("#courseId").value;
  const name = $("#f_name").value.trim();
  const day = +$("#f_day").value;
  const start = $("#f_start").value;
  const end = $("#f_end").value;
  if (!name) { toast("请输入课程名称"); return; }
  if (toMin(end) <= toMin(start)) { toast("结束时间需要晚于开始时间"); return; }

  const base = { name, day, start, end, place: $("#f_place").value.trim(), teacher: $("#f_teacher").value.trim(), note: normalizeNote($("#f_note").value) };
  if (id) {
    const c = data.courses.find(x => x.id === id);
    if (c) Object.assign(c, base);
  } else {
    const color = colorFor(name);
    data.courses.push({ id: uid(), ...base, color });
  }
  persist();
  closeModal();
  renderTimetable();
  renderTasks();
  toast(id ? "课程已更新" : "课程已添加");
}

function deleteCourse() {
  const id = $("#courseId").value;
  const c = data.courses.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`确定删除课程「${c.name}」吗？`)) return;
  data.courses = data.courses.filter(x => x.id !== id);
  persist();
  closeModal();
  renderTimetable();
  renderTasks();
  toast("课程已删除");
}

/* ================= 任务添加 ================= */
function addTask(ev) {
  ev.preventDefault();
  const input = $("#taskInput");
  const text = input.value.trim();
  if (!text) return;
  data.tasks.push({
    id: uid(),
    date: dateKey(currentDate),
    text,
    done: false,
    createdAt: Date.now()
  });
  input.value = "";
  persist();
  renderTasks();
}

/* ================= 重大事项倒计时 ================= */
const COLOR_OPTIONS = [
  { label: "靛蓝", value: "#6366f1" },
  { label: "紫色", value: "#8b5cf6" },
  { label: "粉红", value: "#ec4899" },
  { label: "玫红", value: "#f43f5e" },
  { label: "琥珀", value: "#f59e0b" },
  { label: "翠绿", value: "#10b981" },
  { label: "青蓝", value: "#06b6d4" },
  { label: "天蓝", value: "#3b82f6" }
];

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = parseKey(dateStr);
  if (isNaN(target)) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

function cdState(days) {
  if (days === null) return { cls: "cd-nodeadline", big: "待办", unit: "", label: "无截止日期" };
  if (days < 0) return { cls: "cd-past", big: "已过", unit: "", label: "该日已结束" };
  if (days === 0) return { cls: "cd-today", big: "今天", unit: "", label: "就是今天！" };
  if (days <= 3) return { cls: "cd-urgent", big: String(days), unit: "天", label: "距离该日还有" };
  if (days <= 7) return { cls: "cd-soon", big: String(days), unit: "天", label: "距离该日还有" };
  return { cls: "", big: String(days), unit: "天", label: "距离该日还有" };
}

function buildCdCard(ev) {
  const days = daysUntil(ev.date);
  const st = cdState(days);
  const color = ev.color || PALETTE[0];
  const card = document.createElement("article");
  card.className = "cd-card" + (st.cls ? " " + st.cls : "");
  card.style.setProperty("--c", color);

  const meta = [];
  if (ev.date) meta.push("📅 " + esc(ev.date));
  if (ev.note) meta.push("📌 " + esc(ev.note));

  card.innerHTML =
    '<button class="cd-del" title="删除" aria-label="删除">×</button>' +
    '<div class="cd-badges">' +
      '<span class="cd-cat">' + esc(ev.category || "其他") + '</span>' +
      '<button class="cd-w' + (ev.widget === false ? " off" : "") + '" title="点击切换是否在桌面小组件显示">🖥</button>' +
    '</div>' +
    '<div class="cd-days">' + st.big + '<span class="cd-unit">' + st.unit + "</span></div>" +
    '<div class="cd-label">' + st.label + "</div>" +
    '<div class="cd-title">' + esc(ev.title) + "</div>" +
    '<div class="cd-meta">' + meta.join("<br>") + "</div>";

  card.querySelector(".cd-del").addEventListener("click", e => {
    e.stopPropagation();
    if (confirm("确定删除「" + ev.title + "」吗？")) {
      data.events = (data.events || []).filter(x => x.id !== ev.id);
      persist();
      renderCountdown();
      toast("已删除");
    }
  });
  card.querySelector(".cd-w").addEventListener("click", e => {
    e.stopPropagation();
    ev.widget = ev.widget === false;
    persist();
    renderCountdown();
    if (document.body.classList.contains("widget-mode")) renderWidget();
  });
  card.addEventListener("click", () => openEventModal(ev));
  return card;
}

function renderCountdown() {
  const grid = $("#cdGrid");
  if (!grid) return;
  grid.innerHTML = "";
  const events = data.events || [];
  if (events.length === 0) {
    const tip = document.createElement("div");
    tip.className = "cd-empty";
    tip.innerHTML = "还没有重大事项 🎈<br>点击上方「＋ 添加事项」，记录考试、截止日等重要日子";
    grid.appendChild(tip);
    return;
  }
  const cats = (data.categories && data.categories.length) ? data.categories : DEFAULT_CATEGORIES;
  const byCat = {};
  events.forEach(ev => {
    const cat = ev.category || "其他";
    (byCat[cat] = byCat[cat] || []).push(ev);
  });
  const ordered = [];
  cats.forEach(c => { if (byCat[c]) { ordered.push([c, byCat[c]]); delete byCat[c]; } });
  Object.keys(byCat).forEach(c => ordered.push([c, byCat[c]]));
  ordered.forEach(([cat, list]) => {
    const sec = document.createElement("div");
    sec.className = "cd-section";
    const head = document.createElement("div");
    head.className = "cd-sec-head";
    const ht = document.createElement("span");
    ht.textContent = cat;
    const hc = document.createElement("span");
    hc.className = "cd-sec-count";
    hc.textContent = list.length + " 项";
    head.appendChild(ht);
    head.appendChild(hc);
    sec.appendChild(head);
    const sub = document.createElement("div");
    sub.className = "cd-grid";
    [...list].sort((a, b) => (a.date || "9999-12-31").localeCompare(b.date || "9999-12-31"))
      .forEach(ev => sub.appendChild(buildCdCard(ev)));
    sec.appendChild(sub);
    grid.appendChild(sec);
  });
}

function fillColorSelect(select, selected) {
  select.innerHTML = "";
  COLOR_OPTIONS.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.value;
    opt.textContent = c.label;
    if (selected && c.value === selected) opt.selected = true;
    select.appendChild(opt);
  });
}

function fillCategorySelect(select, selected) {
  select.innerHTML = "";
  const cats = (data.categories && data.categories.length) ? data.categories : DEFAULT_CATEGORIES;
  cats.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    if (selected && c === selected) opt.selected = true;
    select.appendChild(opt);
  });
  if (selected && !cats.includes(selected)) {
    const opt = document.createElement("option");
    opt.value = selected;
    opt.textContent = selected + "（自定义）";
    select.appendChild(opt);
  }
}

function addCategory() {
  if (!data.categories || !data.categories.length) data.categories = DEFAULT_CATEGORIES.map(c => c);
  const name = prompt("输入新的分类名称（例如：社团 / 健身）", "");
  const n = (name || "").trim();
  if (!n) return;
  if (data.categories.includes(n)) { toast("该分类已存在"); fillCategorySelect($("#e_category"), n); return; }
  data.categories.push(n);
  persist();
  fillCategorySelect($("#e_category"), n);
  renderCountdown();
  toast("已添加分类：" + n);
}

function openEventModal(ev) {
  $("#eventModalTitle").textContent = ev ? "编辑事项" : "添加事项";
  $("#eventId").value = ev ? ev.id : "";
  $("#e_title").value = ev ? ev.title : "";
  $("#e_date").value = ev ? ev.date : "";
  $("#e_note").value = ev ? (ev.note || "") : "";
  const cat = ev ? (ev.category || "学习事务") : "学习事务";
  fillCategorySelect($("#e_category"), cat);
  $("#e_widget").checked = ev ? ev.widget !== false : true;
  fillColorSelect($("#e_color"), ev ? ev.color : "");
  $("#delEventBtn").classList.toggle("hidden", !ev);
  $("#eventOverlay").classList.remove("hidden");
  $("#e_title").focus();
}

function closeEventModal() {
  $("#eventOverlay").classList.add("hidden");
}

function submitEvent(e) {
  e.preventDefault();
  const title = $("#e_title").value.trim();
  const date = $("#e_date").value;
  if (!title) { toast("请填写事项名称"); return; }
  const id = $("#eventId").value;
  const color = $("#e_color").value || colorFor(title);
  const note = $("#e_note").value.trim();
  const category = $("#e_category").value || "学习事务";
  const widget = $("#e_widget").checked;
  if (id) {
    const ev = (data.events || []).find(x => x.id === id);
    if (ev) Object.assign(ev, { title, date, note, color, category, widget });
  } else {
    if (!data.events) data.events = [];
    data.events.push({ id: uid(), title, date, note, color, category, widget });
  }
  persist();
  renderCountdown();
  closeEventModal();
  toast(id ? "事项已更新" : "事项已添加");
}

function deleteEvent() {
  const id = $("#eventId").value;
  if (!id) return;
  const ev = (data.events || []).find(x => x.id === id);
  if (ev && confirm("确定删除「" + ev.title + "」吗？")) {
    data.events = (data.events || []).filter(x => x.id !== id);
    persist();
    renderCountdown();
    closeEventModal();
    toast("已删除");
  }
}


/* ================= 常用网址 ================= */
function renderLinks() {
  const grid = $("#linkGrid");
  if (!grid) return;
  grid.innerHTML = "";
  const links = data.links || [];
  const cats = (data.linkCategories && data.linkCategories.length) ? data.linkCategories : DEFAULT_LINK_CATEGORIES;
  const byCat = {};
  links.forEach(l => {
    const cat = l.category || "其他";
    (byCat[cat] = byCat[cat] || []).push(l);
  });

  const ordered = [];
  cats.forEach(c => { ordered.push([c, byCat[c] || []]); delete byCat[c]; });
  Object.keys(byCat).forEach(c => ordered.push([c, byCat[c]]));

  if (!ordered.length) {
    const empty = document.createElement("div");
    empty.className = "link-empty";
    empty.innerHTML = "还没有收藏任何网址 🔗<br>点击上方「＋ 添加网址」，把常用的教务、学习、工具网站放进来";
    grid.appendChild(empty);
    return;
  }

  ordered.forEach(([cat, list]) => {
    const sec = document.createElement("div");
    sec.className = "link-section";
    const head = document.createElement("div");
    head.className = "link-sec-head";
    const ht = document.createElement("span");
    ht.textContent = cat;
    const hc = document.createElement("span");
    hc.className = "link-sec-count";
    hc.textContent = list.length + " 个";
    head.appendChild(ht);
    head.appendChild(hc);
    sec.appendChild(head);
    if (list.length) {
      const sub = document.createElement("div");
      sub.className = "link-grid";
      list.forEach(l => sub.appendChild(buildLinkCard(l)));
      sec.appendChild(sub);
    } else {
      const empty = document.createElement("div");
      empty.className = "link-empty-inline";
      empty.textContent = "暂无收藏，点击右上角「＋ 添加网址」添加";
      sec.appendChild(empty);
    }
    grid.appendChild(sec);
  });
}


function buildLinkCard(l) {
  const color = l.color || PALETTE[0];
  const url = normalizeUrl(l.url);
  const card = document.createElement("article");
  card.className = "link-card";
  card.style.setProperty("--c", color);
  card.innerHTML =
    '<button class="link-del" title="删除" aria-label="删除">×</button>' +
    '<button class="link-edit" title="编辑" aria-label="编辑">✎</button>' +
    '<span class="link-cat">' + esc(l.category || "其他") + '</span>' +
    '<div class="link-title">' + esc(l.name) + '</div>' +
    '<div class="link-url">' + esc(l.url) + '</div>' +
    '<div class="link-note">' + (l.note ? "📌 " + esc(l.note) : "暂无备注") + '</div>' +
    (url
      ? '<a class="link-open" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">打开 ↗</a>'
      : '<span class="link-open disabled">请编辑补全网址</span>');

  card.querySelector(".link-del").addEventListener("click", e => {
    e.stopPropagation();
    if (confirm("确定删除「" + l.name + "」吗？")) {
      data.links = (data.links || []).filter(x => x.id !== l.id);
      persist();
      renderLinks();
      toast("已删除");
    }
  });
  card.querySelector(".link-edit").addEventListener("click", e => {
    e.stopPropagation();
    openLinkModal(l);
  });
  card.querySelector(".link-open").addEventListener("click", e => {
    e.stopPropagation();
  });
  card.addEventListener("click", () => {
    if (!url) { toast("该网址为空，请先编辑补充"); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  });
  return card;
}

function fillLinkCategorySelect(select, selected) {
  select.innerHTML = "";
  const cats = (data.linkCategories && data.linkCategories.length) ? data.linkCategories : DEFAULT_LINK_CATEGORIES;
  cats.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    if (selected && c === selected) opt.selected = true;
    select.appendChild(opt);
  });
  if (selected && !cats.includes(selected)) {
    const opt = document.createElement("option");
    opt.value = selected;
    opt.textContent = selected + "（自定义）";
    select.appendChild(opt);
  }
}

function addLinkCategory() {
  if (!data.linkCategories || !data.linkCategories.length) data.linkCategories = DEFAULT_LINK_CATEGORIES.map(c => c);
  const name = prompt("输入新的网址分类名称（例如：学校日常事务 / 学习 / 工具）", "");
  const n = (name || "").trim();
  if (!n) return;
  if (data.linkCategories.includes(n)) {
    toast("该分类已存在");
    fillLinkCategorySelect($("#l_category"), n);
    return;
  }
  data.linkCategories.push(n);
  persist();
  const sel = $("#l_category");
  if (sel) fillLinkCategorySelect(sel, n);
  renderLinks();
  toast("已添加分类：" + n);
}

function openLinkModal(link) {
  $("#linkModalTitle").textContent = link ? "编辑网址" : "添加网址";
  $("#linkId").value = link ? link.id : "";
  $("#l_name").value = link && link.name ? link.name : "";
  $("#l_url").value = link && link.url ? link.url : "";
  $("#l_note").value = link && link.note ? link.note : "";
  const cat = link ? (link.category || "学习") : "学习";
  fillLinkCategorySelect($("#l_category"), cat);
  fillColorSelect($("#l_color"), link ? link.color : "");
  $("#delLinkBtn").classList.toggle("hidden", !link);
  $("#linkOverlay").classList.remove("hidden");
  $("#l_name").focus();
}

function closeLinkModal() {
  $("#linkOverlay").classList.add("hidden");
}

function submitLink(e) {
  e.preventDefault();
  const name = $("#l_name").value.trim();
  const url = normalizeUrl($("#l_url").value);
  const note = $("#l_note").value.trim();
  if (!name) { toast("请填写网址名称"); return; }
  if (!url) { toast("请填写网址链接"); return; }
  const id = $("#linkId").value;
  const category = $("#l_category").value || "其他";
  const color = $("#l_color").value || colorFor(name);
  if (id) {
    const l = (data.links || []).find(x => x.id === id);
    if (l) Object.assign(l, { name, url, note, category, color });
  } else {
    if (!data.links) data.links = [];
    data.links.push({ id: uid(), name, url, note, category, color });
  }
  persist();
  renderLinks();
  closeLinkModal();
  toast(id ? "网址已更新" : "网址已添加");
}

function deleteLink() {
  const id = $("#linkId").value;
  if (!id) return;
  const l = (data.links || []).find(x => x.id === id);
  if (l && confirm("确定删除「" + l.name + "」吗？")) {
    data.links = (data.links || []).filter(x => x.id !== id);
    persist();
    renderLinks();
    closeLinkModal();
    toast("已删除");
  }
}

/* ================= 备份：导出 / 导入 / 示例 / 清空 ================= */
function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `学习手帐备份-${dateKey(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("备份已导出");
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = JSON.parse(reader.result);
      if (!d || !Array.isArray(d.courses) || !Array.isArray(d.tasks)) throw new Error("bad");
      data = { courses: d.courses, tasks: d.tasks, events: (Array.isArray(d.events) ? d.events : []).map(e => normalizeEvent(e)), categories: (Array.isArray(d.categories) && d.categories.length ? d.categories : DEFAULT_CATEGORIES).map(c=>c), notes: Array.isArray(d.notes) ? d.notes : [], emojiLib: (d.emojiLib && Array.isArray(d.emojiLib.moods) && Array.isArray(d.emojiLib.weather)) ? { moods: d.emojiLib.moods.map(x => ({ ...x })), weather: d.emojiLib.weather.map(x => ({ ...x })) } : defaultEmojiLib(), links: (Array.isArray(d.links) ? d.links : []).map(normalizeLink), linkCategories: (Array.isArray(d.linkCategories) && d.linkCategories.length ? d.linkCategories.map(c=>c) : DEFAULT_LINK_CATEGORIES.map(c=>c)) };
      persist();
      renderTimetable();
      renderTasks();
      renderLinks();
      toast("数据导入成功 🎉");
    } catch (e) {
      toast("导入失败：文件格式不正确");
    }
  };
  reader.readAsText(file);
}

function importCourses(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const d = JSON.parse(reader.result);
      if (!d || !Array.isArray(d.courses)) throw new Error("bad");
      if (!d.courses.length) { toast("该文件里没有课程"); return; }
      const courses = d.courses.map(c => ({
        id: c.id || uid(),
        name: String(c.name || "").trim(),
        day: Number(c.day),
        start: String(c.start || ""),
        end: String(c.end || ""),
        place: String(c.place || ""),
        teacher: String(c.teacher || ""),
        note: String(c.note || ""),
        color: c.color || colorFor(c.name || "")
      }));
      data.courses = courses;
      persist();
      renderTimetable();
      toast("课表已导入：只更新课程，任务/随笔/倒计时不受影响 🎉");
    } catch (e) {
      toast("导入课表失败：文件格式不正确");
    }
  };
  reader.readAsText(file);
}
function loadDemo() {
  if (data.courses.length || data.tasks.length) {
    if (!confirm("当前已有数据，载入示例会覆盖它们，继续吗？")) return;
  }
  const today = new Date();
  const wd = dayOfWeek(today); // 保证“今天”有课可看
  const mk = (name, day, start, end, place, teacher) =>
    ({ id: uid(), name, day, start, end, place, teacher, color: colorFor(name) });
  const courses = [
    mk("高等数学", 1, "08:00", "09:40", "教学楼 A-101", "李老师"),
    mk("大学英语", 1, "10:00", "11:40", "外语楼 202", "王老师"),
    mk("数据结构", 2, "08:00", "09:40", "计算机楼 305", "张老师"),
    mk("大学物理", 2, "14:00", "15:40", "理科楼 110", "刘老师"),
    mk("线性代数", 3, "10:00", "11:40", "教学楼 A-203", "陈老师"),
    mk("体育", 4, "15:00", "16:40", "操场", "赵老师"),
    mk("操作系统", 5, "08:00", "09:40", "计算机楼 208", "张老师")
  ];
  // 确保示例在今天也有课，方便你直接体验
  if (!courses.some(c => c.day === wd)) {
    courses.push(mk("专业选修：人工智能导论", wd, "13:30", "15:10", "计算机楼 402", "周老师"));
  }
  const now = Date.now();
  const todayKey = dateKey(today);
  const tasks = [
    { id: uid(), date: todayKey, text: "完成数据结构课后作业", done: false, createdAt: now - 7200000 },
    { id: uid(), date: todayKey, text: "预习大学英语第 3 单元", done: false, createdAt: now - 6000000 },
    { id: uid(), date: todayKey, text: "复习高等数学第一章笔记", done: true, createdAt: now - 5000000 },
    { id: uid(), date: todayKey, text: "提交物理实验报告", done: true, createdAt: now - 4000000 }
  ];
  data = { courses, tasks, events: [], categories: DEFAULT_CATEGORIES.map(c=>c), notes: [], links: DEFAULT_LINKS.map(x => ({ ...x })), linkCategories: DEFAULT_LINK_CATEGORIES.map(c=>c), emojiLib: defaultEmojiLib() };
  persist();
  currentDate = new Date();
  renderTimetable();
  renderTasks();
  renderLinks();
  toast("已载入示例数据，可以随意编辑或清空");
}

function clearAll() {
  if (!confirm("确定清空所有课表和任务数据吗？（建议先导出备份）")) return;
  data = { courses: [], tasks: [], events: [], categories: DEFAULT_CATEGORIES.map(c=>c), notes: [], links: [], linkCategories: DEFAULT_LINK_CATEGORIES.map(c=>c), emojiLib: defaultEmojiLib() };
  persist();
  renderTimetable();
  renderTasks();
  renderLinks();
  toast("数据已清空");
}

/* ================= 每日随笔 ================= */
function emojiLibData() {
  if (!data.emojiLib || !Array.isArray(data.emojiLib.moods) || !Array.isArray(data.emojiLib.weather)) {
    data.emojiLib = defaultEmojiLib();
  }
  return data.emojiLib;
}
function noteIsEmpty(n) {
  return (!(n.text || "").trim()) && !n.mood && !n.weather;
}
function findNote(dateKeyStr) {
  return (data.notes || []).find(n => n.date === dateKeyStr) || null;
}
function noteListSorted() {
  return [...(data.notes || [])].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
function setNoteStatus(txt) {
  const el = $("#noteStatus");
  if (el) el.textContent = txt;
}
function renderNoteChrome() {
  renderEmojiStrip("mood");
  renderEmojiStrip("weather");
  renderNoteList();
  const note = findNote(dateKey(currentNoteDate));
  setNoteStatus(note && !noteIsEmpty(note) ? "已保存" : "今天还没有随笔");
  const count = $("#noteCount");
  if (count) count.textContent = (data.notes || []).length + " 条随笔";
}
function renderNotes() {
  const input = $("#noteDate");
  if (input) input.value = dateKey(currentNoteDate);
  const note = findNote(dateKey(currentNoteDate));
  const ta = $("#noteText");
  if (ta) {
    ta.value = note ? note.text : "";
    ta.placeholder = note ? "" : "今天想记点什么？就像随手写一张小便签…";
  }
  renderNoteChrome();
}
function renderEmojiStrip(kind) {
  const lib = emojiLibData();
  const list = kind === "mood" ? lib.moods : lib.weather;
  const container = kind === "mood" ? $("#moodStrip") : $("#weatherStrip");
  if (!container) return;
  container.innerHTML = "";
  const note = findNote(dateKey(currentNoteDate));
  const selected = kind === "mood" ? (note ? note.mood : null) : (note ? note.weather : null);
  list.forEach(item => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "emoji-cell" + (item.e === selected ? " selected" : "");
    btn.title = item.label;
    const em = document.createElement("span");
    em.className = "emoji-cell-e";
    em.textContent = item.e;
    const lb = document.createElement("span");
    lb.className = "emoji-cell-label";
    lb.textContent = item.label;
    btn.appendChild(em);
    btn.appendChild(lb);
    btn.addEventListener("click", () => toggleNoteEmoji(kind, item));
    container.appendChild(btn);
  });
}
function toggleNoteEmoji(kind, item) {
  const dk = dateKey(currentNoteDate);
  const notes = data.notes = Array.isArray(data.notes) ? data.notes : [];
  let note = notes.find(n => n.date === dk) || null;
  const field = kind === "mood" ? "mood" : "weather";
  const labelField = kind === "mood" ? "moodLabel" : "weatherLabel";
  if (note && note[field] === item.e) {
    note[field] = null;
    note[labelField] = null;
    if (noteIsEmpty(note)) { const idx = notes.indexOf(note); if (idx >= 0) notes.splice(idx, 1); }
  } else {
    if (!note) { note = { id: uid(), date: dk, text: "", updatedAt: Date.now() }; notes.push(note); }
    note[field] = item.e;
    note[labelField] = item.label;
    note.updatedAt = Date.now();
  }
  persist();
  renderNoteChrome();
}
function renderNoteList() {
  const list = $("#noteList");
  if (!list) return;
  list.innerHTML = "";
  const all = noteListSorted().slice(0, 8).filter(n => !noteIsEmpty(n));
  if (all.length === 0) {
    const li = document.createElement("li");
    li.className = "note-empty";
    li.textContent = "还没有随笔，写下第一篇吧 ✍️";
    list.appendChild(li);
    return;
  }
  all.forEach(n => {
    const li = document.createElement("li");
    li.className = "note-item" + (n.date === dateKey(currentNoteDate) ? " cur" : "");
    const head = document.createElement("div");
    head.className = "note-item-date";
    head.textContent = n.date;
    const tags = [];
    if (n.mood) tags.push(n.mood + " " + (n.moodLabel || ""));
    if (n.weather) tags.push(n.weather + " " + (n.weatherLabel || ""));
    if (tags.length) {
      const tg = document.createElement("div");
      tg.className = "note-item-tags";
      tg.textContent = tags.join(" · ");
      li.appendChild(tg);
    }
    const body = document.createElement("div");
    body.className = "note-item-text";
    body.textContent = n.text || "";
    li.appendChild(head);
    li.appendChild(body);
    li.addEventListener("click", () => {
      if (noteDirty) saveNoteNow(true);
      currentNoteDate = parseKey(n.date);
      renderNotes();
    });
    list.appendChild(li);
  });
}
function markNoteDirty() {
  noteDirty = true;
  setNoteStatus("编辑中…");
}
function setNoteDate(delta) {
  if (noteDirty) saveNoteNow(true);
  currentNoteDate = addDays(currentNoteDate, delta);
  renderNotes();
}
function goNoteToday() {
  if (noteDirty) saveNoteNow(true);
  currentNoteDate = new Date();
  renderNotes();
}
function saveNoteNow(silent) {
  clearTimeout(noteSaveTimer);
  const dk = dateKey(currentNoteDate);
  const text = ($("#noteText").value || "").trim();
  const notes = data.notes = Array.isArray(data.notes) ? data.notes : [];
  const idx = notes.findIndex(n => n.date === dk);
  if (idx >= 0) {
    notes[idx].text = text;
    notes[idx].updatedAt = Date.now();
    if (noteIsEmpty(notes[idx])) { notes.splice(idx, 1); }
  } else if (text) {
    notes.push({ id: uid(), date: dk, text, updatedAt: Date.now() });
  }
  persist();
  noteDirty = false;
  renderNotes();
  const exists = notes.some(n => n.date === dk && !noteIsEmpty(n));
  if (!silent) toast(exists ? "随笔已保存 ✍️" : "随笔已清空");
}

/* 自定义表情 & 导入表情库 */
function openEmojiModal(kind) {
  emojiEditingKind = kind;
  $("#emojiModalTitle").textContent = kind === "mood" ? "自定义心情" : "自定义天气";
  $("#emojiKind").value = kind;
  $("#emojiChar").value = "";
  $("#emojiLabel").value = "";
  $("#emojiOverlay").classList.remove("hidden");
  setTimeout(() => $("#emojiChar").focus(), 50);
}
function closeEmojiModal() {
  $("#emojiOverlay").classList.add("hidden");
  emojiEditingKind = null;
}
function submitEmoji(ev) {
  ev.preventDefault();
  const e = $("#emojiChar").value.trim();
  const label = $("#emojiLabel").value.trim();
  if (!e || !label) { toast("请输入表情和名称"); return; }
  const lib = emojiLibData();
  const list = emojiEditingKind === "weather" ? lib.weather : lib.moods;
  if (list.some(x => x.e === e)) { toast("该表情已存在"); return; }
  list.push({ e, label });
  persist();
  renderEmojiStrip(emojiEditingKind);
  closeEmojiModal();
  toast("已添加自定义表情 ✨");
}
function importEmojiFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const txt = reader.result;
      let moods = null, weather = null;
      try {
        const d = JSON.parse(txt);
        if (Array.isArray(d.moods)) moods = d.moods;
        if (Array.isArray(d.weather)) weather = d.weather;
      } catch (e) {
        const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        moods = lines.map(line => {
          const m = line.match(/^(\S+)\s+(\S.+)$/);
          return m ? { e: m[1], label: m[2] } : null;
        }).filter(Boolean);
      }
      if (!moods && !weather) throw new Error("bad");
      const lib = emojiLibData();
      let added = 0;
      const addList = (target, src) => {
        (src || []).forEach(it => {
          if (it && it.e && !target.some(x => x.e === String(it.e).trim())) {
            target.push({ e: String(it.e).trim(), label: String(it.label || it.e || "").trim() });
            added++;
          }
        });
      };
      addList(lib.moods, moods);
      addList(lib.weather, weather);
      persist();
      renderNotes();
      toast("已导入 " + added + " 个表情 🎉");
    } catch (e) {
      toast("导入失败：文件格式不正确");
    }
  };
  reader.readAsText(file);
}

/* ================= 桌面小组件 ================= */
function renderWidget() {
  data = loadData();
  const dateEl = $("#widgetDate");
  if (!dateEl) return;
  const now = new Date();
  const wd = dayOfWeek(now);
  dateEl.innerHTML = "";
  const d = document.createElement("span");
  d.className = "wd-date";
  d.textContent = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`;
  const w = document.createElement("span");
  w.className = "wd-week";
  w.textContent = DAY_FULL[wd - 1];
  dateEl.appendChild(d);
  dateEl.appendChild(w);
  renderWidgetCountdown();
  renderWidgetCourses();
  renderWidgetNote();
}
function renderWidgetCountdown() {
  const ul = $("#widgetCountdown");
  if (!ul) return;
  ul.innerHTML = "";
  const all = (data.events || []).filter(e => e.widget !== false);
  const active = all.filter(e => { const d = daysUntil(e.date); return d === null || d >= 0; });
  const pool = (active.length ? active : all);
  const sortKey = e => { const d = daysUntil(e.date); if (d === null) return 0; if (d < 0) return 1; if (d === 0) return 2; if (d <= 3) return 3; if (d <= 7) return 4; return 5; };
  const chosen = pool.map(e => ({ e }))
    .sort((a, b) => { const s = sortKey(a.e) - sortKey(b.e); if (s) return s; return (a.e.date || "9999-12-31").localeCompare(b.e.date || "9999-12-31"); })
    .map(x => x.e)
    .slice(0, 3);
  if (!chosen.length) {
    ul.innerHTML = '<li class="widget-empty">还没有记录事项 🎈</li>';
    return;
  }
  chosen.forEach(e => {
    const d = daysUntil(e.date);
    const st = cdState(d);
    const li = document.createElement("li");
    const badge = document.createElement("span");
    badge.className = "w-badge";
    badge.style.background = e.color || "var(--primary)";
    badge.textContent = st.big + st.unit;
    const main = document.createElement("div");
    main.className = "w-main";
    const nm = document.createElement("div");
    nm.className = "w-name";
    nm.textContent = e.title;
    const sub = document.createElement("div");
    sub.className = "w-sub";
    sub.textContent = (e.date || "待办") + (e.note ? " · " + e.note : "");
    main.appendChild(nm);
    main.appendChild(sub);
    li.appendChild(badge);
    li.appendChild(main);
    ul.appendChild(li);
  });
}
function renderWidgetCourses() {
  const ul = $("#widgetCourses");
  if (!ul) return;
  ul.innerHTML = "";
  const wd = dayOfWeek(new Date());
  const courses = (data.courses || []).filter(c => c.day === wd).sort((a, b) => (a.start || "").localeCompare(b.start || ""));
  if (!courses.length) {
    ul.innerHTML = '<li class="widget-empty">今天没有课 🎈</li>';
    return;
  }
  courses.forEach(c => {
    const li = document.createElement("li");
    const badge = document.createElement("span");
    badge.className = "w-badge";
    badge.style.background = c.color || "var(--primary)";
    badge.textContent = `${c.start}–${c.end}`;
    const main = document.createElement("div");
    main.className = "w-main";
    const nm = document.createElement("div");
    nm.className = "w-name";
    nm.textContent = c.name;
    const sub = document.createElement("div");
    sub.className = "w-sub";
    sub.textContent = c.place || "";
    main.appendChild(nm);
    main.appendChild(sub);
    li.appendChild(badge);
    li.appendChild(main);
    ul.appendChild(li);
  });
}
function renderWidgetNote() {
  const div = $("#widgetNote");
  if (!div) return;
  div.innerHTML = "";
  const note = findNote(dateKey(new Date()));
  const tags = [];
  if (note && note.mood) tags.push({ e: note.mood, label: note.moodLabel });
  if (note && note.weather) tags.push({ e: note.weather, label: note.weatherLabel });
  if (tags.length) {
    const tg = document.createElement("div");
    tg.className = "w-tags";
    tags.forEach(t => {
      const s = document.createElement("span");
      s.className = "w-tag";
      s.textContent = t.e + " " + (t.label || "");
      tg.appendChild(s);
    });
    div.appendChild(tg);
  }
  const txt = note ? (note.text || "") : "";
  const p = document.createElement("div");
  if (txt) {
    p.className = "w-text";
    p.textContent = txt;
  } else {
    p.className = "w-empty";
    p.textContent = "今天还没写随笔 ✍️";
  }
  div.appendChild(p);
}
function enterWidgetMode() {
  document.body.classList.add("widget-mode");
  switchView("widget");
}
/* ================= 事件绑定 ================= */
function bindEvents() {
  $$(".tab").forEach(t => t.addEventListener("click", () => switchView(t.dataset.view)));

  $("#addCourseBtn").addEventListener("click", () => openCourseModal(null));
  $("#courseForm").addEventListener("submit", submitCourse);
  $("#delCourseBtn").addEventListener("click", deleteCourse);
  $("#cancelCourseBtn").addEventListener("click", closeModal);
  $("#overlay").addEventListener("click", ev => { if (ev.target === ev.currentTarget) closeModal(); });
  $("#addEventBtn").addEventListener("click", () => openEventModal(null));
    $("#addCategoryBtn").addEventListener("click", addCategory);
  $("#eventForm").addEventListener("submit", submitEvent);
  $("#delEventBtn").addEventListener("click", deleteEvent);
  $("#cancelEventBtn").addEventListener("click", closeEventModal);
  $("#eventOverlay").addEventListener("click", ev => { if (ev.target === ev.currentTarget) closeEventModal(); });

  $("#addLinkBtn").addEventListener("click", () => openLinkModal(null));
  $("#addLinkCategoryBtn").addEventListener("click", addLinkCategory);
  $("#addLinkCatBtn").addEventListener("click", addLinkCategory);
  $("#linkForm").addEventListener("submit", submitLink);
  $("#delLinkBtn").addEventListener("click", deleteLink);
  $("#cancelLinkBtn").addEventListener("click", closeLinkModal);
  $("#linkOverlay").addEventListener("click", ev => { if (ev.target === ev.currentTarget) closeLinkModal(); });
  document.addEventListener("keydown", ev => { if (ev.key === "Escape") { closeModal(); closeEventModal(); closeEmojiModal(); closeLinkModal(); } });

  $("#taskForm").addEventListener("submit", addTask);
  $("#prevDay").addEventListener("click", () => { currentDate = addDays(currentDate, -1); renderTasks(); });
  $("#nextDay").addEventListener("click", () => { currentDate = addDays(currentDate, 1); renderTasks(); });
  $("#todayBtn").addEventListener("click", () => { currentDate = new Date(); renderTasks(); });

  $("#notePrev").addEventListener("click", () => setNoteDate(-1));
  $("#noteNext").addEventListener("click", () => setNoteDate(1));
  $("#noteToday").addEventListener("click", goNoteToday);
  $("#noteDate").addEventListener("change", ev => {
    if (noteDirty) saveNoteNow(true);
    const v = ev.target.value;
    if (v) currentNoteDate = parseKey(v);
    renderNotes();
  });
  $("#noteText").addEventListener("input", () => {
    markNoteDirty();
    clearTimeout(noteSaveTimer);
    noteSaveTimer = setTimeout(() => saveNoteNow(true), 900);
  });
  $("#noteSaveBtn").addEventListener("click", () => saveNoteNow(false));

  $("#addMoodBtn").addEventListener("click", () => openEmojiModal("mood"));
  $("#addWeatherBtn").addEventListener("click", () => openEmojiModal("weather"));
  $("#emojiForm").addEventListener("submit", submitEmoji);
  $("#cancelEmojiBtn").addEventListener("click", closeEmojiModal);
  $("#emojiOverlay").addEventListener("click", ev => { if (ev.target === ev.currentTarget) closeEmojiModal(); });
  $("#importEmojiBtn").addEventListener("click", () => $("#emojiFile").click());
  $("#emojiFile").addEventListener("change", ev => {
    const f = ev.target.files[0];
    if (f) importEmojiFile(f);
    ev.target.value = "";
  });

  $("#exportBtn").addEventListener("click", exportData);
  $("#importBtn").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", ev => {
    const f = ev.target.files[0];
    if (f) importData(f);
    ev.target.value = "";
  });
  $("#importCoursesBtn").addEventListener("click", () => $("#coursesFile").click());
  $("#coursesFile").addEventListener("change", ev => {
    const f = ev.target.files[0];
    if (f) importCourses(f);
    ev.target.value = "";
  });
  $("#demoBtn").addEventListener("click", loadDemo);
  $("#clearBtn").addEventListener("click", clearAll);
}

/* ================= 启动 ================= */
bindEvents();
renderTimetable();
renderTasks();
renderCountdown();
renderNotes();
renderLinks();
if (location.hash === "#widget") enterWidgetMode();
window.addEventListener("hashchange", () => {
  if (location.hash === "#widget") enterWidgetMode(); else document.body.classList.remove("widget-mode");
});
setInterval(() => {
  if (document.body.classList.contains("widget-mode")) { data = loadData(); renderWidget(); }
}, 3000);
window.addEventListener("focus", () => {
  if (document.body.classList.contains("widget-mode")) { data = loadData(); renderWidget(); }
});
window.addEventListener("storage", () => {
  if (document.body.classList.contains("widget-mode")) { data = loadData(); renderWidget(); }
});
if (!storageOK) toast("当前浏览器限制了本地存储，数据只在本次打开期间有效，请用「导出备份」保存");
