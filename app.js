'use strict';
/* Lift: daily weigh-in + workout tracker. Everything is stored on the device in localStorage. */

const VERSION = '1.0';
const KEY = 'lift.v1';
const LB = 2.2046226218;
const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Other'];
const REST_STEPS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
const RULER_TICK = 12; // px per 0.1 on the weigh-in ruler

const SEED_EXERCISES = {
  Chest: ['Bench Press (Barbell)', 'Incline Bench Press (Barbell)', 'Bench Press (Dumbbell)', 'Incline Bench Press (Dumbbell)',
    'Chest Press (Machine)', 'Chest Fly (Cable)', 'Chest Fly (Machine)', 'Chest Dip', 'Push Up'],
  Back: ['Deadlift (Barbell)', 'Pull Up', 'Chin Up', 'Lat Pulldown (Cable)', 'Bent Over Row (Barbell)', 'Seated Row (Cable)',
    'Dumbbell Row', 'T-Bar Row', 'Face Pull (Cable)', 'Back Extension'],
  Shoulders: ['Overhead Press (Barbell)', 'Shoulder Press (Dumbbell)', 'Shoulder Press (Machine)', 'Lateral Raise (Dumbbell)',
    'Lateral Raise (Cable)', 'Rear Delt Fly', 'Shrug (Dumbbell)'],
  Arms: ['Bicep Curl (Barbell)', 'Bicep Curl (Dumbbell)', 'Hammer Curl', 'Preacher Curl', 'Cable Curl', 'Triceps Pushdown',
    'Skull Crusher', 'Overhead Triceps Extension', 'Close Grip Bench Press'],
  Legs: ['Squat (Barbell)', 'Front Squat', 'Hack Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Extension', 'Leg Curl',
    'Bulgarian Split Squat', 'Walking Lunge', 'Hip Thrust', 'Calf Raise'],
  Core: ['Hanging Leg Raise', 'Cable Crunch', 'Ab Wheel', 'Crunch'],
};

const SEED_PLANS = [
  ['Push', [['Bench Press (Barbell)', 3, '6-8'], ['Incline Bench Press (Dumbbell)', 3, '8-10'], ['Shoulder Press (Dumbbell)', 3, '8-10'],
    ['Lateral Raise (Dumbbell)', 3, '12-15'], ['Triceps Pushdown', 3, '10-12']]],
  ['Pull', [['Pull Up', 3, '6-10'], ['Bent Over Row (Barbell)', 3, '8'], ['Lat Pulldown (Cable)', 3, '10-12'],
    ['Face Pull (Cable)', 3, '15'], ['Bicep Curl (Dumbbell)', 3, '10-12']]],
  ['Legs', [['Squat (Barbell)', 3, '5-8'], ['Romanian Deadlift', 3, '8-10'], ['Leg Press', 3, '10-12'],
    ['Leg Curl', 3, '12'], ['Calf Raise', 4, '12-15']]],
];

// ---------- Icons (SF Symbols-ish) ----------
const sv = (d, sw = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  dumbbell: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5.5" width="3.4" height="13" rx="1.7"/><rect x="15.6" y="5.5" width="3.4" height="13" rx="1.7"/><rect x="1.6" y="8.5" width="2.8" height="7" rx="1.4"/><rect x="19.6" y="8.5" width="2.8" height="7" rx="1.4"/><rect x="8" y="10.8" width="8" height="2.4" rx="1.1"/></svg>',
  history: sv('<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.2 4.2v4.4h4.4"/><path d="M12 7.6V12l3 1.9"/>'),
  scale: sv('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M8.2 10.4a5.2 5.2 0 0 1 7.6 0"/><path d="M12 11.2l1.7-2.5"/>'),
  gear: sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>', 1.8),
  plus: sv('<path d="M12 5v14M5 12h14"/>', 2.4),
  minus: sv('<path d="M5 12h14"/>', 2.4),
  check: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 3),
  chevL: sv('<path d="M15 5l-7 7 7 7"/>', 2.6),
  chevR: sv('<path d="M9 5l7 7-7 7"/>', 2.6),
  chevD: sv('<path d="M5 9l7 7 7-7"/>', 2.6),
  chevU: sv('<path d="M5 15l7-7 7 7"/>', 2.6),
  dots: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  trophy: sv('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>', 2.2),
  search: sv('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', 2.2),
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6c0 .8.9 1.3 1.6.8l10.2-6.8c.6-.4.6-1.2 0-1.6L9.6 4.4C8.9 3.9 8 4.4 8 5.2z"/></svg>',
};

// ---------- Helpers ----------
const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pad2 = n => String(n).padStart(2, '0');
const num = v => parseFloat(String(v ?? '').replace(',', '.'));
const r1 = n => Math.round(n * 10) / 10;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const dayKey = (d = new Date()) => { d = new Date(d); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const keyDate = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = keyDate(k); d.setDate(d.getDate() + n); return dayKey(d); };
const daysBetween = (a, b) => Math.round((keyDate(b) - keyDate(a)) / 864e5);

const unit = () => S.settings.unit;
const toU = kg => unit() === 'lb' ? kg * LB : kg;
const fromU = v => unit() === 'lb' ? v / LB : v;
const f1 = v => r1(v).toFixed(1);
const fLoad = kg => { const v = r1(toU(kg)); return Number.isInteger(v) ? String(v) : v.toFixed(1); };
const fVol = v => `${Math.round(v).toLocaleString('en-US')} ${unit()}`;
const signed = d => (d > 0 ? '+' : d < 0 ? '−' : '') + f1(Math.abs(d));

const fmtDate = (d, o) => new Date(d).toLocaleDateString('en-GB', o);
const shortDay = d => fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' });
const longDay = d => fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' });
const hhmm = d => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
function relDay(k) {
  const n = daysBetween(k, dayKey());
  if (n === 0) return 'Today';
  if (n === 1) return 'Yesterday';
  if (n > 1 && n < 7) return `${n} days ago`;
  return shortDay(keyDate(k));
}
const clock = ms => {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60);
  return h ? `${h}:${pad2(m)}:${pad2(s % 60)}` : `${m}:${pad2(s % 60)}`;
};
const dur = ms => { const m = Math.max(1, Math.round(ms / 6e4)); return m >= 60 ? `${Math.floor(m / 60)}h ${pad2(m % 60)}m` : `${m}m`; };
const stat = (k, v, id) => `<div class="stat"><div class="k">${k}</div><div class="v"${id ? ` id="${id}"` : ''}>${v}</div></div>`;

const haptic = (() => {
  // iOS Safari has no vibrate API, but toggling a native <input switch> plays the system haptic.
  let lbl;
  return () => {
    try {
      if (navigator.vibrate) return void navigator.vibrate(8);
      if (!lbl) {
        lbl = document.createElement('label');
        const i = document.createElement('input');
        i.type = 'checkbox'; i.setAttribute('switch', '');
        lbl.appendChild(i); lbl.style.display = 'none';
        document.body.appendChild(lbl);
      }
      lbl.click();
    } catch (e) { /* haptics are best effort */ }
  };
})();

// ---------- State ----------
function seed() {
  const exercises = [];
  for (const [muscle, names] of Object.entries(SEED_EXERCISES)) for (const name of names) exercises.push({ id: slug(name), name, muscle });
  const plans = SEED_PLANS.map(([name, items]) => ({ id: uid(), name, items: items.map(([n, sets, reps]) => ({ exId: slug(n), sets, reps })) }));
  return { v: 1, settings: { unit: 'kg', rest: 90, weighIn: true }, weights: [], skipDay: null, exercises, plans, workouts: [], active: null };
}
const migrate = d => { const base = seed(); return { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } }; };
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) { console.warn(e); }
  return seed();
}
let S = load();
function save() {
  clearTimeout(saveT);
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Couldn’t save'); }
}
let saveT;
const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 250); };

