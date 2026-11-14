// Kin of the Day — the page's pure logic. No DOM; imported by app.js and the test.
//
// pool.json: species [{sci, common, depth, mrca, named, theirs, tt, ci, studies, age}],
// spine [{depth, age, name}] (our dated splits, shallow first), ours [{depth, name}].

export const EARTH = 4540;          // Mya, the age of the Earth
export const EPOCH = '2026-11-01';  // day 0 of the daily sequence
export const W = 1000, H = 1250;    // the drawing, portrait so it prints on a page
const TOP = 150, BOTTOM = 1150, DEEPEST = 2000;

// FNV-1a: a string to a 32-bit seed.
export function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

// mulberry32: small, fast, and the same sequence in every browser.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(n, r) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// The local calendar date as YYYY-MM-DD.
export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dayIndex(key) {
  const ms = (k) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((ms(key) - ms(EPOCH)) / 864e5);
}

// Which species a day shows: every species once per cycle of n days, in a shuffled order,
// and never the same one two days running across a cycle boundary.
const deck = (n, c) => shuffle(n, rng(hash('kin-cycle-' + c)));
export function pickIndex(n, key) {
  const i = dayIndex(key), c = Math.floor(i / n), k = ((i % n) + n) % n;
  // The swap moves only the first two, so a previous cycle's last is its unswapped last,
  // except at n = 2, where the swap is the whole deck; there, alternation is the answer.
  if (n < 3) return k;
  const d = deck(n, c);
  if (deck(n, c - 1)[n - 1] === d[0]) [d[0], d[1]] = [d[1], d[0]];
  return d[k];
}

export function fmtAge(mya) {
  if (mya >= 1000) return `${(mya / 1000).toFixed(2)} billion years`;
  if (mya >= 100) return `${Math.round(mya)} million years`;
  return `${mya.toFixed(1)} million years`;
}

// Earth's 4.54 billion years squeezed into one calendar year: the Earth forms at the
// first instant of Jan 1 and now is the last instant of Dec 31.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export function earthDate(mya) {
  const days = (1 - mya / EARTH) * 365;
  let d = Math.floor(days), m = 0;
  while (m < 11 && d >= LENGTHS[m]) d -= LENGTHS[m++];
  const date = `${MONTHS[m]} ${d + 1}`;
  if (m < 11 || d < 30) return date;
  const mins = Math.floor((days - 364) * 1440), hh = Math.floor(mins / 60), mm = mins % 60;
  return `${date}, ${(hh % 12) || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`;
}

// Time runs up the page on a log scale: the present at TOP, 2 billion years ago at BOTTOM.
export function yOf(mya) {
  return TOP + (BOTTOM - TOP) * Math.log10(1 + mya) / Math.log10(1 + DEEPEST);
}

// On a phone the 1000-unit drawing is ~360 px wide, so a 12-unit label renders at 4 px.
// Labels grow until the smallest (12 units) reads at MIN_PX on screen, at most 2.2 times;
// at desktop widths the factor is 1 and the drawing is the printed one.
export const MIN_PX = 9;
export function textScale(px) {
  if (!(px > 0)) return 1;
  return Math.min(2.2, Math.max(1, (MIN_PX / 12) * W / px));
}

// The sentence's subject: the ancestor itself, or the clade it sits inside.
export function ancestor(s) {
  return s.named ? `the first of the ${s.mrca}` : `an ancestor within the ${s.mrca}`;
}

export function bez(p, t) {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t * t * t * p[3][k]);
}

// The day's drawing as data: our spine, and every species' branch rising from the moment
// it split from us to its tip in the present. The day seeds the palette, which side each
// branch leans to, and how it curves; today's species is drawn last, with its clades.
export function layout(pool, key) {
  const r = rng(hash('kin-art-' + key));
  const sp = pool.species, today = pickIndex(sp.length, key);
  const hue = Math.floor(r() * 360);
  const cx = W / 2, xs = [];
  // tips: oldest splits at the edges, our nearest kin beside us in the middle, sides by coin
  const byAge = sp.map((s, i) => i).sort((a, b) => sp[b].age - sp[a].age || a - b);
  const left = [], right = [];
  for (const i of byAge) (r() < 0.5 ? left : right).push(i);
  const place = (list, side) => list.forEach((i, k) => {
    const span = cx - 40 - 30;
    xs[i] = cx + side * (30 + span * (1 - (k + 0.5) / list.length));
  });
  place(left, -1); place(right, 1);
  const tension = 0.35 + 0.4 * r();
  const branches = sp.map((s, i) => {
    const y0 = yOf(s.age), x1 = xs[i];
    const p = [[cx, y0], [cx + (x1 - cx) * tension, y0], [x1, y0 + (TOP - y0) * (1 - tension)], [x1, TOP]];
    return { i, p, today: i === today };
  });
  const t = branches[today], s = sp[today];
  const clades = s.theirs.map((name, k) => ({ name, at: bez(t.p, (k + 1) / (s.theirs.length + 1)) }));
  // our side: only splits TimeTree dates and Open Tree names, younger than today's split
  const ours = pool.spine.filter((o) => o.named && o.age < s.age).map((o) => ({ name: o.name, age: o.age, y: yOf(o.age) }));
  // our clades between us and the split, undated: named in the text, not drawn
  const between = pool.ours.filter((o) => o.depth < s.depth).map((o) => o.name);
  return { today, hue, cx, top: TOP, bottom: BOTTOM, split: yOf(s.age), branches, clades, ours, between };
}

// YYYY-MM-DD plus n days, counted in UTC so a DST change cannot skip or repeat a day.
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// The faint branch a tap at (x, y), in drawing units, lands on: the nearest within reach,
// or -1. Today's branch is skipped; the words already name it.
export function nearest(g, x, y, reach) {
  let best = -1, bd = reach * reach;
  for (const b of g.branches) {
    if (b.today) continue;
    // to the chords between 49 points on the curve, not to the points: on the long
    // sideways sweeps the points sit 40 units apart
    let a = bez(b.p, 0);
    for (let k = 1; k <= 48; k++) {
      const c = bez(b.p, k / 48), vx = c[0] - a[0], vy = c[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / (vx * vx + vy * vy || 1)));
      const dd = (a[0] + t * vx - x) ** 2 + (a[1] + t * vy - y) ** 2;
      if (dd < bd) { bd = dd; best = b.i; }
      a = c;
    }
  }
  return best;
}

// The first day on or after `from` that shows species i. Every cycle shows it once, so two
// cycles always hold one.
export function dayOf(n, i, from) {
  for (let k = 0; k <= 2 * n; k++) { const key = addDays(from, k); if (pickIndex(n, key) === i) return key; }
  return null;
}
