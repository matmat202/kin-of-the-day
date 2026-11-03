// node site/kin-logic.test.mjs — the page's logic against the shipped pool. LOGIC=<path>
// swaps in a mutant (test/plant.sh). Exit 1 on any failure.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const L = await import(pathToFileURL(resolve(process.env.LOGIC || join(here, 'kin-logic.js'))).href);
const pool = JSON.parse(readFileSync(join(here, 'data/pool.json'), 'utf8'));
const N = pool.species.length;
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('FAIL', msg); } };
const keyAt = (i) => new Date(Date.UTC(2026, 10, 1) + i * 864e5).toISOString().slice(0, 10);

// --- the daily sequence -----------------------------------------------------------------
ok(L.dayIndex(L.EPOCH) === 0 && L.dayIndex('2026-11-11') === 10 && L.dayIndex('2027-11-01') === 365, 'dayIndex counts days');
ok(L.dayIndex('2027-03-15') - L.dayIndex('2027-03-13') === 2, 'dayIndex across the DST change');
for (const c of [-1, 0, 1, 2, 7]) {
  const seen = new Set();
  for (let k = 0; k < N; k++) seen.add(L.pickIndex(N, keyAt(c * N + k)));
  ok(seen.size === N, `cycle ${c}: every species exactly once (${seen.size}/${N})`);
}
let runs = 0;
for (let i = -N; i < 12 * N; i++) if (L.pickIndex(N, keyAt(i)) === L.pickIndex(N, keyAt(i + 1))) runs++;
ok(runs === 0, `no species two days running, cycle boundaries included (${runs} repeats)`);
// small decks collide at cycle boundaries often, so the swap and the pre-epoch days get exercised
let small = 0, smallBoundary = 0;
for (let n = 2; n <= 9; n++) for (let i = -40 * n; i < 40 * n; i++) {
  if (L.pickIndex(n, keyAt(i)) === L.pickIndex(n, keyAt(i + 1))) small++;
  if ((i + 1) % n === 0) smallBoundary++;
}
ok(small === 0 && smallBoundary > 100, `small decks: no repeats across ${smallBoundary} boundaries (${small} repeats)`);
const order = (c) => Array.from({ length: N }, (_, k) => L.pickIndex(N, keyAt(c * N + k))).join();
ok(order(0) !== order(1) && order(1) !== order(2) && order(-1) !== order(0), 'each cycle has its own order');
ok(new Set([0, 1, 2, 3, 4].map((i) => L.pickIndex(N, keyAt(i)))).size === 5, 'consecutive days differ');
ok(L.pickIndex(N, '2026-11-03') === L.pickIndex(N, '2026-11-03'), 'a day is stable');

// --- words and numbers --------------------------------------------------------------------
ok(L.fmtAge(6.45) === '6.5 million years', 'fmtAge small: ' + L.fmtAge(6.45));
ok(L.fmtAge(89.48) === '89.5 million years', 'fmtAge under 100');
ok(L.fmtAge(318.8) === '319 million years', 'fmtAge hundreds');
ok(L.fmtAge(1455.3) === '1.46 billion years', 'fmtAge billions: ' + L.fmtAge(1455.3));
// earthDate against an independent reading: a non-leap year's real calendar
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
let bad = 0;
for (let a = 4539; a > 60; a -= 7.3) {
  const t = new Date(Date.UTC(2025, 0, 1) + (1 - a / L.EARTH) * 365 * 864e5);
  if (L.earthDate(a) !== `${MON[t.getUTCMonth()]} ${t.getUTCDate()}`) { bad++; if (bad < 3) console.log('  ', a, L.earthDate(a), MON[t.getUTCMonth()], t.getUTCDate()); }
}
ok(bad === 0, `earthDate matches the real 2025 calendar (${bad} off)`);
ok(L.earthDate(L.EARTH) === 'Jan 1', 'the Earth forms on Jan 1');
ok(L.earthDate(1455.3) === 'Sep 5', 'eukaryotes: ' + L.earthDate(1455.3));
ok(L.earthDate(6.5) === 'Dec 31, 11:27 am', 'chimp split: ' + L.earthDate(6.5));
ok(L.earthDate(0.0001) === 'Dec 31, 11:59 pm', 'now is the last minute: ' + L.earthDate(0.0001));
ok(L.earthDate(5.9) === 'Dec 31, 12:36 pm', 'just after noon is pm: ' + L.earthDate(5.9));
ok(L.earthDate(12) === 'Dec 31, 12:50 am', 'early on Dec 31: ' + L.earthDate(12));
const chimp = pool.species.find((s) => s.sci === 'Pan troglodytes'), dog = pool.species.find((s) => s.sci === 'Canis lupus');
ok(L.ancestor(dog) === 'an ancestor within the Boreoeutheria' || L.ancestor(dog) === 'the first of the Boreoeutheria', 'ancestor wording');
ok(L.ancestor({ named: true, mrca: 'X' }) === 'the first of the X' && L.ancestor({ named: false, mrca: 'X' }) === 'an ancestor within the X', 'named vs unnamed ancestor');

