'use strict';
/* gym: daily weigh-in + workout tracker with planned progression.
   Data lives on the device (localStorage), with optional automatic backup to a private GitHub repo. */

const VERSION = '2.7';
const KEY = 'gym.v2';
const OLD_KEY = 'lift.v1';
const SYNC_KEY = 'gym.sync';
const VER_KEY = 'gym.ver';
const TIP_KEY = 'gym.tip';
const BACKUP_PATH = 'gym-backup.json';
const DEFAULT_REPO = 'davideditsvfx/gym-data';
const MUSCLES = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Other'];
const INCREMENTS = [0.5, 1, 1.25, 2, 2.5, 5];
const RULER_TICK = 12; // px per 0.1 kg on the weigh-in ruler

// id, name, muscle, rep range for each set, weight step when progressing
const SEED_EXERCISES = [
  ['bench-press-barbell', 'Bench Press', 'Chest', ['4-6', '6-8', '6-8'], 2.5],
  ['incline-press', 'Incline Press', 'Chest', ['6-8', '8-10', '8-10'], 2.5],
  ['cable-fly', 'Cable Fly', 'Chest', ['10-15', '10-15'], 2.5],
  ['pull-up', 'Pull Up', 'Back', ['6-10', '6-10'], 2.5],
  ['machine-row', 'Machine Row', 'Back', ['8-10', '8-10'], 2.5],
  ['single-arm-cable-row', 'Single-Arm Cable Row', 'Back', ['8-12', '8-12'], 2.5],
  ['machine-shoulder-press', 'Machine Shoulder Press', 'Shoulders', ['8-10', '8-10'], 2.5],
  ['seated-y-raise', 'Seated Y Raise', 'Shoulders', ['12-15', '12-15', '12-15'], 1],
  ['lateral-raise-dumbbell', 'Standing Lateral Raise', 'Shoulders', ['12-15', '12-15', '12-15'], 1],
  ['rear-delt-fly', 'Rear Delt Fly', 'Shoulders', ['12-15', '12-15'], 2.5],
  ['alternating-db-curl', 'Standing Alternating DB Curl', 'Arms', ['8-12', '8-12'], 2],
  ['incline-db-curl', 'Incline DB Curl', 'Arms', ['8-12', '8-12'], 2],
  ['reverse-ez-curl', 'Reverse-Grip EZ Curl', 'Arms', ['10-12', '10-12'], 2.5],
  ['lying-triceps-extension', 'Lying Overhead Triceps Extension', 'Arms', ['8-12', '8-12'], 2.5],
  ['rope-triceps-extension', 'Cable Rope Triceps Extension', 'Arms', ['10-15', '10-15'], 2.5],
  ['smith-calf-raise', 'Smith Calf Raise', 'Legs', ['8-10', '8-10', '14-15'], 2.5],
  ['leg-curl', 'Leg Curl', 'Legs', ['8-10', '8-10', '14-15'], 2.5],
  ['smith-bulgarian-split-squat', 'Smith Bulgarian Split Squat', 'Legs', ['8-10', '8-10', '8-10'], 2.5],
  ['leg-extension', 'Leg Extension', 'Legs', ['10-12', '10-12', '12-15'], 2.5],
  ['captains-chair-leg-raise', 'Captain’s Chair Leg Raise', 'Core', ['10-15', '10-15', '10-15'], 2.5],
  ['hanging-leg-raise', 'Hanging Leg Raise', 'Core', ['10-15', '10-15', '10-15'], 2.5],
];

// plan name, slots: [slot name, how many to suggest, exercise options]
const SEED_PLANS = [
  ['upper / arms', [
    ['main press', 1, ['bench-press-barbell', 'incline-press']],
    ['pull', 2, ['pull-up', 'machine-row', 'single-arm-cable-row']],
    ['extra push', 1, ['machine-shoulder-press', 'cable-fly']],
    ['side delts', 1, ['seated-y-raise', 'lateral-raise-dumbbell']],
    ['rear delts', 0, ['rear-delt-fly']],
    ['biceps', 2, ['alternating-db-curl', 'incline-db-curl', 'reverse-ez-curl']],
    ['triceps', 1, ['lying-triceps-extension', 'rope-triceps-extension']],
  ]],
  ['lower', [
    ['', 1, ['smith-calf-raise']],
    ['', 1, ['leg-curl']],
    ['', 1, ['smith-bulgarian-split-squat']],
    ['', 1, ['leg-extension']],
    ['abs', 1, ['captains-chair-leg-raise', 'hanging-leg-raise']],
  ]],
];

// ---------- Icons (SF Symbols-ish) ----------
const sv = (d, sw = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  dumbbell: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5.5" width="3.4" height="13" rx="1.7"/><rect x="15.6" y="5.5" width="3.4" height="13" rx="1.7"/><rect x="1.6" y="8.5" width="2.8" height="7" rx="1.4"/><rect x="19.6" y="8.5" width="2.8" height="7" rx="1.4"/><rect x="8" y="10.8" width="8" height="2.4" rx="1.1"/></svg>',
  progress: sv('<path d="M3.5 17.5l5.5-5.5 4 4 7.5-8"/><path d="M15 8h5.5v5.5"/>'),
  scale: sv('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M8.2 10.4a5.2 5.2 0 0 1 7.6 0"/><path d="M12 11.2l1.7-2.5"/>'),
  gear: sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>', 1.8),
  slider: sv('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  plus: sv('<path d="M12 5v14M5 12h14"/>', 2.4),
  minus: sv('<path d="M5 12h14"/>', 2.4),
  check: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 3),
  x: sv('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', 2.2),
  chevL: sv('<path d="M15 5l-7 7 7 7"/>', 2.6),
  chevR: sv('<path d="M9 5l7 7-7 7"/>', 2.6),
  chevD: sv('<path d="M5 9l7 7 7-7"/>', 2.6),
  chevU: sv('<path d="M5 15l7-7 7 7"/>', 2.6),
  arrowR: sv('<path d="M5 12h14M13 6l6 6-6 6"/>', 2.2),
  dots: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  trophy: sv('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>', 2.2),
  search: sv('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', 2.2),
};

// ---------- Helpers ----------
const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad2 = n => String(n).padStart(2, '0');
const num = v => parseFloat(String(v ?? '').replace(',', '.'));
const r1 = n => Math.round(n * 10) / 10;
const round2 = n => Math.round(n * 100) / 100;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const dayKey = (d = new Date()) => { d = new Date(d); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const keyDate = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = keyDate(k); d.setDate(d.getDate() + n); return dayKey(d); };
const daysBetween = (a, b) => Math.round((keyDate(b) - keyDate(a)) / 864e5);
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };

const f1 = v => r1(v).toFixed(1);
const fLoad = kg => String(round2(kg));
const signed = d => (d > 0 ? '+' : d < 0 ? '−' : '') + f1(Math.abs(d));
const setText = s => (s.w > 0 ? `${fLoad(s.w)}×${s.r}` : `${s.r} reps`);
const e1rm = s => (s.w > 0 ? s.w * (1 + s.r / 30) : s.r); // Epley; bodyweight sets fall back to reps

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
const agoDays = ts => { const n = daysBetween(dayKey(ts), dayKey()); return n <= 0 ? 'today' : `${n}d ago`; };
const ago = ts => {
  const m = Math.round((Date.now() - ts) / 6e4);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : shortDay(ts);
};
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
const seedExercises = () => SEED_EXERCISES.map(([id, name, muscle, scheme, inc]) => ({ id, name, muscle, scheme: [...scheme], inc }));
const seedPlans = () => SEED_PLANS.map(([name, slots]) => ({
  id: uid(), name, blocks: slots.map(([bn, pick, options]) => ({ id: uid(), name: bn, pick, options: [...options] })),
}));
const seed = () => ({ v: 2, settings: { weighIn: true }, weights: [], skipDay: null, exercises: seedExercises(), plans: seedPlans(), workouts: [], active: null });
const normalize = d => {
  const base = seed(), out = { ...base, ...d, v: 2, settings: { ...base.settings, ...(d.settings || {}) } };
  // The upper day is sometimes just arms.
  out.plans = out.plans.map(p => (p.name === 'upper' ? { ...p, name: 'upper / arms' } : p));
  return out;
};