const exById = id => S.exercises.find(e => e.id === id);
const exName = (id, fallback) => exById(id)?.name || fallback || 'Deleted exercise';
const planById = id => S.plans.find(p => p.id === id);
function lastSets(exId) {
  for (let i = S.workouts.length - 1; i >= 0; i--) {
    const e = S.workouts[i].exercises.find(x => x.exId === exId);
    if (e?.sets.length) return e.sets;
  }
  return null;
}
function bestWeight(exId) {
  let b = null;
  for (const w of S.workouts) for (const e of w.exercises) if (e.exId === exId) for (const s of e.sets) if (s.w > 0 && (b === null || s.w > b)) b = s.w;
  return b;
}
function lastPlanDone(id) {
  for (let i = S.workouts.length - 1; i >= 0; i--) if (S.workouts[i].planId === id) return S.workouts[i].end;
  return null;
}
const workoutVol = w => w.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + s.w * s.r, 0), 0);
const workoutSets = w => w.exercises.reduce((a, e) => a + e.sets.length, 0);

// ---------- UI state ----------
const ui = {
  tab: 'workout',
  stack: { workout: [], history: [], weight: [] },
  sheet: null,
  wkOpen: false,
  range: '1M',
  weightAll: false,
  libQ: '',
  pickQ: '', pickSel: [], pickCb: null,
};
const scrollMem = {};
let renderedDay = dayKey();

const $screens = $('#screens'), $tabbar = $('#tabbar'), $mini = $('#mini');
const $workout = $('#workout'), $sheet = $('#sheet'), $actions = $('#actions'), $toast = $('#toast');

// ---------- Navigation ----------
const TABS = [['workout', 'Workout', 'dumbbell'], ['history', 'History', 'history'], ['weight', 'Weight', 'scale']];
const topScreen = () => { const st = ui.stack[ui.tab]; return st[st.length - 1] || { name: ui.tab }; };

function nav({ title = '', back = false, right = '', solid = false }) {
  return `<div class="nav${solid ? ' solid' : ''}"><div class="nav-side">${back ? `<button class="icon-btn" data-a="back" aria-label="Back">${I.chevL}</button>` : ''}</div><div class="nav-title">${esc(title)}</div><div class="nav-side right">${right}</div></div>`;
}

function renderScreen(anim) {
  $screens.querySelectorAll('.leaving').forEach(n => n.remove());
  const sc = topScreen(), key = `${sc.name}:${sc.id || ''}`;
  const old = $screens.firstElementChild;
  if (old) scrollMem[old.dataset.key] = old.scrollTop;
  const el = document.createElement('div');
  el.className = 'screen';
  el.dataset.key = key;
  el.innerHTML = SCREENS[sc.name](sc);
  if (anim === 'push') { $screens.appendChild(el); el.classList.add('in-right'); delete scrollMem[key]; }
  else if (anim === 'pop') { $screens.insertBefore(el, old); el.classList.add('in-left'); }
  else $screens.appendChild(el);
  if (anim !== 'push') el.scrollTop = scrollMem[key] || 0;
  if (old) {
    if (anim) { old.classList.add('leaving', anim === 'push' ? 'out-left' : 'out-right'); setTimeout(() => old.remove(), 430); }
    else old.remove();
  }
  const navEl = el.querySelector('.nav');
  const onScroll = () => { navEl?.classList.toggle('scrolled', el.scrollTop > 4); navEl?.classList.toggle('titled', el.scrollTop > 40); };
  el.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  el.addEventListener('animationend', () => el.classList.remove('in-right', 'in-left'), { once: true });
  renderedDay = dayKey();
}

function push(sc) { document.activeElement?.blur?.(); ui.stack[ui.tab].push(sc); renderScreen('push'); }
function back() {
  const st = ui.stack[ui.tab];
  if (!st.length) return;
  document.activeElement?.blur?.();
  const leaving = st.pop();
  if (leaving.name === 'plan') {
    // Throw away plans that were created and left empty; name the rest.
    const p = planById(leaving.id);
    if (p && !p.name.trim() && !p.items.length) S.plans = S.plans.filter(x => x !== p);
    else if (p && !p.name.trim()) p.name = 'Untitled Plan';
    save();
  }
  renderScreen('pop');
}

function renderTabbar() {
  $tabbar.innerHTML = TABS.map(([k, label, icon]) => `<button class="tab${ui.tab === k ? ' active' : ''}" data-a="tab" data-t="${k}">${I[icon]}<span>${label}</span></button>`).join('');
}

function renderMini() {
  const a = S.active, show = !!a && !ui.wkOpen;
  $mini.classList.toggle('show', show);
  document.body.classList.toggle('has-mini', show);
  if (show) {
    $mini.innerHTML = `<button class="mini" data-a="wk-open"><span class="pulse"></span><div class="grow"><b>${esc(a.name)}</b><div class="sub"><span data-elapsed>${clock(Date.now() - a.start)}</span><span id="mini-rest"></span></div></div><span class="go">${I.chevU}</span></button>`;
    updateRest();
  }
}

// ---------- Screen: Workout ----------
function scWorkout() {
  const a = S.active;
  return nav({ title: 'Workout', right: `<button class="icon-btn" data-a="settings" aria-label="Settings">${I.gear}</button>` }) +
    `<h1 class="large-title">Workout</h1>` +
    (a ? `<button class="resume-card" data-a="wk-open"><span class="pulse"></span><div class="grow"><b>${esc(a.name)}</b><div class="sub">In progress · <span data-elapsed>${clock(Date.now() - a.start)}</span></div></div><span class="btn btn-green btn-sm">Resume</span></button>` : '') +
    `<div class="section"><button class="btn btn-tinted" data-a="start-empty">${I.plus}Start Empty Workout</button></div>` +
    `<div class="section"><div class="section-head"><h2>Plans</h2><button class="link" data-a="plan-new">New Plan</button></div>` +
    (S.plans.length ? S.plans.map(planCard).join('') : `<div class="card empty"><b>No plans yet</b>Make a plan with the exercises you do, then start it with one tap.</div>`) +
    `</div>`;
}

function planCard(p) {
  const names = p.items.map(it => exName(it.exId)).join(', ');
  const last = lastPlanDone(p.id);
  return `<div class="plan-card" role="button" data-a="plan-open" data-id="${p.id}">
    <div class="top"><div><h3>${esc(p.name || 'Untitled Plan')}</h3><div class="meta">${plural(p.items.length, 'exercise')}${last ? ` · Last done ${relDay(dayKey(last)).toLowerCase()}` : ''}</div></div>
    <button class="dots" data-a="plan-menu" data-id="${p.id}" aria-label="Plan options">${I.dots}</button></div>
    <div class="exs">${esc(names) || 'No exercises yet'}</div>
    <button class="btn btn-primary" style="height:46px" data-a="plan-start" data-id="${p.id}">${I.play}Start</button>
  </div>`;
}

function scPlan({ id }) {
  const p = planById(id);
  if (!p) return nav({ back: true }) + `<div class="empty">This plan was deleted.</div>`;
  return nav({ title: p.name || 'New Plan', back: true, solid: true, right: `<button class="icon-btn" data-a="plan-menu" data-id="${id}" aria-label="Plan options">${I.dots}</button>` }) +
    `<input class="name-input" id="plan-name" data-id="${id}" value="${esc(p.name)}" placeholder="Plan name" enterkeyhint="done" autocomplete="off" autocapitalize="words">` +
    `<div class="section"><div class="list">${p.items.map((it, i) => planItem(p, it, i)).join('') || `<div class="empty">Add the exercises you do in this plan.<br>Set how many sets and the rep range for each.</div>`}</div></div>` +
    `<div class="section stack"><button class="btn btn-tinted" data-a="plan-add" data-id="${id}">${I.plus}Add Exercises</button>` +
    (p.items.length ? `<button class="btn btn-primary" data-a="plan-start" data-id="${id}">${I.play}Start Workout</button>` : '') + `</div>`;
}

