/* Where each of the 100 species sits on each step of the story. Pure: no DOM, so
 * test/story.test.mjs runs every layout at several plot sizes.
 *
 * x is always the Earth-year calendar (day 0 = Jan 1, the Earth forms; day 365 = now),
 * over a window that changes by step. Two shapes:
 *   stack  — a beeswarm: dots in date order, each in the lowest free slot, so species
 *            that met you on the same date pile into one column
 *   range  — one row per species, deepest split at the bottom, with TimeTree's confidence
 *            range drawn as a bar from its earliest to its latest date
 */
export const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const START = DAYS.map((_, i) => DAYS.slice(0, i).reduce((a, b) => a + b, 0));
export const COL = { plant: '#137a4f', fungus: '#a8461a', single: '#6b7178', animal: '#5b3a8e', vertebrate: '#2a78d6', mammal: '#16202a' };
export const DIM = '#c9cbd1';
export const WIN = { year: [0, 365], autumn: [START[7] + 14, 365], dec: [START[11], 365] };

/* step name -> [shape, window, which species are coloured (null = all), which are drawn] */
export const STEPS = {
  year: ['stack', 'year', null],
  autumn: ['stack', 'autumn', null],
  dec: ['stack', 'dec', null, (s) => s.day >= START[11]],
  crowds: ['stack', 'autumn', (s, D) => crowd(D).has(s.age)],
  blur: ['range', 'autumn', null],
  overlap: ['range', 'autumn', (s) => ['house mouse', 'gray wolf', 'button mushroom', 'white oak'].includes(s.c)],
  clash: ['range', 'autumn', (s) => s.raised || s.mrca === 'Bilateria'],
};

/* the dates ten or more species share */
export function crowd(D) {
  const n = new Map();
  for (const s of D.species) n.set(s.age, (n.get(s.age) || 0) + 1);
  return new Set([...n].filter(([, k]) => k >= 10).map(([a]) => a));
}

export function monthTicks(win) {
  const [a, b] = WIN[win];
  return START.map((d, i) => ({ d, label: MONTHS[i] })).filter((t) => t.d >= a && t.d < b);
}

/* -> {shape, win, dots: [{x, y, r, fill, op, x0, x1}] in px of a w x h box, same order as D.species} */
export function layout(name, D, w, h) {
  const [shape, win, lit, shown] = STEPS[name] || (() => { throw new Error(`unknown step ${name}`); })();
  const [a, b] = WIN[win];
  const pad = 8;
  const X = (d) => pad + ((Math.min(b, Math.max(a, d)) - a) / (b - a)) * (w - 2 * pad);
  const fill = (s) => (!lit || lit(s, D) ? COL[s.cat] : DIM);
  const S = D.species;
  if (shape === 'range') {
    const row = (h - 2 * pad) / S.length;
    const r = Math.max(1.6, Math.min(4, row * 0.45));
    // deepest at the bottom: S is sorted deepest first
    return { shape, win, dots: S.map((s, i) => ({
      x: X(s.day), y: h - pad - (i + 0.5) * row, r, fill: fill(s), op: 1,
      x0: X(s.dhi), x1: X(s.dlo),
    })) };
  }
  const vis = S.map((s) => !shown || shown(s));
  let r = 7, slots;
  for (;;) {
    slots = swarm(S.map((s) => X(s.day)), vis, r);
    const top = Math.max(...slots.filter((_, i) => vis[i]));
    if ((top + 1) * 2 * r + 2 * pad <= h || r <= 1.5) break;
    r -= 0.25;
  }
  return { shape, win, dots: S.map((s, i) => ({
    x: X(s.day), y: h - pad - (slots[i] + 0.5) * 2 * r, r: r * 0.9, fill: fill(s), op: vis[i] ? 1 : 0,
    x0: X(s.day), x1: X(s.day),
  })) };
}

/* beeswarm: in x order, each visible dot takes the lowest slot no dot within 2r of it holds */
export function swarm(xs, vis, r) {
  const order = xs.map((x, i) => i).filter((i) => vis[i]).sort((p, q) => xs[p] - xs[q] || p - q);
  const slot = xs.map(() => 0), placed = [];
  for (const i of order) {
    const taken = new Set(placed.filter((j) => Math.abs(xs[j] - xs[i]) < 2 * r).map((j) => slot[j]));
    let k = 0;
    while (taken.has(k)) k++;
    slot[i] = k;
    placed.push(i);
  }
  return slot;
}
