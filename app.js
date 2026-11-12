// Kin of the Day — the page. Pure logic lives in kin-logic.js.
import * as L from './kin-logic.js';

const $ = (id) => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function el(name, attrs, parent, text) {
  const e = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  parent.appendChild(e);
  return e;
}

const d = (p) => `M${p[0]} C${p[1]} ${p[2]} ${p[3]}`;

// Shrink a line of the drawing's text until it fits across the drawing.
function fit(t) {
  const w = t.getComputedTextLength(), room = L.W - 40;
  if (w > room) t.setAttribute('font-size', parseFloat(t.getAttribute('font-size')) * room / w);
  return t;
}

// k grows the labels on a narrow screen (L.textScale); the Save copy is drawn at k = 1.
function draw(pool, key, k = 1) {
  const kk = Math.min(k, 1.6);
  const g = L.layout(pool, key), s = pool.species[g.today];
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  const faint = `hsl(${g.hue} 25% ${dark ? 40 : 72}%)`, bold = `hsl(${(g.hue + 180) % 360} 70% ${dark ? 65 : 38}%)`;
  const ink = dark ? '#e9eef2' : '#16202a', ink2 = dark ? '#93a0ab' : '#66727d', bg = dark ? '#121615' : '#fbfaf7';
  const svg = $('art');
  svg.replaceChildren();
  svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
  el('rect', { width: L.W, height: L.H, fill: bg }, svg);
  // the time axis, a few round ages, on the left margin
  for (const a of [1, 10, 100, 500, 1000, 2000]) {
    const y = L.yOf(a);
    el('line', { x1: 20, x2: L.W - 20, y1: y, y2: y, stroke: ink2, 'stroke-opacity': 0.18, 'stroke-dasharray': '2 6' }, svg);
    el('text', { x: 24, y: y - 4 * k, fill: ink2, 'font-size': 15 * k }, svg, a >= 1000 ? `${a / 1000} billion years ago` : `${a} million years ago`);
  }
  // 'now' sits on whichever margin today's tip leaves free
  const tipX = g.branches[g.today].p[3][0], nowLeft = tipX > L.W * 0.3;
  el('text', { x: nowLeft ? 24 : L.W - 24, y: g.top - 14, fill: ink2, 'font-size': 15 * k, 'text-anchor': nowLeft ? 'start' : 'end', class: 'key' }, svg, 'now');
  for (const b of g.branches) if (!b.today) el('path', { d: d(b.p), fill: 'none', stroke: faint, 'stroke-width': 1.4 }, svg);
  // our line: from today's split up to us
  el('line', { x1: g.cx, x2: g.cx, y1: g.split, y2: g.top, stroke: ink, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
  el('line', { x1: g.cx, x2: g.cx, y1: g.bottom, y2: g.split, stroke: ink, 'stroke-width': 4, 'stroke-opacity': 0.35 }, svg);
  // every dated split gets its dot; a name only where it clears the one above it
  let lastY = -Infinity;
  for (const o of g.ours) {
    el('circle', { cx: g.cx, cy: o.y, r: 4, fill: ink }, svg);
    if (o.y - lastY < 14 * k) continue;
    el('text', { x: g.cx + 9 * k, y: o.y + 4 * k, fill: ink2, 'font-size': 12 * k }, svg, o.name);
    lastY = o.y;
  }
  const t = g.branches[g.today];
  el('path', { d: d(t.p), fill: 'none', stroke: bold, 'stroke-width': 5, 'stroke-linecap': 'round' }, svg);
  for (const c of g.clades) el('circle', { cx: c.at[0], cy: c.at[1], r: 3.5, fill: bold }, svg);
  el('circle', { cx: g.cx, cy: g.split, r: 9, fill: bold, stroke: bg, 'stroke-width': 3 }, svg);
  const tip = t.p[3], anchor = tip[0] > L.W * 0.75 ? 'end' : tip[0] < L.W * 0.25 ? 'start' : 'middle';
  el('text', { x: tip[0], y: g.top - 14, fill: bold, 'font-size': 22 * kk, 'font-weight': 700, 'text-anchor': anchor, class: 'key' }, svg, s.common);
  el('text', { x: g.cx, y: g.top - 14 - 30 * kk, fill: ink, 'font-size': 22 * kk, 'font-weight': 700, 'text-anchor': 'middle', class: 'key' }, svg, 'you');
  fit(el('text', { x: L.W / 2, y: L.H - 50, fill: ink, 'font-size': 26 * kk, 'font-weight': 700, 'text-anchor': 'middle' }, svg,
    `You and the ${s.common}: ${L.fmtAge(s.age)}`));
  fit(el('text', { x: L.W / 2, y: L.H - 22, fill: ink2, 'font-size': 14 * k, 'text-anchor': 'middle' }, svg,
    `Kin of the Day · ${key} · ${pool.species.length} species, each split dated by TimeTree, the tree from Open Tree of Life`));
  return { g, s };
}

function words(pool, key, g, s) {
  const theirs = s.theirs.length ? s.theirs.join(' → ') : '(Open Tree names no clade on its side)';
  const between = g.between.length ? g.between.slice().reverse().join(' → ') : '';
  const raised = s.age !== s.tt
    ? `<p class="note">TimeTree's own median for this pair is ${L.fmtAge(s.tt)}, younger than a split nearer to us, which cannot be; the page uses ${L.fmtAge(s.age)}, the oldest age above it.</p>` : '';
  const ci = s.ci ? ` (95% interval ${Math.round(s.ci[0])}–${Math.round(s.ci[1])} Mya, from ${s.studies} studies)` : '';
  $('words').innerHTML = `
    <h2>The ${esc(s.common)} <i>${esc(s.sci)}</i></h2>
    <p class="big">You last shared an ancestor <b>${L.fmtAge(s.age)} ago</b>: ${esc(L.ancestor(s))}.</p>
    <p>If the Earth's 4.54 billion years were one calendar year, that ancestor lived on <b>${L.earthDate(s.age)}</b>.</p>
    <p><b>Its line since then</b>: ${esc(theirs)}.</p>
    ${between ? `<p><b>Yours</b>: ${esc(between)} → you.</p>` : ''}
    <p class="note">TimeTree median${esc(ci)}.</p>${raised}`;
}

function shift(key, n) {
  const [y, m, dd] = key.split('-').map(Number);
  return L.dayKey(new Date(y, m - 1, dd + n));
}

async function main() {
  const pool = await (await fetch('data/pool.json')).json();
  const q = new URLSearchParams(location.search).get('d');
  const key = q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : L.dayKey();
  const scale = () => L.textScale($('art').getBoundingClientRect().width);
  let k = scale();
  const { g, s } = draw(pool, key, k);
  words(pool, key, g, s);
  // the words can bring a scrollbar, which narrows the drawing after its first draw
  if (Math.abs(scale() - k) > 0.01) draw(pool, key, (k = scale()));
  $('prev').href = `?d=${shift(key, -1)}`;
  $('next').href = `?d=${shift(key, 1)}`;
  $('today').hidden = key === L.dayKey();
  // a phone turned sideways, or a window resized, redraws at the new label size
  // (watching the drawing, not the window: a scrollbar appearing narrows it too)
  new ResizeObserver(() => { const n = scale(); if (Math.abs(n - k) > 0.01) draw(pool, key, (k = n)); }).observe($('art'));
  $('save').onclick = () => {
    draw(pool, key, 1);
    const blob = new Blob([new XMLSerializer().serializeToString($('art'))], { type: 'image/svg+xml' });
    draw(pool, key, k);
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `kin-${key}.svg` });
    a.click();
  };
  document.body.dataset.ready = key;
}

main().catch((e) => { $('words').textContent = 'Could not load the species: ' + e.message; document.body.dataset.ready = 'error'; });