function planItem(p, it, i) {
  return `<div class="plan-item"><div class="grow"><div class="title">${esc(exName(it.exId))}</div><div class="ctrl">
    <div class="stepper"><button data-a="plan-sets" data-id="${p.id}" data-i="${i}" data-d="-1" aria-label="Fewer sets">${I.minus}</button><span>${plural(it.sets, 'set')}</span><button data-a="plan-sets" data-id="${p.id}" data-i="${i}" data-d="1" aria-label="More sets">${I.plus}</button></div>
    <input class="reps-input" data-plan-reps="${i}" data-id="${p.id}" value="${esc(it.reps)}" placeholder="reps" enterkeyhint="done" autocomplete="off">
    </div></div><button class="dots" data-a="plan-item" data-id="${p.id}" data-i="${i}" aria-label="Exercise options">${I.dots}</button></div>`;
}

// ---------- Screen: Settings & library ----------
function scSettings() {
  const st = S.settings;
  return nav({ title: 'Settings', back: true }) + `<h1 class="large-title">Settings</h1>` +
    `<div class="section-label">Units</div><div class="section"><div class="seg">${['kg', 'lb'].map(u => `<button class="${st.unit === u ? 'on' : ''}" data-a="unit" data-u="${u}">${u === 'kg' ? 'Kilograms' : 'Pounds'}</button>`).join('')}</div></div>` +
    `<div class="section-label">Workout</div><div class="section"><div class="list"><div class="row"><div class="grow title">Rest timer</div><div class="stepper"><button data-a="rest-step" data-d="-1" aria-label="Shorter">${I.minus}</button><span>${st.rest ? clock(st.rest * 1000) : 'Off'}</span><button data-a="rest-step" data-d="1" aria-label="Longer">${I.plus}</button></div></div></div><div class="section-foot">Starts by itself when you tick off a set.</div></div>` +
    `<div class="section-label">Weigh-in</div><div class="section"><div class="list"><label class="row"><div class="grow title">Ask on first open each day</div><input type="checkbox" switch class="switch" data-c="weighin"${st.weighIn ? ' checked' : ''}></label></div></div>` +
    `<div class="section-label">Library</div><div class="section"><div class="list"><button class="row" data-a="library"><div class="grow title">Exercises</div><span class="value">${S.exercises.length}</span><span class="chev">${I.chevR}</span></button></div></div>` +
    `<div class="section-label">Backup</div><div class="section"><div class="list"><button class="row accent" data-a="export">Export Backup</button><button class="row accent" data-a="import">Import Backup</button></div><div class="section-foot">Your data is stored only on this iPhone. Export a backup now and then and save it to Files.</div></div>` +
    `<div class="section"><div class="list"><button class="row red" data-a="reset">Erase All Data</button></div><div class="section-foot" style="text-align:center;margin-top:18px">Lift ${VERSION}</div></div>`;
}

function exGroups(q) {
  const ql = q.trim().toLowerCase(), out = [];
  for (const m of MUSCLES) {
    const items = S.exercises.filter(e => (MUSCLES.includes(e.muscle) ? e.muscle : 'Other') === m && (!ql || e.name.toLowerCase().includes(ql)))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (items.length) out.push([m, items]);
  }
  return out;
}

function scLibrary() {
  return nav({ title: 'Exercises', back: true, right: `<button class="icon-btn accent" data-a="lib-add" aria-label="New exercise">${I.plus}</button>` }) +
    `<h1 class="large-title">Exercises</h1><div class="search">${I.search}<input id="lib-q" placeholder="Search" autocomplete="off" value="${esc(ui.libQ)}"></div><div id="lib-list" style="margin-top:18px">${libList()}</div>`;
}
function libList() {
  const used = {};
  for (const w of S.workouts) for (const e of w.exercises) used[e.exId] = (used[e.exId] || 0) + 1;
  const groups = exGroups(ui.libQ);
  if (!groups.length) return `<div class="empty">No exercises match.</div>`;
  return groups.map(([m, items]) => `<div class="section-label">${m}</div><div class="section"><div class="list">${items.map(e => `<button class="row" data-a="lib-ex" data-id="${e.id}"><div class="grow title">${esc(e.name)}</div><span class="value">${used[e.id] ? plural(used[e.id], 'workout') : ''}</span></button>`).join('')}</div></div>`).join('');
}

// ---------- Screen: History ----------
function scHistory() {
  const today = dayKey(), now = new Date();
  const monday = addDays(today, -((now.getDay() + 6) % 7));
  const days = [...Array(7)].map((_, i) => addDays(monday, i));
  const byDay = new Set(S.workouts.map(w => dayKey(w.start)));
  const week = S.workouts.filter(w => dayKey(w.start) >= monday);
  let html = nav({ title: 'History' }) + `<h1 class="large-title">History</h1>` +
    `<div class="section"><div class="card"><div class="hero" style="padding:0"><div class="cap">This week</div></div>
    <div class="week">${days.map((k, i) => `<div><i class="${byDay.has(k) ? 'on' : ''}${k === today ? ' today' : ''}">${byDay.has(k) ? I.check : ''}</i>${'MTWTFSS'[i]}</div>`).join('')}</div>
    <div class="stats" style="margin-top:16px">${stat('Workouts', week.length)}${stat('Time', week.length ? dur(week.reduce((a, w) => a + w.end - w.start, 0)) : '0m')}${stat('Volume', fVol(toU(week.reduce((a, w) => a + workoutVol(w), 0))))}</div></div></div>`;
  if (!S.workouts.length) return html + `<div class="section"><div class="card empty"><b>No workouts yet</b>Finished workouts show up here.</div></div>`;
  let month = '';
  for (const w of [...S.workouts].reverse()) {
    const m = fmtDate(w.start, { month: 'long', year: 'numeric' });
    if (m !== month) { if (month) html += '</div>'; html += `<div class="section-label">${m}</div><div class="section">`; month = m; }
    html += histCard(w);
  }
  return html + '</div>';
}

function histCard(w) {
  const n = (w.prs || []).length;
  return `<div class="hist-card" role="button" data-a="hist-open" data-id="${w.id}"><h3>${esc(w.name)}${n ? `<span class="pr">${I.trophy}${n} PR</span>` : ''}</h3><div class="meta">${shortDay(w.start)} · ${hhmm(w.start)}</div>
    <div class="stats">${stat('Time', dur(w.end - w.start))}${stat('Volume', fVol(toU(workoutVol(w))))}${stat('Sets', workoutSets(w))}</div>
    <ul>${w.exercises.map(e => `<li>${e.sets.length} × ${esc(exName(e.exId, e.name))}</li>`).join('')}</ul></div>`;
}

function scDetail({ id }) {
  const w = S.workouts.find(x => x.id === id);
  if (!w) return nav({ back: true }) + `<div class="empty">This workout was deleted.</div>`;
  const prs = new Set(w.prs || []);
  return nav({ title: w.name, back: true }) +
    `<h1 class="large-title" style="padding-bottom:2px">${esc(w.name)}</h1><div class="section-foot" style="padding:0 16px 18px">${longDay(w.start)} · ${hhmm(w.start)}</div>` +
    `<div class="section"><div class="card stats">${stat('Time', dur(w.end - w.start))}${stat('Volume', fVol(toU(workoutVol(w))))}${stat('Sets', workoutSets(w))}</div></div>` +
    w.exercises.map(e => `<div class="section"><div class="sub-head">${esc(exName(e.exId, e.name))}${prs.has(e.exId) ? `<span class="pr">${I.trophy}PR</span>` : ''}</div><div class="list">${e.sets.map((s, i) => `<div class="det-set"><span class="n">${i + 1}</span><span class="num">${s.w ? `${fLoad(s.w)} ${unit()} × ${s.r}` : `${s.r} reps`}</span></div>`).join('')}</div></div>`).join('') +
    `<div class="section stack"><button class="btn btn-primary" data-a="hist-repeat" data-id="${id}">${I.play}Do It Again</button><button class="btn btn-plain red" data-a="hist-delete" data-id="${id}">Delete Workout</button></div>`;
}