// Version 1 ("Lift") shipped generic example exercises and plans; keep only what was actually logged or made.
function fromV1(d) {
  const s = seed();
  const examples = ['Push', 'Pull', 'Legs'];
  const ownPlans = (d.plans || []).filter(p => !examples.includes(p.name));
  const used = new Set([...(d.workouts || []).flatMap(w => w.exercises.map(e => e.exId)), ...ownPlans.flatMap(p => p.items.map(i => i.exId)),
    ...(d.active?.exercises || []).map(e => e.exId)]);
  for (const e of d.exercises || []) {
    if (used.has(e.id) && !s.exercises.some(x => x.id === e.id)) s.exercises.push({ id: e.id, name: e.name, muscle: e.muscle, scheme: ['8-12', '8-12', '8-12'], inc: 2.5 });
  }
  for (const p of ownPlans) s.plans.push({ id: p.id, name: p.name, blocks: p.items.map(it => ({ id: uid(), name: '', pick: 1, options: [it.exId] })) });
  s.weights = d.weights || [];
  s.skipDay = d.skipDay || null;
  s.settings.weighIn = d.settings?.weighIn !== false;
  s.workouts = d.workouts || [];
  if (d.active) s.active = { ...d.active, exercises: d.active.exercises.map(e => ({ exId: e.exId, block: null, sets: e.sets.map(x => ({ w: x.w, r: x.r, done: x.done, tw: null, tr: x.r })) })) };
  return s;
}
const fromAny = d => (d.v === 2 ? normalize(d) : fromV1(d));

function load() {
  try {
    const raw = lsGet(KEY);
    if (raw) return normalize(JSON.parse(raw));
    const old = lsGet(OLD_KEY);
    if (old) return fromV1(JSON.parse(old));
  } catch (e) { console.warn(e); }
  return seed();
}
let S = load();
let saveT;
function save() {
  clearTimeout(saveT);
  if (!lsSet(KEY, JSON.stringify(S))) toast('Couldn’t save');
  syncSoon();
}
const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 250); };

const exById = id => S.exercises.find(e => e.id === id);
const exName = (id, fallback) => exById(id)?.name || fallback || 'Deleted exercise';
const planById = id => S.plans.find(p => p.id === id);
function sessionsOf(exId) {
  const out = [];
  for (const w of S.workouts) {
    const e = w.exercises.find(x => x.exId === exId);
    if (e?.sets.length) out.push({ t: w.start, wid: w.id, sets: e.sets });
  }
  return out;
}
function lastSets(exId) {
  for (let i = S.workouts.length - 1; i >= 0; i--) {
    const e = S.workouts[i].exercises.find(x => x.exId === exId);
    if (e?.sets.length) return e.sets;
  }
  return null;
}
function lastDoneAt(exId) {
  for (let i = S.workouts.length - 1; i >= 0; i--) if (S.workouts[i].exercises.some(x => x.exId === exId)) return S.workouts[i].start;
  return 0;
}
function lastPlanDone(id) {
  for (let i = S.workouts.length - 1; i >= 0; i--) if (S.workouts[i].planId === id) return S.workouts[i].end;
  return 0;
}
function bestWeight(exId) {
  let b = null;
  for (const w of S.workouts) for (const e of w.exercises) if (e.exId === exId) for (const s of e.sets) if (s.w > 0 && (b === null || s.w > b)) b = s.w;
  return b;
}
const workoutSets = w => w.exercises.reduce((a, e) => a + e.sets.length, 0);

// ---------- Progression ----------
const repRange = rg => {
  const m = String(rg || '').match(/(\d+)\s*[-–]\s*(\d+)/);
  if (m) return [Math.min(+m[1], +m[2]), Math.max(+m[1], +m[2])];
  const n = parseInt(rg, 10);
  return n > 0 ? [n, n] : [8, 12];
};
const schemeOf = ex => (ex?.scheme?.length ? ex.scheme : ['8-12', '8-12']);

// Next session's targets, built from what was actually done last time. One small step per session:
// +1 rep on the set furthest from the top of its range. Once every set is at the top, add the weight
// step and go back to the bottom of the range. A set that overshoots its range gets the weight right away.
function nextTargets(ex, sets) {
  const inc = ex?.inc || 2.5;
  const t = schemeOf(ex).map((rg, i) => {
    const s = sets[Math.min(i, sets.length - 1)];
    const [lo, hi] = repRange(rg);
    return { w: s.w, r: s.r, lo, hi };
  });
  const over = t.filter(x => x.r > x.hi);
  if (over.length) over.forEach(x => { x.w += inc; x.r = x.lo; });
  else if (t.every(x => x.r >= x.hi)) t.forEach(x => { x.w += inc; x.r = x.lo; });
  else {
    let pick = null, low = Infinity;
    for (const x of t) {
      if (x.r >= x.hi) continue;
      const p = (x.r - x.lo) / Math.max(1, x.hi - x.lo);
      if (p < low - 1e-9) { low = p; pick = x; }
    }
    pick.r += 1;
  }
  return t.map(x => ({ w: round2(x.w), r: x.r }));
}

// Where the plan goes over the next ~12 weeks, spaced at how often the exercise is usually done.
function projection(ex, sessions) {
  if (!sessions.length) return [];
  const recent = sessions.slice(-6);
  const gaps = recent.slice(1).map((s, i) => (s.t - recent[i].t) / 864e5).sort((a, b) => a - b);
  const gap = clamp(gaps.length ? gaps[Math.floor(gaps.length / 2)] : 7, 3, 14);
  const last = sessions[sessions.length - 1];
  const out = [];
  let sets = last.sets;
  for (let k = 1; k <= Math.min(16, Math.ceil(84 / gap)); k++) {
    sets = nextTargets(ex, sets);
    out.push({ t: last.t + k * gap * 864e5, sets });
  }
  return out;
}

// ---------- UI state ----------
const ui = {
  tab: 'workout',
  stack: { workout: [], progress: [], weight: [] },
  sheet: null,
  wkQ: '',
  range: '1M',
  metric: 'top',
  weightAll: false,
  libQ: '',
  pickQ: '', pickSel: [], pickCb: null,
};
const scrollMem = {};
let peekT;
let renderedDay = dayKey();
const standalone = navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

const $screens = $('#screens'), $tabbar = $('#tabbar');
const $sheet = $('#sheet'), $actions = $('#actions'), $toast = $('#toast');

// ---------- Navigation ----------
const TABS = [['workout', 'workout', 'dumbbell'], ['progress', 'progress', 'progress'], ['weight', 'weight', 'scale']];
// While a workout is running it is the workout tab's first screen.
const topScreen = () => { const st = ui.stack[ui.tab]; return st[st.length - 1] || { name: ui.tab === 'workout' && S.active ? 'active' : ui.tab }; };

function nav({ title = '', back = false, left = '', right = '', solid = false }) {
  return `<div class="nav${solid ? ' solid' : ''}"><div class="nav-side">${back ? `<button class="icon-btn" data-a="back" aria-label="Back">${I.chevL}</button>` : left}</div><div class="nav-title">${esc(title)}</div><div class="nav-side right">${right}</div></div>`;
}
const gone = what => nav({ back: true }) + `<div class="empty">This ${what} was deleted.</div>`;

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
    // Tidy up after editing: drop empty slots, drop a plan that was created and left empty.
    const p = planById(leaving.id);
    if (p) {
      p.blocks = p.blocks.filter(b => b.options.length);
      if (!p.name.trim() && !p.blocks.length) S.plans = S.plans.filter(x => x !== p);
      else if (!p.name.trim()) p.name = 'untitled';
      save();
    }
  }
  renderScreen('pop');
}

function renderTabbar() {
  $tabbar.innerHTML = TABS.map(([k, label, icon]) => `<button class="tab${ui.tab === k ? ' active' : ''}" data-a="tab" data-t="${k}">${I[icon]}<span>${label}</span>${k === 'workout' && S.active ? '<i class="live"></i>' : ''}</button>`).join('');
}

// ---------- Screen: Workout ----------
function tipHTML() {
  if (standalone || lsGet(TIP_KEY)) return '';
  return `<div class="tip"><div class="grow"><b>Make it full screen</b><span>Tap Share, then “Add to Home Screen”, and open gym from that icon. Safari’s bars disappear there.</span></div><button class="dots" data-a="tip-close" aria-label="Dismiss">${I.x}</button></div>`;
}

function scWorkout() {
  return nav({ title: 'workout', right: `<button class="icon-btn peek" data-a="peek" aria-label="Settings">${I.gear}</button>` }) +
    `<div class="kicker">${shortDay(Date.now())}</div>` +
    `<div class="plans">${S.plans.map(p => `<button class="plan-row" data-a="plan-go" data-id="${p.id}"><span>${esc(p.name || 'untitled')}</span>${I.arrowR}</button>`).join('') ||
      `<div class="empty"><b>No plans yet</b>Add one in settings.</div>`}</div>` + tipHTML();
}

function scPlan({ id }) {
  const p = planById(id);
  if (!p) return gone('plan');
  return nav({ title: p.name || 'new plan', back: true, solid: true, right: `<button class="icon-btn" data-a="plan-menu" data-id="${id}" aria-label="Plan options">${I.dots}</button>` }) +
    `<input class="name-input" id="plan-name" data-id="${id}" value="${esc(p.name)}" placeholder="plan name" enterkeyhint="done" autocomplete="off" autocapitalize="none">` +
    `<div class="section-foot" style="padding:0 20px 18px;margin-top:-6px">A slot with one exercise is added when you start. Everything else shows up as a quick pick during the workout, in this order.</div>` +
    p.blocks.map(b => blockCard(p, b)).join('') +
    `<div class="section"><button class="btn btn-tinted" data-a="block-new" data-id="${id}">${I.plus}add slot</button></div>`;
}