// --- the drawing --------------------------------------------------------------------------
ok(L.yOf(0) === 150, 'the present is at the top');
const ys = [0, 1, 6.5, 89, 720, 1455, 2000].map(L.yOf);
ok(ys.every((y, i) => i === 0 || y > ys[i - 1]), 'older is lower on the page');
let geomBad = 0, orderBad = 0, oursBad = 0, cladeBad = 0;
for (let i = 0; i < 3 * N; i++) {
  const key = keyAt(i), g = L.layout(pool, key), s = pool.species[g.today];
  if (g.today !== L.pickIndex(N, key)) geomBad++;
  for (const b of g.branches) {
    const sp = pool.species[b.i];
    if (b.p[0][0] !== g.cx || Math.abs(b.p[0][1] - L.yOf(sp.age)) > 1e-9 || b.p[3][1] !== g.top) geomBad++;
  }
  if (new Set(g.branches.map((b) => b.p[3][0].toFixed(3))).size !== N) geomBad++;
  // on each side, a branch that split earlier has its tip farther from us
  for (const side of [-1, 1]) {
    const bs = g.branches.filter((b) => Math.sign(b.p[3][0] - g.cx) === side).sort((a, b) => Math.abs(a.p[3][0] - g.cx) - Math.abs(b.p[3][0] - g.cx));
    for (let k = 1; k < bs.length; k++) if (pool.species[bs[k].i].age < pool.species[bs[k - 1].i].age) orderBad++;
  }
  if (g.ours.some((o) => !(o.age < s.age)) || g.ours.length !== pool.spine.filter((o) => o.named && o.age < s.age).length) oursBad++;
  if (g.clades.length !== s.theirs.length || g.clades.some((c, k) => c.name !== s.theirs[k])) cladeBad++;
  if (g.between.some((n) => !pool.ours.find((o) => o.name === n && o.depth < s.depth))) oursBad++;
}
ok(geomBad === 0, `every branch rises from its split on our line to the present (${geomBad})`);
ok(orderBad === 0, `older splits sit farther out (${orderBad} out of order)`);
ok(oursBad === 0, `our side shows only dated splits younger than today's (${oursBad})`);
ok(cladeBad === 0, `today's clades are drawn in order (${cladeBad})`);
const g0 = L.layout(pool, keyAt(0)), g1 = L.layout(pool, keyAt(1));
ok(g0.hue !== g1.hue || g0.branches[5].p[3][0] !== g1.branches[5].p[3][0], 'the art changes with the day');
ok(JSON.stringify(L.layout(pool, keyAt(9))) === JSON.stringify(L.layout(pool, keyAt(9))), 'a day draws the same picture twice');
const chimpDay = Array.from({ length: N }, (_, i) => keyAt(i)).find((k) => pool.species[L.pickIndex(N, k)].sci === 'Pan troglodytes');
ok(L.layout(pool, chimpDay).between.join() === 'Homo', 'chimp day: only Homo lies between us and the split');
ok(L.layout(pool, chimpDay).ours.length === 0, 'chimp day: no dated split of ours is younger');
ok(chimp.age === 6.5, 'chimp split 6.5 Mya');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