// ---------- Screen: Weight ----------
function scWeight() {
  const ws = S.weights, last = ws[ws.length - 1], today = dayKey();
  const loggedToday = last?.date === today;
  const change = days => {
    if (!last) return null;
    const cutoff = addDays(last.date, -days);
    let base = null;
    for (const w of ws) { if (w.date <= cutoff) base = w; else break; }
    return base ? toU(last.kg) - toU(base.kg) : null;
  };
  const chip = (label, v) => v === null ? '' : `<span class="chip">${label}<b>${signed(v)}</b></span>`;
  const total = ws.length > 1 ? toU(last.kg) - toU(ws[0].kg) : null;
  const days = { '1M': 30, '3M': 91, '1Y': 365 }[ui.range];
  const cutoff = days ? addDays(today, -days) : '';
  const points = ws.filter(w => w.date >= cutoff).map(w => ({ t: keyDate(w.date).getTime(), v: toU(w.kg) }));
  const rows = [...ws].reverse(), shown = ui.weightAll ? rows : rows.slice(0, 30);

  return nav({ title: 'Weight', right: `<button class="icon-btn accent" data-a="weigh-open" data-date="${today}" aria-label="Log weight">${I.plus}</button>` }) +
    `<h1 class="large-title">Weight</h1>` +
    `<div class="section"><div class="card hero"><div class="cap">${last ? relDay(last.date) : 'No weigh-ins yet'}</div>
      <div class="big">${last ? f1(toU(last.kg)) : '—'}<small>${unit()}</small></div>
      <div class="chips">${chip('7 days', change(7))}${chip('30 days', change(30))}${chip('Total', total)}</div>
      ${loggedToday ? '' : `<button class="btn btn-primary" style="margin-top:16px" data-a="weigh-open" data-date="${today}">Log Today’s Weight</button>`}
    </div></div>` +
    `<div class="section"><div class="card"><div class="seg">${['1M', '3M', '1Y', 'All'].map(r => `<button class="${ui.range === r ? 'on' : ''}" data-a="range" data-r="${r}">${r}</button>`).join('')}</div><div class="chart">${chart(points)}</div></div></div>` +
    (rows.length ? `<div class="section-label">Entries</div><div class="section"><div class="list">${shown.map((w, i) => {
      const older = rows[i + 1];
      return `<button class="row" data-a="weigh-open" data-date="${w.date}"><div class="grow title">${relDay(w.date)}</div><span class="delta">${older ? signed(toU(w.kg) - toU(older.kg)) : ''}</span><span class="wnum">${f1(toU(w.kg))}</span></button>`;
    }).join('')}${!ui.weightAll && rows.length > shown.length ? `<button class="row accent" data-a="weight-all">Show all ${rows.length}</button>` : ''}</div></div>` : '');
}