function blockCard(p, b) {
  const many = b.options.length > 1;
  return `<div class="section"><div class="block-card">
    <div class="block-top"><input class="block-name" data-block-name="${b.id}" data-id="${p.id}" value="${esc(b.name)}" placeholder="${many ? 'slot name' : 'slot name (optional)'}" autocomplete="off" autocapitalize="none" enterkeyhint="done"><button class="dots" data-a="block-menu" data-id="${p.id}" data-b="${b.id}" aria-label="Slot options">${I.dots}</button></div>
    ${b.options.length ? `<div class="list">${b.options.map((exId, i) => `<div class="row"><div class="grow"><div class="title">${esc(exName(exId))}</div><div class="sub">${esc(schemeOf(exById(exId)).join(' · '))} reps</div></div><button class="dots" data-a="opt-menu" data-id="${p.id}" data-b="${b.id}" data-i="${i}" aria-label="Exercise options">${I.dots}</button></div>`).join('')}</div>` : ''}
    <button class="add-set" data-a="block-add" data-id="${p.id}" data-b="${b.id}">${I.plus}${b.options.length ? 'add option' : 'add exercise'}</button>
  </div></div>`;
}

// ---------- Screen: Settings & library ----------
function cloudStatus() {
  if (!sync.token) return 'Not set up';
  if (sync.pending) return 'Choose restore or replace';
  if (sync.error) return `Last try failed: ${sync.error}`;
  return sync.last ? `Backed up ${ago(sync.last)}` : 'Waiting for first backup';
}

function scSettings() {
  return nav({ title: 'settings', back: true }) + `<h1 class="large-title">settings</h1>` +
    `<div class="section-label">plans</div><div class="section"><div class="list">${S.plans.map(p => `<button class="row" data-a="plan-edit" data-id="${p.id}"><div class="grow title">${esc(p.name || 'untitled')}</div><span class="chev">${I.chevR}</span></button>`).join('')}</div></div>` +
    `<div class="section-label">weigh-in</div><div class="section"><div class="list"><label class="row"><div class="grow title">Ask on first open each day</div><input type="checkbox" switch class="switch" data-c="weighin"${S.settings.weighIn ? ' checked' : ''}></label></div></div>` +
    `<div class="section-label">cloud backup</div><div class="section"><div class="list"><button class="row" data-a="cloud"><div class="grow"><div class="title">${sync.token ? 'On' : 'Off'}</div><div class="sub">${esc(cloudStatus())}</div></div><span class="chev">${I.chevR}</span></button></div><div class="section-foot">Saves everything to a private GitHub repo by itself while you train and after each weigh-in.</div></div>` +
    `<div class="section-label">library</div><div class="section"><div class="list"><button class="row" data-a="library"><div class="grow title">Exercises</div><span class="value">${S.exercises.length}</span><span class="chev">${I.chevR}</span></button></div></div>` +
    `<div class="section-label">backup file</div><div class="section"><div class="list"><button class="row accent" data-a="export">Export to Files</button><button class="row accent" data-a="import">Import From File</button></div></div>` +
    `<div class="section"><div class="list"><button class="row red" data-a="reset">Erase All Data</button></div><div class="section-foot" style="text-align:center;margin-top:18px">gym ${VERSION}</div></div>`;
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
  return nav({ title: 'exercises', back: true, right: `<button class="icon-btn" data-a="lib-add" aria-label="New exercise">${I.plus}</button>` }) +
    `<h1 class="large-title">exercises</h1><div class="search">${I.search}<input id="lib-q" placeholder="Search" autocomplete="off" value="${esc(ui.libQ)}"></div><div id="lib-list" style="margin-top:18px">${libList()}</div>`;
}
function libList() {
  const groups = exGroups(ui.libQ);
  if (!groups.length) return `<div class="empty">No exercises match.</div>`;
  return groups.map(([m, items]) => `<div class="section-label">${m}</div><div class="section"><div class="list">${items.map(e =>
    `<button class="row" data-a="ex-edit" data-id="${e.id}"><div class="grow"><div class="title">${esc(e.name)}</div><div class="sub">${esc(schemeOf(e).join(' · '))} reps</div></div><span class="chev">${I.chevR}</span></button>`).join('')}</div></div>`).join('');
}

function scExEdit({ id }) {
  const e = exById(id);
  if (!e) return gone('exercise');
  return nav({ title: e.name, back: true, solid: true }) +
    `<input class="name-input" id="ex-name" data-id="${id}" value="${esc(e.name)}" placeholder="exercise name" autocomplete="off" enterkeyhint="done" style="font-size:28px">` +
    `<div class="section-label">sets and rep ranges</div><div class="section"><div class="list">${schemeOf(e).map((rg, i) =>
      `<div class="scheme-row"><span class="n">Set ${i + 1}</span><input class="range-input" data-scheme="${i}" data-id="${id}" value="${esc(rg)}" placeholder="8-12" autocomplete="off" enterkeyhint="done"><button class="dots" data-a="scheme-del" data-id="${id}" data-i="${i}" aria-label="Remove set">${I.minus}</button></div>`).join('')}</div>
      <button class="add-set" style="width:100%;margin:10px 0 0" data-a="scheme-add" data-id="${id}">${I.plus}add set</button></div>` +
    `<div class="section-label">progression</div><div class="section"><div class="list"><div class="row"><div class="grow title">Weight step</div><div class="stepper"><button data-a="inc-step" data-id="${id}" data-d="-1" aria-label="Smaller">${I.minus}</button><span>${fLoad(e.inc || 2.5)} kg</span><button data-a="inc-step" data-id="${id}" data-d="1" aria-label="Bigger">${I.plus}</button></div></div></div>
      <div class="section-foot">Each session asks for one more rep on one set. When every set reaches the top of its range, the weight goes up by this step and the reps start again at the bottom.</div></div>` +
    `<div class="section-label">muscle group</div><div class="section"><div class="list"><button class="row" data-a="ex-muscle" data-id="${id}"><div class="grow title">${esc(e.muscle || 'Other')}</div><span class="chev">${I.chevR}</span></button></div></div>` +
    `<div class="section"><div class="list"><button class="row red" data-a="ex-delete" data-id="${id}">Delete Exercise</button></div></div>`;
}