function smoothPath(pts) {
  const f = n => n.toFixed(1);
  if (pts.length < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])},${f(p[1])}`).join('');
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, t = 0.18;
    d += `C${f(p1[0] + (p2[0] - p0[0]) * t)},${f(p1[1] + (p2[1] - p0[1]) * t)} ${f(p2[0] - (p3[0] - p1[0]) * t)},${f(p2[1] - (p3[1] - p1[1]) * t)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

function chart(points) {
  if (points.length < 2) return `<div class="chart-empty">${points.length ? 'Log another day to see your trend.' : 'No weigh-ins in this range yet.'}</div>`;
  const W = 340, H = 170, L = 4, R = 40, T = 12, B = 26;
  const vs = points.map(p => p.v);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (hi - lo < 1) { const m = (hi + lo) / 2; lo = m - 0.5; hi = m + 0.5; }
  const padV = (hi - lo) * 0.15; lo -= padV; hi += padV;
  const t0 = points[0].t, t1 = points[points.length - 1].t;
  const X = t => L + (t - t0) / (t1 - t0) * (W - L - R);
  const Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  const pts = points.map(p => [X(p.t), Y(p.v)]);
  const line = smoothPath(pts), lp = pts[pts.length - 1];
  const grid = [0, 0.5, 1].map(k => {
    const y = T + k * (H - T - B);
    return `<line x1="${L}" x2="${W - R + 6}" y1="${y}" y2="${y}" style="stroke:var(--sep)" stroke-dasharray="2 4"/><text x="${W - R + 10}" y="${y + 4}">${f1(hi - k * (hi - lo))}</text>`;
  }).join('');
  const dots = points.length <= 45 ? pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.2" style="fill:var(--accent);opacity:.55"/>`).join('') : '';
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Weight trend">
    <defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.3"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient></defs>
    ${grid}
    <path d="${line}L${lp[0].toFixed(1)},${H - B}L${pts[0][0].toFixed(1)},${H - B}Z" style="fill:url(#wg)"/>
    <path d="${line}" fill="none" style="stroke:var(--accent)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
    <circle cx="${lp[0].toFixed(1)}" cy="${lp[1].toFixed(1)}" r="5.5" style="fill:var(--accent);stroke:var(--card)" stroke-width="3"/>
    <text x="${L}" y="${H - 6}">${fmtDate(t0, { day: 'numeric', month: 'short' })}</text>
    <text x="${W - R}" y="${H - 6}" text-anchor="end">${fmtDate(t1, { day: 'numeric', month: 'short' })}</text>
  </svg>`;
}

const SCREENS = { workout: scWorkout, history: scHistory, weight: scWeight, plan: scPlan, settings: scSettings, library: scLibrary, detail: scDetail };

// ---------- Sheets ----------
function openSheet(s) {
  ui.sheet = s;
  $sheet.innerHTML = `<div class="backdrop" data-a="sheet-dismiss"></div><div class="sheet${s.kind === 'picker' ? ' tall' : ''}">${SHEETS[s.kind](s)}</div>`;
  const panel = $sheet.lastElementChild;
  panel.querySelectorAll('.grab-area, .sheet-head').forEach(h => enableDrag(h, panel, dismissSheet));
  if (s.kind === 'weigh') bindRuler(s);
  void $sheet.offsetHeight;
  $sheet.classList.add('show');
}
function closeSheet() {
  if (!ui.sheet) return;
  ui.sheet = null;
  document.activeElement?.blur?.();
  $sheet.classList.remove('show');
  setTimeout(() => { if (!ui.sheet) $sheet.innerHTML = ''; }, 460);
}
// Swiping away the morning prompt counts as "skip today" so it doesn't nag again.
function dismissSheet() {
  if (ui.sheet?.kind === 'weigh' && ui.sheet.morning) { S.skipDay = dayKey(); save(); }
  closeSheet();
}

function enableDrag(handle, panel, onClose) {
  let y0 = null, dy = 0, t0 = 0;
  handle.addEventListener('touchstart', e => {
    if (e.target.closest('button, input')) return;
    y0 = e.touches[0].clientY; t0 = performance.now(); dy = 0;
    panel.style.transition = 'none';
  }, { passive: true });
  handle.addEventListener('touchmove', e => {
    if (y0 === null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    panel.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  const end = () => {
    if (y0 === null) return;
    y0 = null;
    panel.style.transition = '';
    panel.style.transform = '';
    if (dy > 110 || (dy > 30 && dy / (performance.now() - t0) > 0.5)) onClose();
  };
  handle.addEventListener('touchend', end);
  handle.addEventListener('touchcancel', end);
}

// Weigh-in
function shWeigh(s) {
  const ex = S.weights.find(w => w.date === s.date);
  s.prev = [...S.weights].reverse().find(w => w.date < s.date) || null;
  s.val = r1(ex ? toU(ex.kg) : s.prev ? toU(s.prev.kg) : unit() === 'kg' ? 75 : 165);
  s.lo = Math.max(1, Math.floor(s.val) - 30);
  s.hi = Math.floor(s.val) + 30;
  const h = new Date().getHours();
  const title = s.morning ? (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') : ex ? 'Edit Weight' : 'Log Weight';
  const sub = s.morning ? 'Log your weight for today' : longDay(keyDate(s.date));
  const alt = s.morning ? `<button class="btn btn-plain" data-a="weigh-skip">Skip Today</button>`
    : ex ? `<button class="btn btn-plain red" data-a="weigh-del">Delete Entry</button>`
    : `<button class="btn btn-plain" data-a="sheet-close">Cancel</button>`;
  return `<div class="grab-area"><div class="grab"></div></div><div class="weigh"><h1>${title}</h1><div class="date">${sub}</div>
    <div class="weigh-num"><input id="wv" inputmode="decimal" autocomplete="off" maxlength="5" value="${f1(s.val)}" aria-label="Weight"><span class="u">${unit()}</span></div>
    <div class="vs" id="wvs">${vsText(s)}</div>
    <div class="ruler-wrap"><div class="ruler" id="ruler">${rulerTicks(s.lo, s.hi)}</div></div>
    <div class="stack"><button class="btn btn-primary" data-a="weigh-save">Save</button>${alt}</div></div>`;
}
function rulerTicks(lo, hi) {
  let h = '<div class="pad"></div>';
  for (let i = lo * 10; i <= hi * 10; i++) h += `<i class="t${i % 10 === 0 ? ' w' : i % 5 === 0 ? ' h' : ''}">${i % 10 === 0 ? `<b>${i / 10}</b>` : ''}</i>`;
  return h + '<div class="pad"></div>';
}
function vsText(s) {
  if (!s.prev) return '';
  const d = r1(s.val - toU(s.prev.kg));
  const rel = relDay(s.prev.date), when = rel === 'Yesterday' ? 'yesterday' : rel.includes('ago') ? rel : `on ${rel}`;
  return d === 0 ? `Same as ${when}` : `${d > 0 ? '▲' : '▼'} ${f1(Math.abs(d))} ${unit()} from ${when}`;
}
const sizeWv = el => { const v = el.value || '0'; el.style.width = `${v.length - (/[.,]/.test(v) ? 0.45 : 0) + 0.15}ch`; };
function bindRuler(s) {
  const ruler = $('#ruler'), inp = $('#wv'), vs = $('#wvs');
  const place = () => { ruler.scrollLeft = Math.round((s.val - s.lo) * 10) * RULER_TICK; };
  requestAnimationFrame(place);
  let lastTick = 0;
  ruler.addEventListener('scroll', () => {
    const v = r1(s.lo + Math.round(ruler.scrollLeft / RULER_TICK) / 10);
    if (v === s.val) return;
    s.val = v;
    vs.textContent = vsText(s);
    if (document.activeElement === inp) return;
    inp.value = f1(v);
    sizeWv(inp);
    const t = performance.now();
    if (t - lastTick > 35) { haptic(); lastTick = t; }
  }, { passive: true });
  inp.addEventListener('input', () => {
    sizeWv(inp);
    const v = num(inp.value);
    if (!(v > 0 && v < 1000)) return;
    s.val = r1(v);
    if (s.val < s.lo || s.val > s.hi) {
      s.lo = Math.max(1, Math.floor(s.val) - 30); s.hi = Math.floor(s.val) + 30;
      ruler.innerHTML = rulerTicks(s.lo, s.hi);
    }
    place();
    vs.textContent = vsText(s);
  });
  inp.addEventListener('focus', () => inp.select());
  inp.addEventListener('blur', () => { inp.value = f1(s.val); sizeWv(inp); });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
  sizeWv(inp);
}
function maybeWeighIn() {
  const t = dayKey();
  if (!S.settings.weighIn || ui.sheet || S.skipDay === t || S.weights.some(w => w.date === t)) return;
  openSheet({ kind: 'weigh', date: t, morning: true });
}

// Exercise picker
function openPicker(cb) {
  ui.pickQ = ''; ui.pickSel = []; ui.pickCb = cb;
  openSheet({ kind: 'picker' });
}
function shPicker() {
  return `<div class="grab-area"><div class="grab"></div></div>
    <div class="sheet-head"><div class="side"><button class="link" data-a="sheet-close">Cancel</button></div><h2>Add Exercises</h2><div class="side right"><button class="link" style="font-weight:600" data-a="pick-done" id="pick-done">Add</button></div></div>
    <div class="search">${I.search}<input id="pick-q" placeholder="Search or create" autocomplete="off" enterkeyhint="search"></div>
    <div class="sheet-body" id="pick-list">${pickList()}</div>`;
}
function pickList() {
  const q = ui.pickQ.trim();
  const exact = S.exercises.some(e => e.name.toLowerCase() === q.toLowerCase());
  let h = q && !exact ? `<div class="pick-group"><div class="list"><button class="row accent" data-a="pick-create"><div class="grow title">Create “${esc(q)}”</div></button></div></div>` : '';
  const groups = exGroups(q);
  h += groups.map(([m, items]) => `<div class="section-label">${m}</div><div class="pick-group"><div class="list">${items.map(e =>
    `<button class="row pick-row${ui.pickSel.includes(e.id) ? ' on' : ''}" data-a="pick-toggle" data-id="${e.id}"><div class="grow title">${esc(e.name)}</div><span class="tick">${I.check}</span></button>`).join('')}</div></div>`).join('');
  return h || `<div class="empty">No exercises yet.</div>`;
}
const updatePickBtn = () => { const b = $('#pick-done'); if (b) b.textContent = ui.pickSel.length ? `Add (${ui.pickSel.length})` : 'Add'; };

// Workout summary
function shSummary(s) {
  const w = S.workouts.find(x => x.id === s.id);
  if (!w) return '';
  const p = w.planId && planById(w.planId);
  // Only offer to grow the plan with exercises added mid-workout; skipped ones never get removed.
  const added = p ? w.exercises.filter(e => !p.items.some(i => i.exId === e.exId)) : [];
  const planBtn = !p ? `<button class="btn btn-tinted" data-a="sum-save-plan" data-id="${w.id}">Save as Plan</button>`
    : added.length ? `<button class="btn btn-tinted" data-a="sum-update-plan" data-id="${w.id}">Add ${plural(added.length, 'new exercise')} to “${esc(p.name)}”</button>` : '';
  const prRows = (w.prs || []).map(id => {
    const e = w.exercises.find(x => x.exId === id);
    return `<div class="row"><span class="pr">${I.trophy}PR</span><div class="grow title">${esc(exName(id, e.name))}</div><span class="value num">${fLoad(Math.max(...e.sets.map(x => x.w)))} ${unit()}</span></div>`;
  }).join('');
  return `<div class="grab-area"><div class="grab"></div></div><div class="sheet-body">
    <div class="weigh"><div class="done-badge">${I.check}</div><h1>Nice work</h1><div class="date">${esc(w.name)} · workout #${S.workouts.indexOf(w) + 1}</div></div>
    <div class="section" style="margin-top:18px"><div class="card stats">${stat('Time', dur(w.end - w.start))}${stat('Volume', fVol(toU(workoutVol(w))))}${stat('Sets', workoutSets(w))}</div></div>
    ${prRows ? `<div class="section-label">New personal records</div><div class="section"><div class="list">${prRows}</div></div>` : ''}
    <div class="section stack">${planBtn}<button class="btn btn-primary" data-a="sheet-close">Done</button></div></div>`;
}

const SHEETS = { weigh: shWeigh, picker: shPicker, summary: shSummary };

// ---------- Action sheet & toast ----------
function actionSheet({ title, msg, actions }) {
  document.activeElement?.blur?.();
  $actions.innerHTML = `<div class="backdrop" data-x="-1"></div><div class="as"><div class="as-group">${title ? `<div class="as-title">${esc(title)}${msg ? `<span>${esc(msg)}</span>` : ''}</div>` : ''}${actions.map((a, i) => `<button class="as-btn${a.red ? ' red' : ''}" data-x="${i}">${esc(a.label)}</button>`).join('')}</div><button class="as-btn as-cancel" data-x="-1">Cancel</button></div>`;
  void $actions.offsetHeight;
  $actions.classList.add('show');
  $actions.onclick = e => {
    const b = e.target.closest('[data-x]');
    if (!b) return;
    const i = +b.dataset.x;
    $actions.onclick = null;
    $actions.classList.remove('show');
    setTimeout(() => { if (!$actions.classList.contains('show')) $actions.innerHTML = ''; }, 420);
    if (i >= 0) actions[i].run();
  };
}
let toastT;
function toast(msg) {
  $toast.innerHTML = `<div class="toast">${esc(msg)}</div>`;
  const el = $toast.firstElementChild;
  void el.offsetHeight;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 1900);
}

// ---------- Active workout ----------
function newEx(exId, item) {
  const prev = lastSets(exId);
  const n = item?.sets || prev?.length || 3;
  return { exId, target: item?.reps || '', sets: Array.from({ length: n }, () => ({ w: '', r: '', done: false })) };
}
function startWorkout(name, planId, items) {
  const go = () => {
    S.active = { id: uid(), name, planId, start: Date.now(), exercises: items.map(it => newEx(it.exId, it)), restEnd: null, restTotal: 0 };
    save(); renderScreen(); showWorkout();
  };
  if (S.active) {
    return actionSheet({ title: 'A workout is already in progress', actions: [
      { label: 'Resume Current Workout', run: showWorkout },
      { label: 'Discard It and Start New', red: true, run: go },
    ] });
  }
  go();
}
function startPlan(id) {
  const p = planById(id);
  if (!p) return;
  if (!p.items.length) return toast('Add exercises to this plan first');
  startWorkout(p.name || 'Workout', p.id, p.items);
}

function showWorkout() {
  if (!S.active) return;
  ui.wkOpen = true;
  $workout.innerHTML = `<div class="wk"><div class="wk-head" id="wk-head"></div><div class="wk-body" id="wk-body"></div><div class="rest-pill" id="rest"><div class="grow"><div class="k">Rest</div><div class="v" id="rest-v">0:00</div></div><button class="btn btn-sm" data-a="rest-adj" data-v="-15">−15</button><button class="btn btn-sm" data-a="rest-adj" data-v="15">+15</button><button class="btn btn-sm btn-primary" data-a="rest-skip">Skip</button><div class="prog" id="rest-p"></div></div></div>`;
  renderWorkout();
  enableDrag($('#wk-head'), $workout.firstElementChild, hideWorkout);
  void $workout.offsetHeight;
  $workout.classList.add('show');
  document.body.classList.add('wk-open');
  renderMini();
}
function hideWorkout() {
  ui.wkOpen = false;
  document.activeElement?.blur?.();
  $workout.classList.remove('show');
  document.body.classList.remove('wk-open');
  renderMini();
  renderScreen();
  setTimeout(() => { if (!ui.wkOpen) $workout.innerHTML = ''; }, 520);
}

function ph(ex, si, prev) {
  // Placeholder = last workout's matching set, else the set above, else the plan's target reps.
  const p = prev && (prev[si] || prev[prev.length - 1]);
  if (p) return { w: p.w ? fLoad(p.w) : '', r: String(p.r) };
  const low = (String(ex.target || '').match(/\d+/) || [''])[0];
  for (let k = si - 1; k >= 0; k--) {
    const s = ex.sets[k];
    if (s.w !== '' || s.r !== '') return { w: s.w, r: s.r || low };
  }
  return { w: '', r: low };
}
function refreshPh(ei) {
  const ex = S.active.exercises[ei], prev = lastSets(ex.exId);
  ex.sets.forEach((s, si) => {
    const p = ph(ex, si, prev);
    const w = $(`[data-cell="${ei}-${si}-w"]`), r = $(`[data-cell="${ei}-${si}-r"]`);
    if (w) w.placeholder = p.w;
    if (r) r.placeholder = p.r;
  });
}
function activeStats() {
  let vol = 0, sets = 0;
  for (const e of S.active.exercises) for (const s of e.sets) if (s.done) { sets++; vol += (num(s.w) || 0) * (num(s.r) || 0); }
  return { vol, sets };
}
function updateWkStats() {
  const { vol, sets } = activeStats();
  const v = $('#wk-vol'), s = $('#wk-sets');
  if (v) v.textContent = fVol(vol);
  if (s) s.textContent = sets;
}

function renderWorkout() {
  const a = S.active, body = $('#wk-body');
  if (!a || !ui.wkOpen || !body) return;
  const top = body.scrollTop, { vol, sets } = activeStats();
  $('#wk-head').innerHTML = `<div class="grab"></div><div class="bar"><button class="icon-btn" data-a="wk-min" aria-label="Minimise">${I.chevD}</button><button class="wk-title" data-a="wk-rename"><b>${esc(a.name)}</b><span data-elapsed>${clock(Date.now() - a.start)}</span></button><button class="btn btn-green btn-sm" style="height:40px;border-radius:20px;padding:0 18px" data-a="wk-finish">Finish</button></div>`;
  body.innerHTML = `<div class="wk-stats">${stat('Volume', fVol(vol), 'wk-vol')}${stat('Sets', sets, 'wk-sets')}${stat('Exercises', a.exercises.length)}</div>` +
    (a.exercises.map(exBlock).join('') || `<div class="section"><div class="card empty"><b>Empty workout</b>Add the exercises you’re doing today.</div></div>`) +
    `<div class="section stack" style="margin-top:6px"><button class="btn btn-tinted" data-a="wk-add">${I.plus}Add Exercise</button><button class="btn btn-plain red" data-a="wk-discard">Discard Workout</button></div>`;
  body.scrollTop = top;
  updateRest();
}

function exBlock(ex, ei) {
  const prev = lastSets(ex.exId);
  return `<div class="ex"><div class="ex-head"><div class="grow"><span class="ex-name">${esc(exName(ex.exId))}</span>${ex.target ? `<div class="ex-target">Target ${esc(ex.target)} reps</div>` : ''}</div><button class="dots" data-a="ex-menu" data-e="${ei}" aria-label="Exercise options">${I.dots}</button></div>
    <div class="set-row head"><span>SET</span><span>PREVIOUS</span><span>${unit().toUpperCase()}</span><span>REPS</span><span></span></div>
    ${ex.sets.map((s, si) => {
      const p = ph(ex, si, prev), pv = prev?.[si];
      return `<div class="set-row${s.done ? ' done' : ''}"><button class="set-n" data-a="set-menu" data-e="${ei}" data-s="${si}">${si + 1}</button>
        <span class="prev">${pv ? (pv.w ? `${fLoad(pv.w)} × ${pv.r}` : `${pv.r} reps`) : '—'}</span>
        <input class="cell" data-cell="${ei}-${si}-w" inputmode="decimal" value="${esc(s.w)}" placeholder="${esc(p.w)}" autocomplete="off" aria-label="Weight">
        <input class="cell" data-cell="${ei}-${si}-r" inputmode="numeric" value="${esc(s.r)}" placeholder="${esc(p.r)}" autocomplete="off" aria-label="Reps">
        <button class="check" data-a="set-check" data-e="${ei}" data-s="${si}" aria-label="Complete set">${I.check}</button></div>`;
    }).join('')}
    <button class="add-set" data-a="set-add" data-e="${ei}">${I.plus}Add Set</button></div>`;
}

function updateRest() {
  const a = S.active;
  const left = a?.restEnd ? Math.max(0, Math.ceil((a.restEnd - Date.now()) / 1000)) : 0;
  const pill = $('#rest');
  if (pill) {
    pill.classList.toggle('show', left > 0);
    if (left > 0) {
      $('#rest-v').textContent = clock(left * 1000);
      $('#rest-p').style.width = `${Math.min(100, left / a.restTotal * 100)}%`;
    }
  }
  const mr = $('#mini-rest');
  if (mr) mr.textContent = left > 0 ? ` · Rest ${clock(left * 1000)}` : '';
}

function finishWorkout() {
  const a = S.active;
  const exercises = a.exercises.map(e => ({
    exId: e.exId, name: exName(e.exId),
    sets: e.sets.filter(s => s.done).map(s => ({ w: fromU(num(s.w) || 0), r: num(s.r) || 0 })),
  })).filter(e => e.sets.length);
  const prs = exercises.filter(e => {
    const best = bestWeight(e.exId), top = Math.max(...e.sets.map(s => s.w));
    return best !== null && top > best + 1e-6;
  }).map(e => e.exId);
  const w = { id: a.id, name: a.name, planId: a.planId, start: a.start, end: Date.now(), exercises, prs };
  S.workouts.push(w);
  S.active = null;
  save(); haptic(); hideWorkout();
  setTimeout(() => openSheet({ kind: 'summary', id: w.id }), 380);
}
function discardWorkout() { S.active = null; save(); hideWorkout(); }

function tick() {
  const a = S.active;
  if (!a) return;
  const now = Date.now(), t = clock(now - a.start);
  document.querySelectorAll('[data-elapsed]').forEach(el => { el.textContent = t; });
  if (a.restEnd && now >= a.restEnd) {
    a.restEnd = null; save();
    haptic(); setTimeout(haptic, 160); setTimeout(haptic, 320);
    toast('Rest over');
  }
  updateRest();
}

// ---------- Backup ----------
async function exportData() {
  const name = `lift-backup-${dayKey()}.json`;
  const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Lift backup' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function importFile(input) {
  const f = input.files?.[0];
  input.value = '';
  if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!Array.isArray(d.exercises) || !Array.isArray(d.workouts)) throw new Error('not a Lift backup');
    actionSheet({ title: 'Replace all data with this backup?', msg: `${plural(d.workouts.length, 'workout')}, ${plural((d.weights || []).length, 'weigh-in')}`, actions: [{
      label: 'Replace My Data', red: true, run: () => { S = migrate(d); save(); resetUi(); toast('Backup restored'); },
    }] });
  } catch (e) { toast('That file isn’t a Lift backup'); }
}
function resetUi() {
  ui.stack = { workout: [], history: [], weight: [] };
  if (ui.wkOpen) hideWorkout();
  renderTabbar(); renderScreen(); renderMini();
}

// ---------- Actions ----------
const A = {
  tab: d => {
    if (d.t === ui.tab) { if (ui.stack[ui.tab].length) { ui.stack[ui.tab] = []; renderScreen('pop'); } return; }
    ui.tab = d.t; renderTabbar(); renderScreen();
  },
  back,
  settings: () => push({ name: 'settings' }),
  library: () => { ui.libQ = ''; push({ name: 'library' }); },

  'start-empty': () => startWorkout('Workout', null, []),
  'plan-new': () => {
    const p = { id: uid(), name: '', items: [] };
    S.plans.push(p); save();
    push({ name: 'plan', id: p.id });
    $('#plan-name')?.focus();
  },
  'plan-open': d => push({ name: 'plan', id: d.id }),
  'plan-start': d => startPlan(d.id),
  'plan-menu': d => {
    const p = planById(d.id);
    if (!p) return;
    actionSheet({ title: p.name || 'Untitled Plan', actions: [
      { label: 'Start Workout', run: () => startPlan(p.id) },
      { label: 'Duplicate Plan', run: () => {
        const c = JSON.parse(JSON.stringify(p));
        c.id = uid(); c.name = `${p.name} Copy`;
        S.plans.splice(S.plans.indexOf(p) + 1, 0, c); save(); renderScreen(); toast('Plan duplicated');
      } },
      { label: 'Delete Plan', red: true, run: () => {
        S.plans = S.plans.filter(x => x !== p); save();
        if (topScreen().name === 'plan') { ui.stack[ui.tab].pop(); renderScreen('pop'); } else renderScreen();
      } },
    ] });
  },
  'plan-sets': d => {
    const it = planById(d.id).items[d.i];
    it.sets = Math.max(1, Math.min(20, it.sets + +d.d));
    save(); renderScreen();
  },
  'plan-item': d => {
    const p = planById(d.id), i = +d.i, it = p.items[i];
    const move = j => { p.items.splice(i, 1); p.items.splice(j, 0, it); save(); renderScreen(); };
    actionSheet({ title: exName(it.exId), actions: [
      ...(i > 0 ? [{ label: 'Move Up', run: () => move(i - 1) }] : []),
      ...(i < p.items.length - 1 ? [{ label: 'Move Down', run: () => move(i + 1) }] : []),
      { label: 'Remove from Plan', red: true, run: () => { p.items.splice(i, 1); save(); renderScreen(); } },
    ] });
  },
  'plan-add': d => openPicker(ids => {
    const p = planById(d.id);
    for (const id of ids) p.items.push({ exId: id, sets: lastSets(id)?.length || 3, reps: '' });
    save(); renderScreen();
  }),

  'wk-open': showWorkout,
  'wk-min': hideWorkout,
  'wk-rename': () => {
    const n = prompt('Workout name', S.active.name);
    if (n?.trim()) { S.active.name = n.trim(); save(); renderWorkout(); }
  },
  'wk-finish': () => {
    let done = 0, open = 0;
    for (const e of S.active.exercises) for (const s of e.sets) s.done ? done++ : open++;
    if (!done) return actionSheet({ title: 'No sets completed', msg: 'Tick off at least one set to save this workout.', actions: [{ label: 'Discard Workout', red: true, run: discardWorkout }] });
    actionSheet({ title: 'Finish workout?', msg: open ? `${plural(open, 'unfinished set')} won’t be saved.` : '', actions: [{ label: 'Finish Workout', run: finishWorkout }] });
  },
  'wk-discard': () => actionSheet({ title: 'Discard this workout?', msg: 'Nothing from it will be saved.', actions: [{ label: 'Discard Workout', red: true, run: discardWorkout }] }),
  'wk-add': () => openPicker(ids => {
    for (const id of ids) S.active.exercises.push(newEx(id));
    save(); renderWorkout();
    requestAnimationFrame(() => { const b = $('#wk-body'); b?.scrollTo({ top: b.scrollHeight, behavior: 'smooth' }); });
  }),
  'ex-menu': d => {
    const exs = S.active.exercises, i = +d.e, ex = exs[i];
    const move = j => { exs.splice(i, 1); exs.splice(j, 0, ex); save(); renderWorkout(); };
    actionSheet({ title: exName(ex.exId), actions: [
      ...(i > 0 ? [{ label: 'Move Up', run: () => move(i - 1) }] : []),
      ...(i < exs.length - 1 ? [{ label: 'Move Down', run: () => move(i + 1) }] : []),
      { label: 'Remove Exercise', red: true, run: () => { exs.splice(i, 1); save(); renderWorkout(); } },
    ] });
  },
  'set-add': d => { S.active.exercises[d.e].sets.push({ w: '', r: '', done: false }); save(); renderWorkout(); },
  'set-menu': d => {
    const sets = S.active.exercises[d.e].sets;
    actionSheet({ title: `Set ${+d.s + 1}`, actions: [{ label: 'Delete Set', red: true, run: () => { sets.splice(+d.s, 1); save(); renderWorkout(); } }] });
  },
  'set-check': d => {
    const a = S.active, ex = a.exercises[d.e], s = ex.sets[d.s];
    if (s.done) { s.done = false; save(); renderWorkout(); return; }
    const p = ph(ex, +d.s, lastSets(ex.exId));
    const w = s.w !== '' ? num(s.w) : num(p.w), r = s.r !== '' ? num(s.r) : num(p.r);
    if (!(r > 0)) {
      const el = $(`[data-cell="${d.e}-${d.s}-r"]`);
      el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); el.focus();
      return;
    }
    s.w = w > 0 ? String(w) : '';
    s.r = String(Math.round(r));
    s.done = true;
    if (S.settings.rest) { a.restEnd = Date.now() + S.settings.rest * 1000; a.restTotal = S.settings.rest; }
    haptic(); save(); renderWorkout();
  },
  'rest-adj': d => {
    const a = S.active;
    if (!a.restEnd) return;
    a.restEnd += +d.v * 1000;
    a.restTotal = Math.max(a.restTotal, (a.restEnd - Date.now()) / 1000);
    if (a.restEnd <= Date.now()) a.restEnd = null;
    save(); updateRest();
  },
  'rest-skip': () => { S.active.restEnd = null; save(); updateRest(); },

  'weigh-open': d => openSheet({ kind: 'weigh', date: d.date || dayKey(), morning: false }),
  'weigh-save': () => {
    const s = ui.sheet, typed = num($('#wv').value);
    if (typed > 0) s.val = r1(typed);
    if (!(s.val > 0)) return;
    const kg = fromU(s.val), i = S.weights.findIndex(w => w.date === s.date);
    if (i >= 0) S.weights[i].kg = kg;
    else { S.weights.push({ date: s.date, kg }); S.weights.sort((a, b) => (a.date < b.date ? -1 : 1)); }
    save(); haptic();
    const morning = s.morning;
    closeSheet(); renderScreen();
    if (morning) toast(`Saved · ${f1(s.val)} ${unit()}`);
  },
  'weigh-skip': dismissSheet,
  'weigh-del': () => {
    const date = ui.sheet.date;
    S.weights = S.weights.filter(w => w.date !== date);
    save(); closeSheet(); renderScreen();
  },
  'weight-all': () => { ui.weightAll = true; renderScreen(); },
  range: d => { ui.range = d.r; renderScreen(); },

  'hist-open': d => push({ name: 'detail', id: d.id }),
  'hist-repeat': d => {
    const w = S.workouts.find(x => x.id === d.id);
    const p = w.planId && planById(w.planId);
    startWorkout(w.name, p ? p.id : null, p ? p.items : w.exercises.map(e => ({ exId: e.exId, sets: e.sets.length })));
  },
  'hist-delete': d => actionSheet({ title: 'Delete this workout?', msg: 'This can’t be undone.', actions: [{
    label: 'Delete Workout', red: true, run: () => { S.workouts = S.workouts.filter(w => w.id !== d.id); save(); back(); },
  }] }),

  'sheet-close': closeSheet,
  'sheet-dismiss': dismissSheet,
  'pick-toggle': (d, el) => {
    const i = ui.pickSel.indexOf(d.id);
    i >= 0 ? ui.pickSel.splice(i, 1) : ui.pickSel.push(d.id);
    el.classList.toggle('on', i < 0);
    updatePickBtn();
  },
  'pick-done': () => {
    const ids = [...ui.pickSel], cb = ui.pickCb;
    closeSheet();
    if (ids.length && cb) cb(ids);
  },
  'pick-create': () => {
    const name = ui.pickQ.trim();
    if (!name) return;
    actionSheet({ title: `Muscle group for “${name}”`, actions: MUSCLES.map(m => ({ label: m, run: () => {
      const e = { id: uid(), name, muscle: m, custom: true };
      S.exercises.push(e); save();
      ui.pickSel.push(e.id); ui.pickQ = '';
      $('#pick-q').value = ''; $('#pick-list').innerHTML = pickList(); updatePickBtn();
    } })) });
  },
  'sum-save-plan': d => {
    const w = S.workouts.find(x => x.id === d.id);
    const p = { id: uid(), name: w.name === 'Workout' ? 'New Plan' : w.name, items: w.exercises.map(e => ({ exId: e.exId, sets: e.sets.length, reps: '' })) };
    S.plans.push(p); w.planId = p.id; save();
    closeSheet(); renderScreen(); toast('Saved as a plan');
  },
  'sum-update-plan': d => {
    const w = S.workouts.find(x => x.id === d.id), p = planById(w.planId);
    for (const e of w.exercises) if (!p.items.some(i => i.exId === e.exId)) p.items.push({ exId: e.exId, sets: e.sets.length, reps: '' });
    save(); closeSheet(); renderScreen(); toast('Plan updated');
  },

  unit: d => { S.settings.unit = d.u; save(); renderScreen(); renderMini(); },
  'rest-step': d => {
    const i = REST_STEPS.indexOf(S.settings.rest);
    S.settings.rest = REST_STEPS[Math.max(0, Math.min(REST_STEPS.length - 1, (i < 0 ? 5 : i) + +d.d))];
    save(); renderScreen();
  },
  'lib-add': () => {
    const name = prompt('New exercise name')?.trim();
    if (!name) return;
    actionSheet({ title: `Muscle group for “${name}”`, actions: MUSCLES.map(m => ({ label: m, run: () => {
      S.exercises.push({ id: uid(), name, muscle: m, custom: true }); save(); renderScreen(); toast(`Added ${name}`);
    } })) });
  },
  'lib-ex': d => {
    const e = exById(d.id);
    if (!e) return;
    actionSheet({ title: e.name, msg: e.muscle, actions: [
      { label: 'Rename', run: () => { const n = prompt('Rename exercise', e.name)?.trim(); if (n) { e.name = n; save(); renderScreen(); } } },
      { label: 'Change Muscle Group', run: () => actionSheet({ title: e.name, actions: MUSCLES.map(m => ({ label: m, run: () => { e.muscle = m; save(); renderScreen(); } })) }) },
      { label: 'Delete Exercise', red: true, run: () => {
        S.exercises = S.exercises.filter(x => x !== e);
        for (const p of S.plans) p.items = p.items.filter(i => i.exId !== e.id);
        save(); renderScreen();
      } },
    ] });
  },
  export: exportData,
  import: () => $('#import-file').click(),
  reset: () => actionSheet({ title: 'Erase all data?', msg: 'Deletes every workout, plan and weigh-in on this iPhone. Export a backup first if you want to keep them.', actions: [{
    label: 'Erase Everything', red: true, run: () => { S = seed(); save(); resetUi(); toast('All data erased'); },
  }] }),
};

// ---------- Events ----------
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el || el.closest('#actions')) return;
  const fn = A[el.dataset.a];
  if (fn) { e.preventDefault(); fn(el.dataset, el, e); }
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.cell && S.active) {
    const [ei, si, f] = t.dataset.cell.split('-');
    const s = S.active.exercises[ei]?.sets[si];
    if (!s) return;
    s[f] = t.value.replace(',', '.');
    saveSoon(); refreshPh(+ei); updateWkStats();
  } else if (t.id === 'plan-name') {
    const p = planById(t.dataset.id);
    if (!p) return;
    p.name = t.value;
    const title = t.closest('.screen')?.querySelector('.nav-title');
    if (title) title.textContent = t.value || 'New Plan';
    saveSoon();
  } else if (t.dataset.planReps !== undefined) {
    const it = planById(t.dataset.id)?.items[t.dataset.planReps];
    if (it) { it.reps = t.value.trim(); saveSoon(); }
  } else if (t.id === 'pick-q') {
    ui.pickQ = t.value; $('#pick-list').innerHTML = pickList();
  } else if (t.id === 'lib-q') {
    ui.libQ = t.value; $('#lib-list').innerHTML = libList();
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.c === 'weighin') { S.settings.weighIn = t.checked; save(); }
  else if (t.id === 'import-file') importFile(t);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches('#plan-name, .reps-input, .cell')) e.target.blur();
});

// iOS sometimes leaves the page shifted after the keyboard closes.
document.addEventListener('focusout', () => setTimeout(() => {
  if (!document.activeElement || document.activeElement === document.body) window.scrollTo(0, 0);
}, 60));

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    tick();
    if (dayKey() !== renderedDay) renderScreen();
    maybeWeighIn();
  } else save();
});
window.addEventListener('pagehide', save);

// ---------- Boot ----------
renderTabbar();
renderScreen();
renderMini();
setInterval(tick, 1000);
setTimeout(maybeWeighIn, 450);
navigator.storage?.persist?.().catch(() => {});
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