// ---------- Screen: Progress ----------
function spark(values) {
  if (values.length < 2) return '<span class="spark"></span>';
  const lo = Math.min(...values), hi = Math.max(...values), W = 64, H = 26;
  const pts = values.map((v, i) => `${(i / (values.length - 1) * (W - 4) + 2).toFixed(1)},${(H - 3 - (hi - lo ? (v - lo) / (hi - lo) : .5) * (H - 6)).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline points="${pts}" fill="none" style="stroke:var(--label)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// Overall strength: every lift's set-1 estimated max against its own first session, averaged over the lifts done so far.
function strengthSeries() {
  const first = {}, cur = {}, out = [];
  for (const w of [...S.workouts].sort((a, b) => a.start - b.start)) {
    for (const e of w.exercises) {
      const v = e.sets[0] ? e1rm(e.sets[0]) : 0;
      if (!(v > 0)) continue;
      first[e.exId] ??= v;
      cur[e.exId] = v / first[e.exId];
    }
    const rs = Object.values(cur);
    if (rs.length) out.push({ t: w.start, v: (rs.reduce((a, b) => a + b, 0) / rs.length - 1) * 100 });
  }
  return out;
}

function scProgress() {
  const rows = S.exercises.map(e => ({ e, ss: sessionsOf(e.id) })).filter(x => x.ss.length)
    .sort((a, b) => b.ss[b.ss.length - 1].t - a.ss[a.ss.length - 1].t);
  const st = strengthSeries(), now = st[st.length - 1];
  const head = nav({ title: 'progress' }) + `<div class="kicker">${plural(rows.length, 'lift')} tracked</div><h1 class="large-title">progress</h1>`;
  if (!rows.length) return head + `<div class="section"><div class="card empty"><b>Nothing logged yet</b>Finish a workout and every lift shows up here, with its trend and your targets for next time.</div></div>`;
  return head +
    `<div class="section"><div class="card hero"><div class="cap">stronger since ${fmtDate(st[0].t, { day: 'numeric', month: 'short' })}</div>
      <div class="big">${now.v >= 0 ? '+' : '−'}${Math.abs(now.v).toFixed(1)}<small>%</small></div>
      <div class="chart">${chart(st, { fmt: v => `${Math.round(v)}%` })}</div></div></div>` +
    `<div class="section"><div class="list">${rows.map(({ e, ss }) => {
    const last = ss[ss.length - 1], cutoff = last.t - 56 * 864e5;
    const base = ss.find(s => s.t >= cutoff) || ss[0];
    const pct = base !== last ? (e1rm(last.sets[0]) / e1rm(base.sets[0]) - 1) * 100 : null;
    return `<button class="row" data-a="ex-open" data-id="${e.id}"><div class="grow"><div class="title">${esc(e.name)}</div><div class="sub">${setText(last.sets[0])} · ${agoDays(last.t)}</div></div>${spark(ss.slice(-10).map(s => e1rm(s.sets[0])))}<span class="trend${pct > 0.05 ? ' up' : ''}">${pct === null ? '' : `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`}</span></button>`;
  }).join('')}</div><div class="section-foot">Trend is the change in set 1’s estimated one-rep max over the last 8 weeks.</div></div>`;
}

function scExercise({ id }) {
  const e = exById(id);
  if (!e) return gone('exercise');
  const ss = sessionsOf(id);
  const head = nav({ title: e.name, back: true, right: `<button class="icon-btn" data-a="ex-edit" data-id="${id}" aria-label="Edit exercise">${I.slider}</button>` }) +
    `<div class="kicker">${esc(e.muscle || 'exercise')}</div><h1 class="large-title sm">${esc(e.name)}</h1>`;
  if (!ss.length) return head + `<div class="section"><div class="card empty"><b>No sessions yet</b>Do it once and your targets for next time show up here.</div></div>`;
  const last = ss[ss.length - 1], sc = schemeOf(e), tg = nextTargets(e, last.sets), proj = projection(e, ss);
  const bw = !(last.sets[0].w > 0), top = ui.metric === 'top';
  const metric = s => (top ? (bw ? s.r : s.w) : e1rm(s));
  const jump = proj.findIndex(p => p.sets[0].w > last.sets[0].w);
  const end = proj[proj.length - 1], gain = e1rm(end.sets[0]) / e1rm(last.sets[0]) - 1;
  const milestone = (jump >= 0 ? `Next weight jump on set 1: <b>${fLoad(proj[jump].sets[0].w)} kg</b> in ${plural(jump + 1, 'session')}, around ${shortDay(proj[jump].t)}. ` : '') +
    (bw ? '' : `On plan, set 1’s estimated max is <b>${gain > 0 ? `+${(gain * 100).toFixed(1)}%` : 'level'}</b> by ${shortDay(end.t)}.`);
  return head +
    `<div class="section"><div class="card"><div class="cap">next session</div><div class="targets">${tg.map((t, i) => `<div><span class="n">${i + 1}</span><b>${setText(t)}</b><span class="rg">${esc(sc[i])} reps</span></div>`).join('')}</div><div class="milestone">${milestone}</div></div></div>` +
    `<div class="section"><div class="card"><div class="seg">${[['top', bw ? 'set 1 reps' : 'set 1 weight'], ['e1rm', 'est. 1-rep max']].map(([k, l]) => `<button class="${ui.metric === k ? 'on' : ''}" data-a="metric" data-m="${k}">${l}</button>`).join('')}</div>
      <div class="chart">${chart(ss.map(s => ({ t: s.t, v: metric(s.sets[0]) })), { proj: proj.map(p => ({ t: p.t, v: metric(p.sets[0]) })), step: top, smooth: false, fmt: v => (top && !bw ? fLoad(round2(v)) : String(Math.round(v))) })}</div>
      <div class="legend"><span><i></i>done</span><span><i class="dash"></i>plan</span></div></div></div>` +
    `<div class="section-label">sessions</div><div class="section"><div class="list">${[...ss].reverse().map(s =>
      `<button class="row" data-a="hist-open" data-id="${s.wid}"><div class="grow"><div class="title">${shortDay(s.t)}</div><div class="sub">${s.sets.map(setText).join(' · ')}</div></div><span class="chev">${I.chevR}</span></button>`).join('')}</div></div>`;
}

function scDetail({ id }) {
  const w = S.workouts.find(x => x.id === id);
  if (!w) return gone('workout');
  const prs = new Set(w.prs || []);
  return nav({ title: w.name, back: true }) +
    `<div class="kicker">${longDay(w.start)} · ${hhmm(w.start)}</div><h1 class="large-title">${esc(w.name)}</h1>` +
    `<div class="section"><div class="card stats">${stat('Time', dur(w.end - w.start))}${stat('Sets', workoutSets(w))}${stat('Exercises', w.exercises.length)}</div></div>` +
    w.exercises.map(e => `<div class="section"><div class="sub-head">${esc(exName(e.exId, e.name))}${prs.has(e.exId) ? `<span class="pr">${I.trophy}PR</span>` : ''}</div><div class="list">${e.sets.map((s, i) => `<div class="det-set"><span class="n">${i + 1}</span><span class="num">${s.w ? `${fLoad(s.w)} kg × ${s.r}` : `${s.r} reps`}</span></div>`).join('')}</div></div>`).join('') +
    `<div class="section"><button class="btn btn-plain red" data-a="hist-delete" data-id="${id}">Delete Workout</button></div>`;
}

// ---------- Screen: Weight ----------
function scWeight() {
  const ws = S.weights, last = ws[ws.length - 1], today = dayKey();
  const change = days => {
    if (!last) return null;
    const cutoff = addDays(last.date, -days);
    let base = null;
    for (const w of ws) { if (w.date <= cutoff) base = w; else break; }
    return base ? last.kg - base.kg : null;
  };
  const chip = (label, v) => (v === null ? '' : `<span class="chip">${label}<b>${signed(v)}</b></span>`);
  const total = ws.length > 1 ? last.kg - ws[0].kg : null;
  const days = { '1M': 30, '3M': 91, '1Y': 365 }[ui.range];
  const cutoff = days ? addDays(today, -days) : '';
  const points = ws.filter(w => w.date >= cutoff).map(w => ({ t: keyDate(w.date).getTime(), v: w.kg }));
  const rows = [...ws].reverse(), shown = ui.weightAll ? rows : rows.slice(0, 30);
  return nav({ title: 'weight', right: `<button class="icon-btn" data-a="weigh-open" data-date="${today}" aria-label="Log weight">${I.plus}</button>` }) +
    `<div class="kicker">${plural(ws.length, 'weigh-in')}</div><h1 class="large-title">weight</h1>` +
    `<div class="section"><div class="card hero"><div class="cap">${last ? relDay(last.date) : 'No weigh-ins yet'}</div>
      <div class="big">${last ? f1(last.kg) : '—'}<small>kg</small></div>
      <div class="chips">${chip('7 days', change(7))}${chip('30 days', change(30))}${chip('Total', total)}</div>
      ${last?.date === today ? '' : `<button class="btn btn-primary" style="margin-top:16px" data-a="weigh-open" data-date="${today}">Log Today’s Weight</button>`}
    </div></div>` +
    `<div class="section"><div class="card"><div class="seg">${['1M', '3M', '1Y', 'All'].map(r => `<button class="${ui.range === r ? 'on' : ''}" data-a="range" data-r="${r}">${r}</button>`).join('')}</div><div class="chart">${chart(points)}</div></div></div>` +
    (rows.length ? `<div class="section-label">entries</div><div class="section"><div class="list">${shown.map((w, i) => {
      const older = rows[i + 1];
      return `<button class="row" data-a="weigh-open" data-date="${w.date}"><div class="grow title">${relDay(w.date)}</div><span class="delta">${older ? signed(w.kg - older.kg) : ''}</span><span class="wnum">${f1(w.kg)}</span></button>`;
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

function chart(points, { proj = [], step = false, smooth = true, fmt = f1 } = {}) {
  const all = points.concat(proj);
  if (!points.length || all.length < 2) return `<div class="chart-empty">${points.length ? 'Log another day to see your trend.' : 'No weigh-ins in this range yet.'}</div>`;
  const W = 340, H = 170, L = 4, R = 46, T = 12, B = 26, f = n => n.toFixed(1);
  const vs = all.map(p => p.v);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (hi - lo < 1) { const m = (hi + lo) / 2; lo = m - 0.5; hi = m + 0.5; }
  const padV = (hi - lo) * 0.15; lo -= padV; hi += padV;
  const t0 = all[0].t, t1 = all[all.length - 1].t;
  const X = t => L + (t - t0) / ((t1 - t0) || 1) * (W - L - R);
  const Y = v => T + (hi - v) / (hi - lo) * (H - T - B);
  const pts = points.map(p => [X(p.t), Y(p.v)]), lp = pts[pts.length - 1];
  const line = smooth ? smoothPath(pts) : pts.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])},${f(p[1])}`).join('');
  let plan = '';
  if (proj.length) {
    plan = `M${f(lp[0])},${f(lp[1])}`;
    for (const p of proj) plan += step ? `H${f(X(p.t))}V${f(Y(p.v))}` : `L${f(X(p.t))},${f(Y(p.v))}`;
  }
  // Gridlines on round numbers (…, 100, 102.5, 105) rather than wherever the data happens to land.
  const stepV = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100].find(s => s >= (hi - lo) / 3) || 100;
  let grid = '';
  for (let v = Math.ceil(lo / stepV) * stepV; v <= hi + 1e-9; v += stepV) {
    const y = f(Y(v));
    grid += `<line x1="${L}" x2="${W - R + 6}" y1="${y}" y2="${y}" style="stroke:var(--sep)" stroke-dasharray="2 4"/><text x="${W - R + 10}" y="${+y + 4}">${fmt(round2(v))}</text>`;
  }
  const dots = points.length <= 45 ? pts.map(p => `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="2.4" style="fill:var(--pop);opacity:.7"/>`).join('') : '';
  const area = pts.length > 1 ? `<path d="${line}L${f(lp[0])},${H - B}L${f(pts[0][0])},${H - B}Z" style="fill:url(#cg)"/>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Trend chart">
    <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--pop);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--pop);stop-opacity:0"/></linearGradient><filter id="gl" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="4"/></filter></defs>
    ${grid}${area}
    ${plan ? `<path d="${plan}" fill="none" style="stroke:var(--label2)" stroke-width="2" stroke-dasharray="4 5" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    <path d="${line}" fill="none" style="stroke:var(--pop)" stroke-width="5" opacity=".6" filter="url(#gl)"/>
    <path d="${line}" fill="none" style="stroke:var(--pop)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
    <circle cx="${f(lp[0])}" cy="${f(lp[1])}" r="5.5" style="fill:var(--pop);stroke:var(--card)" stroke-width="3"/>
    <text x="${L}" y="${H - 6}">${fmtDate(t0, { day: 'numeric', month: 'short' })}</text>
    <text x="${W - R}" y="${H - 6}" text-anchor="end">${fmtDate(t1, { day: 'numeric', month: 'short' })}</text>
  </svg>`;
}

const SCREENS = {
  workout: scWorkout, active: scActive, progress: scProgress, weight: scWeight, plan: scPlan, settings: scSettings,
  library: scLibrary, exedit: scExEdit, exercise: scExercise, detail: scDetail,
};

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
  s.val = r1(ex ? ex.kg : s.prev ? s.prev.kg : 75);
  s.lo = Math.max(1, Math.floor(s.val) - 30);
  s.hi = Math.floor(s.val) + 30;
  const h = new Date().getHours();
  const title = s.morning ? (h < 12 ? 'good morning' : h < 18 ? 'good afternoon' : 'good evening') : ex ? 'edit weight' : 'log weight';
  const sub = s.morning ? 'Log your weight for today' : longDay(keyDate(s.date));
  const alt = s.morning ? `<button class="btn btn-plain" data-a="weigh-skip">Skip today</button>`
    : ex ? `<button class="btn btn-plain red" data-a="weigh-del">Delete entry</button>`
    : `<button class="btn btn-plain" data-a="sheet-close">Cancel</button>`;
  return `<div class="grab-area"><div class="grab"></div></div><div class="weigh"><h1>${title}</h1><div class="date">${sub}</div>
    <div class="weigh-num"><input id="wv" inputmode="decimal" autocomplete="off" maxlength="5" value="${f1(s.val)}" aria-label="Weight"><span class="u">kg</span></div>
    <div class="vs" id="wvs">${vsText(s)}</div>
    <div class="ruler-wrap"><div class="ruler" id="ruler">${rulerTicks(s.lo, s.hi)}</div></div>
    <div class="stack"><button class="btn btn-primary" data-a="weigh-save">save</button>${alt}</div></div>`;
}
function rulerTicks(lo, hi) {
  let h = '<div class="pad"></div>';
  for (let i = lo * 10; i <= hi * 10; i++) h += `<i class="t${i % 10 === 0 ? ' w' : i % 5 === 0 ? ' h' : ''}">${i % 10 === 0 ? `<b>${i / 10}</b>` : ''}</i>`;
  return h + '<div class="pad"></div>';
}
function vsText(s) {
  if (!s.prev) return '';
  const d = r1(s.val - s.prev.kg);
  const rel = relDay(s.prev.date), when = rel === 'Yesterday' ? 'yesterday' : rel.includes('ago') ? rel : `on ${rel}`;
  return d === 0 ? `Same as ${when}` : `${d > 0 ? '▲' : '▼'} ${f1(Math.abs(d))} kg from ${when}`;
}
// Size the input to its text; --ls is the input's (negative) letter-spacing, applied once per character.
const sizeWv = el => { const v = el.value || '0'; el.style.width = `calc(${v.length - (/[.,]/.test(v) ? 0.62 : 0) + 0.15}ch + ${v.length} * var(--ls))`; };
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
    <div class="sheet-head"><div class="side"><button class="link dim" data-a="sheet-close">cancel</button></div><h2>add exercises</h2><div class="side right"><button class="link" data-a="pick-done" id="pick-done">add</button></div></div>
    <div class="search">${I.search}<input id="pick-q" placeholder="Search or create" autocomplete="off" enterkeyhint="search"></div>
    <div class="sheet-body" id="pick-list">${pickList()}</div>`;
}
function pickList() {
  const q = ui.pickQ.trim();
  const exact = S.exercises.some(e => e.name.toLowerCase() === q.toLowerCase());
  let h = q && !exact ? `<div class="pick-group"><div class="list"><button class="row accent" data-a="pick-create"><div class="grow title">Create “${esc(q)}”</div></button></div></div>` : '';
  h += exGroups(q).map(([m, items]) => `<div class="section-label">${m}</div><div class="pick-group"><div class="list">${items.map(e =>
    `<button class="row pick-row${ui.pickSel.includes(e.id) ? ' on' : ''}" data-a="pick-toggle" data-id="${e.id}"><div class="grow title">${esc(e.name)}</div><span class="tick">${I.check}</span></button>`).join('')}</div></div>`).join('');
  return h || `<div class="empty">No exercises yet.</div>`;
}
const updatePickBtn = () => { const b = $('#pick-done'); if (b) b.textContent = ui.pickSel.length ? `add (${ui.pickSel.length})` : 'add'; };

// Workout summary: nothing to read, just done.
function shSummary() {
  return `<div class="grab-area"><div class="grab"></div></div><div class="sheet-body">
    <div class="weigh"><div class="done-badge">${I.check}</div><h1>done.</h1></div>
    <div class="section" style="margin-top:22px"><button class="btn btn-primary" data-a="sheet-close">close</button></div></div>`;
}

// Cloud backup setup
function shCloud() {
  return `<div class="grab-area"><div class="grab"></div></div>
    <div class="sheet-head"><div class="side"><button class="link dim" data-a="sheet-close">cancel</button></div><h2>cloud backup</h2><div class="side right"></div></div>
    <div class="sheet-body"><div class="section"><div class="card steps">
      <p>One-time setup, about two minutes. You make a key that can only read and write your private <b>gym-data</b> repo.</p>
      <ol>
        <li>Open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub → new fine-grained token</a>.</li>
        <li>Expiration: pick the longest option.</li>
        <li>Repository access: <b>Only select repositories</b> → <b>gym-data</b>.</li>
        <li>Permissions → Repository permissions → <b>Contents: Read and write</b>.</li>
        <li>Generate the token, copy it, and paste it below.</li>
      </ol></div></div>
      <div class="section"><div class="list">
        <div class="row"><input class="field" id="cloud-repo" value="${esc(sync.repo || DEFAULT_REPO)}" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="Repository"></div>
        <div class="row"><input class="field" id="cloud-token" type="password" placeholder="Paste token" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="Token"></div>
      </div></div>
      <div class="section"><button class="btn btn-primary" data-a="cloud-connect" id="cloud-connect">connect</button></div>
    </div>`;
}

const SHEETS = { weigh: shWeigh, picker: shPicker, summary: shSummary, cloud: shCloud };

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
  toastT = setTimeout(() => el.classList.remove('show'), 2200);
}

// ---------- Active workout ----------
function newEx(exId, block) {
  const ex = exById(exId), last = lastSets(exId), tg = last && ex ? nextTargets(ex, last) : null;
  return {
    exId, block: block || null,
    sets: schemeOf(ex).map((rg, i) => ({ w: '', r: '', done: false, tw: tg ? tg[i].w : null, tr: tg ? tg[i].r : repRange(rg)[0] })),
  };
}
function startWorkout(name, planId, entries) {
  S.active = { id: uid(), name, planId, start: Date.now(), exercises: entries.map(e => newEx(e.exId, e.block)) };
  ui.wkQ = '';
  save(); haptic(); openWorkout();
}
function openWorkout() { ui.tab = 'workout'; ui.stack.workout = []; renderTabbar(); renderScreen(); }
// Slots with a single exercise go in straight away; the rest are quick picks during the workout.
function startPlan(id) {
  const p = planById(id);
  if (!p?.blocks.some(b => b.options.some(exById))) return toast('Add exercises to this plan first');
  const fixed = p.blocks.filter(b => b.pick > 0 && b.options.filter(exById).length === 1);
  startWorkout(p.name || 'workout', p.id, fixed.map(b => ({ exId: b.options.find(exById), block: b.id })));
}
// Guard every way of starting a workout against throwing away the one in progress.
function ifNoActive(go) {
  if (!S.active) return go();
  actionSheet({ title: 'A workout is already in progress', actions: [
    { label: 'Resume Current Workout', run: openWorkout },
    { label: 'Discard It and Start New', red: true, run: () => { S.active = null; save(); go(); } },
  ] });
}

// Weight placeholder: the planned target, else whatever was typed in the set above.
function phW(ex, si) {
  const s = ex.sets[si];
  if (s.tw != null) return s.tw > 0 ? fLoad(s.tw) : 'bw';
  for (let k = si - 1; k >= 0; k--) if (ex.sets[k].w !== '') return ex.sets[k].w;
  return '';
}
function refreshPh(ei) {
  const ex = S.active.exercises[ei];
  ex.sets.forEach((s, si) => { const el = $(`[data-cell="${ei}-${si}-w"]`); if (el) el.placeholder = phW(ex, si); });
}
function scActive() {
  const a = S.active;
  return nav({ title: a.name, left: `<div class="wk-clock"><span class="pulse"></span><span data-elapsed>${clock(Date.now() - a.start)}</span></div>`, right: `<button class="btn btn-sm wk-finish" data-a="wk-finish">finish</button>` }) +
    `<div class="kicker">${shortDay(a.start)} · ${hhmm(a.start)}</div><button class="wk-name" data-a="wk-rename">${esc(a.name)}</button>` +
    a.exercises.map(exBlock).join('') +
    `<div class="adder"><div class="search">${I.search}<input id="wk-q" placeholder="find exercise" value="${esc(ui.wkQ)}" autocomplete="off" autocapitalize="none" enterkeyhint="done"></div><div id="pick-rows">${pickRows(a)}</div></div>` +
    `<div class="section"><button class="btn btn-plain red" data-a="wk-discard">Discard workout</button></div>`;
}
function renderWorkout() {
  if (ui.tab === 'workout' && topScreen().name === 'active') renderScreen();
  ui.flash = null;
}

// The next exercise: the plan's exercises grouped by muscle, in plan order, or anything by typing.
function pickRows(a) {
  const p = a.planId && planById(a.planId), q = ui.wkQ.trim().toLowerCase();
  const inWk = new Set(a.exercises.map(e => e.exId));
  const planIds = p ? [...new Set(p.blocks.flatMap(b => b.options))].filter(exById) : [];
  const ids = (q ? [...planIds, ...S.exercises.map(e => e.id).filter(id => !planIds.includes(id))].filter(id => exName(id).toLowerCase().includes(q)) : planIds)
    .filter(id => !inWk.has(id));
  const blockOfEx = id => p?.blocks.find(b => b.options.includes(id))?.id || '';
  const groups = new Map();
  for (const id of ids) { const m = exById(id).muscle || 'Other'; groups.set(m, [...(groups.get(m) || []), id]); }
  let h = [...groups].map(([m, list]) => `<div class="section-label">${esc(m)}</div><div class="list">${list.map(id =>
    `<button class="row pick-ex" data-a="wk-pick" data-id="${id}" data-b="${blockOfEx(id)}"><div class="grow title">${esc(exName(id))}</div><span class="add">${I.plus}</span></button>`).join('')}</div>`).join('');
  if (q && !S.exercises.some(e => e.name.toLowerCase() === q)) h += `<div class="section-label">new</div><div class="list"><button class="row accent" data-a="wk-create"><div class="grow title">Create “${esc(ui.wkQ.trim())}”</div></button></div>`;
  return h || (q ? '<div class="empty">Nothing matches.</div>' : '');
}

function exBlock(ex, ei) {
  const e = exById(ex.exId), prev = lastSets(ex.exId);
  const planned = ex.sets.some(s => s.tw != null);
  const sub = planned ? `target ${ex.sets.map(s => setText({ w: s.tw ?? 0, r: s.tr })).join(' · ')}` : `first time · ${schemeOf(e).join(' · ')} reps`;
  return `<div class="ex"><div class="ex-head"><div class="grow"><div class="ex-kick">${pad2(ei + 1)}${e?.muscle ? ` · ${esc(e.muscle)}` : ''}</div><span class="ex-name">${esc(exName(ex.exId))}</span><div class="ex-target">${sub}</div></div><button class="dots" data-a="ex-menu" data-e="${ei}" aria-label="Exercise options">${I.dots}</button></div>
    <div class="set-row head"><span>SET</span><span>LAST</span><span>KG</span><span>REPS</span><span></span></div>
    ${ex.sets.map((s, si) => {
      const pv = prev?.[si];
      return `<div class="set-row${s.done ? ' done' : ''}${s.done && s.hit === false ? ' miss' : ''}${ui.flash === `${ei}-${si}` ? ' just' : ''}"><button class="set-n" data-a="set-menu" data-e="${ei}" data-s="${si}">${si + 1}</button>
        <span class="prev">${pv ? setText(pv) : '—'}</span>
        <input class="cell" data-cell="${ei}-${si}-w" inputmode="decimal" value="${esc(s.w)}" placeholder="${esc(phW(ex, si))}" autocomplete="off" aria-label="Weight">
        <input class="cell" data-cell="${ei}-${si}-r" inputmode="numeric" value="${esc(s.r)}" placeholder="${esc(s.tr ?? '')}" autocomplete="off" aria-label="Reps">
        <button class="check" data-a="set-check" data-e="${ei}" data-s="${si}" aria-label="Complete set">${I.check}</button></div>`;
    }).join('')}
    <button class="add-set" data-a="set-add" data-e="${ei}">${I.plus}add set</button></div>`;
}

function finishWorkout() {
  const a = S.active;
  let hit = 0, total = 0;
  const exercises = a.exercises.map(e => {
    const done = e.sets.filter(s => s.done);
    for (const s of done) if (s.hit != null) { total++; if (s.hit) hit++; }
    return { exId: e.exId, name: exName(e.exId), sets: done.map(s => ({ w: num(s.w) || 0, r: num(s.r) || 0 })) };
  }).filter(e => e.sets.length);
  const prs = exercises.filter(e => {
    const best = bestWeight(e.exId), top = Math.max(...e.sets.map(s => s.w));
    return best !== null && top > best + 1e-6;
  }).map(e => e.exId);
  const w = { id: a.id, name: a.name, planId: a.planId, start: a.start, end: Date.now(), exercises, prs, targets: total ? { hit, total } : null };
  S.workouts.push(w);
  S.active = null;
  save(); syncNow(); haptic(); renderTabbar(); renderScreen();
  setTimeout(() => openSheet({ kind: 'summary' }), 200);
}
function discardWorkout() { S.active = null; save(); renderTabbar(); renderScreen(); }

function tick() {
  const a = S.active;
  if (!a) return;
  const t = clock(Date.now() - a.start);
  document.querySelectorAll('[data-elapsed]').forEach(el => { el.textContent = t; });
}

// ---------- Cloud backup (private GitHub repo) ----------
let sync = (() => { try { return JSON.parse(lsGet(SYNC_KEY)) || {}; } catch (e) { return {}; } })();
let syncBusy = false, syncTimer = null, syncDirty = false;
const saveSync = () => lsSet(SYNC_KEY, JSON.stringify(sync));
const b64 = str => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
function gh(path, { method = 'GET', body, raw = false } = {}) {
  return fetch(`https://api.github.com/repos/${sync.repo}${path}`, {
    method, cache: 'no-store',
    headers: { Authorization: `Bearer ${sync.token}`, Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const ghError = (e, r) => (e instanceof TypeError ? 'no connection' : r?.status === 401 ? 'token not accepted (expired or wrong)' : r?.status === 404 ? 'repo not found for this token' : r?.status === 403 ? 'token can’t write to this repo' : e.message);

// Batches changes: one upload at most every 45 s while training, immediately after a workout or weigh-in.
function syncSoon() {
  if (!sync.token || sync.pending) return;
  syncDirty = true;
  if (!syncTimer) syncTimer = setTimeout(() => { syncTimer = null; syncNow(); }, 45000);
}
async function syncNow(manual) {
  if (!sync.token || syncBusy || (sync.pending && !manual)) return;
  clearTimeout(syncTimer); syncTimer = null;
  syncBusy = true; syncDirty = false;
  let r;
  try {
    const put = () => gh(`/contents/${BACKUP_PATH}`, { method: 'PUT', body: { message: `backup ${dayKey()} ${hhmm(Date.now())}`, content: b64(JSON.stringify(S)), ...(sync.sha ? { sha: sync.sha } : {}) } });
    r = await put();
    if (r.status === 409 || r.status === 422) {
      const m = await gh(`/contents/${BACKUP_PATH}`);
      sync.sha = m.ok ? (await m.json()).sha : null;
      r = await put();
    }
    if (!r.ok) throw new Error(`GitHub error ${r.status}`);
    sync.sha = (await r.json()).content.sha;
    sync.last = Date.now(); sync.error = null; sync.pending = false;
    if (manual) toast('Backed up');
  } catch (e) {
    sync.error = ghError(e, r);
    if (manual) toast(`Backup failed: ${sync.error}`);
  } finally {
    syncBusy = false; saveSync();
    if (topScreen().name === 'settings' && !ui.sheet) renderScreen();
    if (syncDirty) syncSoon();
  }
}
async function connectCloud() {
  const repo = $('#cloud-repo').value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$|\/$/g, '');
  const token = $('#cloud-token').value.trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !token) return toast('Add the repo and the token');
  const btn = $('#cloud-connect');
  btn.textContent = 'checking…'; btn.disabled = true;
  const prev = sync;
  sync = { repo, token, sha: null, last: null, error: null, pending: false };
  let r;
  try {
    r = await gh('');
    if (!r.ok) throw new Error(`GitHub error ${r.status}`);
    const f = await gh(`/contents/${BACKUP_PATH}`);
    if (f.ok) { sync.sha = (await f.json()).sha; sync.pending = true; }
    saveSync(); closeSheet(); renderScreen();
    if (sync.pending) cloudChoice();
    else syncNow(true);
  } catch (e) {
    const msg = ghError(e, r);
    sync = prev; saveSync();
    btn.textContent = 'connect'; btn.disabled = false;
    toast(msg);
  }
}
// A backup already exists: don't overwrite it until the person says which copy wins.
function cloudChoice() {
  actionSheet({ title: 'This repo already has a backup', msg: 'Restore it here, or replace it with what’s on this phone.', actions: [
    { label: 'Restore Backup to This Phone', run: restoreCloud },
    { label: 'Replace Backup With This Phone', red: true, run: () => syncNow(true) },
  ] });
}
async function restoreCloud() {
  let r;
  try {
    r = await gh(`/contents/${BACKUP_PATH}`, { raw: true });
    if (!r.ok) throw new Error(r.status === 404 ? 'no backup yet' : `GitHub error ${r.status}`);
    const d = JSON.parse(await r.text());
    if (!Array.isArray(d.exercises) || !Array.isArray(d.workouts)) throw new Error('backup file looks wrong');
    S = fromAny(d);
    sync.pending = false; saveSync();
    save(); resetUi(); toast('Backup restored');
  } catch (e) { toast(`Restore failed: ${ghError(e, r)}`); }
}

// ---------- Backup files ----------
async function exportData() {
  const name = `gym-backup-${dayKey()}.json`;
  const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'gym backup' }); return; } catch (e) { if (e.name === 'AbortError') return; }
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
    if (!Array.isArray(d.exercises) || !Array.isArray(d.workouts)) throw new Error('not a backup');
    actionSheet({ title: 'Replace all data with this backup?', msg: `${plural(d.workouts.length, 'workout')}, ${plural((d.weights || []).length, 'weigh-in')}`, actions: [{
      label: 'Replace My Data', red: true, run: () => { S = fromAny(d); save(); resetUi(); toast('Backup restored'); },
    }] });
  } catch (e) { toast('That file isn’t a gym backup'); }
}
function resetUi() {
  ui.stack = { workout: [], progress: [], weight: [] };
  renderTabbar(); renderScreen();
}

// ---------- Actions ----------
const blockOf = d => planById(d.id)?.blocks.find(b => b.id === d.b);
const A = {
  tab: d => {
    if (d.t === ui.tab) { if (ui.stack[ui.tab].length) { ui.stack[ui.tab] = []; renderScreen('pop'); } return; }
    ui.tab = d.t; renderTabbar(); renderScreen();
  },
  back,
  settings: () => push({ name: 'settings' }),
  // Settings stay out of sight: the first tap in the corner shows the gear, a second opens them.
  peek: (d, el) => {
    if (el.classList.contains('on')) return push({ name: 'settings' });
    el.classList.add('on'); clearTimeout(peekT);
    peekT = setTimeout(() => el.classList.remove('on'), 3000);
  },
  library: () => { ui.libQ = ''; push({ name: 'library' }); },
  'tip-close': () => { lsSet(TIP_KEY, '1'); renderScreen(); },

  'plan-go': d => ifNoActive(() => startPlan(d.id)),
  'plan-edit': d => push({ name: 'plan', id: d.id }),
  'plan-menu': d => {
    const p = planById(d.id);
    if (!p) return;
    actionSheet({ title: p.name || 'untitled', actions: [
      { label: 'Start', run: () => ifNoActive(() => startPlan(p.id)) },
      ...(topScreen().name === 'plan' ? [] : [{ label: 'Edit Plan', run: () => push({ name: 'plan', id: p.id }) }]),
      { label: 'Duplicate', run: () => {
        const c = JSON.parse(JSON.stringify(p));
        c.id = uid(); c.name = `${p.name} copy`; c.blocks.forEach(b => { b.id = uid(); });
        S.plans.splice(S.plans.indexOf(p) + 1, 0, c); save(); renderScreen(); toast('Plan duplicated');
      } },
      { label: 'Delete Plan', red: true, run: () => {
        S.plans = S.plans.filter(x => x !== p); save();
        if (topScreen().name === 'plan') { ui.stack[ui.tab].pop(); renderScreen('pop'); } else renderScreen();
      } },
    ] });
  },
  'block-new': d => {
    const p = planById(d.id), b = { id: uid(), name: '', pick: 1, options: [] };
    p.blocks.push(b); save(); renderScreen();
    openPicker(ids => { b.options.push(...ids.filter(id => !b.options.includes(id))); save(); renderScreen(); });
  },
  'block-add': d => openPicker(ids => {
    const b = blockOf(d);
    b.options.push(...ids.filter(id => !b.options.includes(id)));
    save(); renderScreen();
  }),
  'block-menu': d => {
    const p = planById(d.id), i = p.blocks.findIndex(b => b.id === d.b), b = p.blocks[i];
    const move = j => { p.blocks.splice(i, 1); p.blocks.splice(j, 0, b); save(); renderScreen(); };
    actionSheet({ title: b.name || exName(b.options[0], 'slot'), actions: [
      ...(i > 0 ? [{ label: 'Move Up', run: () => move(i - 1) }] : []),
      ...(i < p.blocks.length - 1 ? [{ label: 'Move Down', run: () => move(i + 1) }] : []),
      { label: 'Delete Slot', red: true, run: () => { p.blocks.splice(i, 1); save(); renderScreen(); } },
    ] });
  },
  'opt-menu': d => {
    const b = blockOf(d), exId = b.options[+d.i];
    actionSheet({ title: exName(exId), actions: [
      { label: 'Edit Exercise', run: () => push({ name: 'exedit', id: exId }) },
      { label: 'Remove From Slot', red: true, run: () => { b.options.splice(+d.i, 1); b.pick = Math.min(b.pick, b.options.length); save(); renderScreen(); } },
    ] });
  },

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
  'wk-pick': d => {
    S.active.exercises.push(newEx(d.id, d.b || null));
    ui.wkQ = ''; save(); haptic(); renderWorkout();
    const cards = document.querySelectorAll('#screens .ex');
    cards[cards.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  'wk-create': () => {
    const name = ui.wkQ.trim();
    if (!name) return;
    actionSheet({ title: `Muscle group for “${name}”`, actions: MUSCLES.map(m => ({ label: m, run: () => {
      const e = { id: uid(), name, muscle: m, scheme: ['8-12', '8-12'], inc: 2.5 };
      S.exercises.push(e);
      A['wk-pick']({ id: e.id });
    } })) });
  },
  'ex-menu': d => {
    const exs = S.active.exercises, i = +d.e, ex = exs[i];
    const block = ex.block && planById(S.active.planId)?.blocks.find(b => b.id === ex.block);
    const alts = block && !ex.sets.some(s => s.done) ? block.options.filter(id => id !== ex.exId && exById(id) && !exs.some(x => x.exId === id)) : [];
    const move = j => { exs.splice(i, 1); exs.splice(j, 0, ex); save(); renderWorkout(); };
    actionSheet({ title: exName(ex.exId), actions: [
      ...alts.map(id => ({ label: `Swap for ${exName(id)}`, run: () => { exs[i] = newEx(id, ex.block); save(); renderWorkout(); } })),
      ...(i > 0 ? [{ label: 'Move Up', run: () => move(i - 1) }] : []),
      ...(i < exs.length - 1 ? [{ label: 'Move Down', run: () => move(i + 1) }] : []),
      { label: 'Remove Exercise', red: true, run: () => { exs.splice(i, 1); save(); renderWorkout(); } },
    ] });
  },
  'set-add': d => {
    const sets = S.active.exercises[d.e].sets, l = sets[sets.length - 1];
    sets.push({ w: '', r: '', done: false, tw: l ? l.tw : null, tr: l ? l.tr : 10 });
    save(); renderWorkout();
  },
  'set-menu': d => {
    const sets = S.active.exercises[d.e].sets;
    actionSheet({ title: `Set ${+d.s + 1}`, actions: [{ label: 'Delete Set', red: true, run: () => { sets.splice(+d.s, 1); save(); renderWorkout(); } }] });
  },
  'set-check': d => {
    const ex = S.active.exercises[d.e], si = +d.s, s = ex.sets[si];
    if (s.done) { s.done = false; s.hit = null; save(); renderWorkout(); return; }
    // Empty fields mean "did the target".
    const w = s.w !== '' ? num(s.w) : s.tw != null ? s.tw : num(phW(ex, si));
    const r = s.r !== '' ? num(s.r) : num(s.tr);
    if (!(r > 0)) {
      const el = $(`[data-cell="${d.e}-${si}-r"]`);
      el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); el.focus();
      return;
    }
    s.w = w > 0 ? String(round2(w)) : '';
    s.r = String(Math.round(r));
    s.done = true;
    s.hit = s.tw != null ? (w || 0) >= s.tw - 1e-6 && r >= s.tr : null;
    ui.flash = `${d.e}-${si}`;
    haptic(); save(); renderWorkout();
  },

  'weigh-open': d => openSheet({ kind: 'weigh', date: d.date || dayKey(), morning: false }),
  'weigh-save': () => {
    const s = ui.sheet, typed = num($('#wv').value);
    if (typed > 0) s.val = r1(typed);
    if (!(s.val > 0)) return;
    const i = S.weights.findIndex(w => w.date === s.date);
    if (i >= 0) S.weights[i].kg = s.val;
    else { S.weights.push({ date: s.date, kg: s.val }); S.weights.sort((a, b) => (a.date < b.date ? -1 : 1)); }
    save(); syncNow(); haptic();
    const morning = s.morning;
    closeSheet(); renderScreen();
    if (morning) toast(`Saved · ${f1(s.val)} kg`);
  },
  'weigh-skip': dismissSheet,
  'weigh-del': () => {
    const date = ui.sheet.date;
    S.weights = S.weights.filter(w => w.date !== date);
    save(); closeSheet(); renderScreen();
  },
  'weight-all': () => { ui.weightAll = true; renderScreen(); },
  range: d => { ui.range = d.r; renderScreen(); },

  'ex-open': d => push({ name: 'exercise', id: d.id }),
  'ex-edit': d => push({ name: 'exedit', id: d.id }),
  metric: d => { ui.metric = d.m; renderScreen(); },
  'hist-open': d => push({ name: 'detail', id: d.id }),
  'hist-delete': d => actionSheet({ title: 'Delete this workout?', msg: 'Its sets come out of your progress too. This can’t be undone.', actions: [{
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
      const e = { id: uid(), name, muscle: m, scheme: ['8-12', '8-12'], inc: 2.5 };
      S.exercises.push(e); save();
      ui.pickSel.push(e.id); ui.pickQ = '';
      $('#pick-q').value = ''; $('#pick-list').innerHTML = pickList(); updatePickBtn();
    } })) });
  },

  'lib-add': () => {
    const name = prompt('New exercise name')?.trim();
    if (!name) return;
    actionSheet({ title: `Muscle group for “${name}”`, actions: MUSCLES.map(m => ({ label: m, run: () => {
      const e = { id: uid(), name, muscle: m, scheme: ['8-12', '8-12'], inc: 2.5 };
      S.exercises.push(e); save(); push({ name: 'exedit', id: e.id });
    } })) });
  },
  'scheme-add': d => { const e = exById(d.id), sc = schemeOf(e); e.scheme = [...sc, sc[sc.length - 1]]; save(); renderScreen(); },
  'scheme-del': d => {
    const e = exById(d.id);
    if (schemeOf(e).length < 2) return toast('An exercise needs at least one set');
    e.scheme = schemeOf(e).filter((_, i) => i !== +d.i); save(); renderScreen();
  },
  'inc-step': d => {
    const e = exById(d.id), i = INCREMENTS.indexOf(e.inc);
    e.inc = INCREMENTS[clamp((i < 0 ? 4 : i) + +d.d, 0, INCREMENTS.length - 1)]; save(); renderScreen();
  },
  'ex-muscle': d => {
    const e = exById(d.id);
    actionSheet({ title: e.name, actions: MUSCLES.map(m => ({ label: m, run: () => { e.muscle = m; save(); renderScreen(); } })) });
  },
  'ex-delete': d => {
    const e = exById(d.id);
    actionSheet({ title: `Delete ${e.name}?`, msg: 'It comes out of your plans. Logged workouts keep their sets.', actions: [{ label: 'Delete Exercise', red: true, run: () => {
      S.exercises = S.exercises.filter(x => x !== e);
      for (const p of S.plans) for (const b of p.blocks) b.options = b.options.filter(id => id !== e.id);
      save(); back();
    } }] });
  },

  cloud: () => {
    if (!sync.token) return openSheet({ kind: 'cloud' });
    if (sync.pending) return cloudChoice();
    actionSheet({ title: 'Cloud backup', msg: `${sync.repo} · ${cloudStatus()}`, actions: [
      { label: 'Back Up Now', run: () => syncNow(true) },
      { label: 'Restore From Backup', run: () => actionSheet({ title: 'Replace this phone’s data with the backup?', actions: [{ label: 'Restore Backup', red: true, run: restoreCloud }] }) },
      { label: 'Turn Off', red: true, run: () => { sync = {}; saveSync(); renderScreen(); } },
    ] });
  },
  'cloud-connect': connectCloud,
  export: exportData,
  import: () => $('#import-file').click(),
  reset: () => actionSheet({ title: 'Erase all data?', msg: 'Deletes every workout, plan and weigh-in on this phone. The cloud backup is not touched.', actions: [{
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

const setNavTitle = (el, text) => { const t = el.closest('.screen')?.querySelector('.nav-title'); if (t) t.textContent = text; };
document.addEventListener('input', e => {
  const t = e.target, d = t.dataset;
  if (d.cell && S.active) {
    const [ei, si, f] = d.cell.split('-');
    const s = S.active.exercises[ei]?.sets[si];
    if (!s) return;
    s[f] = t.value.replace(',', '.');
    saveSoon(); refreshPh(+ei);
  } else if (t.id === 'plan-name') {
    const p = planById(d.id);
    if (p) { p.name = t.value; setNavTitle(t, t.value || 'new plan'); saveSoon(); }
  } else if (d.blockName) {
    const b = planById(d.id)?.blocks.find(x => x.id === d.blockName);
    if (b) { b.name = t.value; saveSoon(); }
  } else if (t.id === 'ex-name') {
    const ex = exById(d.id);
    if (ex && t.value.trim()) { ex.name = t.value.trim(); setNavTitle(t, ex.name); saveSoon(); }
  } else if (d.scheme !== undefined) {
    const ex = exById(d.id);
    if (ex && t.value.trim()) { ex.scheme = schemeOf(ex).map((rg, i) => (i === +d.scheme ? t.value.trim() : rg)); saveSoon(); }
  } else if (t.id === 'wk-q') {
    ui.wkQ = t.value; $('#pick-rows').innerHTML = S.active ? pickRows(S.active) : '';
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
  if (e.key === 'Enter' && e.target.matches('#plan-name, #ex-name, .block-name, .range-input, .cell, #wk-q')) e.target.blur();
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
  } else {
    save();
    if (syncDirty) syncNow();
  }
});
window.addEventListener('pagehide', () => { clearTimeout(saveT); lsSet(KEY, JSON.stringify(S)); });

// ---------- Boot ----------
renderTabbar();
renderScreen();
setInterval(tick, 1000);
setTimeout(maybeWeighIn, 450);
navigator.storage?.persist?.().catch(() => {});
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // Reload once when a new version takes over, or later once no workout or sheet is open.
  const hadController = !!navigator.serviceWorker.controller;
  const safe = () => !S.active && (!ui.sheet || ui.sheet.morning);
  let waiting = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    if (safe()) location.reload(); else waiting = true;
  });
  navigator.serviceWorker.register('sw.js').then(reg => {
    // iOS usually resumes the app instead of relaunching it, which skips the browser's own update check.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      if (waiting && safe()) location.reload(); else reg.update().catch(() => {});
    });
  }).catch(() => {});
}
// Say so once after an update lands, so it's clear the phone has the new version.
const lastVer = lsGet(VER_KEY);
if (lastVer !== VERSION) {
  lsSet(VER_KEY, VERSION);
  if (lastVer || S.workouts.length || S.weights.length) setTimeout(() => toast(`updated to gym ${VERSION}`), 700);
}
