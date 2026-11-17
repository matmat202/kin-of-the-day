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
  for (const b of g.branches) if (!b.today) el('path', { d: d(b.p), fill: 'none', stroke: faint, 'stroke-width': 1.4, 'data-i': b.i }, svg);
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
  svg.dataset.ink = ink;
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
    <p class="big">You last shared an ancestor <b>${L.fmtAge(s.age)} ago</b>: ${esc(L.ancestor(s))}.</p>${look(s)}
    <p>If the Earth's 4.54 billion years were one calendar year, that ancestor lived on <b>${L.earthDate(s.age)}</b>.</p>
    <p><b>Its line since then</b>: ${esc(theirs)}.</p>
    ${between ? `<p><b>Yours</b>: ${esc(between)} → you.</p>` : ''}
    <p class="note">TimeTree median${esc(ci)}.</p>${raised}`;
}

// What it looks like: Wikipedia's lead picture (free licences only, build.py) with its
// credit, and the article. A species with no article of its own links where its genus's
// name leads (Paramecium; Monosiga redirects to all choanoflagellates), and says so.
function look(s) {
  const w = s.wiki;
  if (!w) return '';
  const read = w.genus
    ? `<i>${esc(s.sci)}</i> has no article of its own: <a id="wiki" href="${esc(w.page)}">read about ${esc(w.title)} on Wikipedia →</a>`
    : `<a id="wiki" href="${esc(w.page)}">Read about the ${esc(s.common)} on Wikipedia →</a>`;
  const im = w.img;
  if (!im) return `<p class="note">${read}</p>`;
  const by = im.artist ? `${esc(im.artist.length > 80 ? im.artist.slice(0, 79) + '…' : im.artist)}, ` : '';
  const lic = im.license_url ? `<a href="${esc(im.license_url)}">${esc(im.license)}</a>` : esc(im.license);
  return `<figure id="look"><img src="${esc(im.src)}" width="${im.w}" height="${im.h}" alt="The ${esc(s.common)}" referrerpolicy="no-referrer">
    <figcaption>Photo: ${by}${lic}, via <a href="${esc(im.filepage)}">Wikimedia Commons</a>. ${read}</figcaption></figure>`;
}

const shift = L.addDays;

// "Fri, Dec 4", read in UTC because the key is a date, not a moment
const nice = (key) => new Date(key + 'T00:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
// The finder's own, shorter: 100 options have to fit a 320px phone beside a 29-character
// common name ("sleeping-sickness trypanosome"), and the weekday costs 34 of the 73px that
// put the longest option past the box. The prose above the chart keeps the weekday.
const niceShort = (key) => new Date(key + 'T00:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });

// A tap (or, with a mouse, a hover) on a faint line names its species and links to its day.
// The pick lives outside the drawing, so Save and the redraws never carry it.
function picker(pool, key, g) {  // g: the day's layout, which the redraws never change
  const svg = $('art'), out = $('pick');
  let on = -1;
  const show = (i) => {
    for (const p of svg.querySelectorAll('path.picked')) { p.classList.remove('picked'); p.removeAttribute('style'); }
    on = i;
    if (i < 0) { out.innerHTML = 'Tap any faint line to see which species it is.'; return; }
    const p = svg.querySelector(`path[data-i="${i}"]`);
    // in ink, not today's colour, and lifted above the other faint lines (still under ours)
    if (p) { p.classList.add('picked'); p.style.stroke = svg.dataset.ink; p.style.strokeWidth = 2.5; svg.insertBefore(p, svg.querySelector('line[stroke-width="4"]')); }
    const s = pool.species[i], today = L.dayKey(), day = L.dayOf(pool.species.length, i, today);
    const when = day === today ? 'today' : nice(day);
    out.innerHTML = `<b>${esc(s.common)}</b> <i>${esc(s.sci)}</i>: you last shared an ancestor ${L.fmtAge(s.age)} ago. `
      + (day === key ? `This page is its day.` : `<a href="?d=${day}">Its day: ${when} →</a>`);
  };
  const at = (e) => {
    const r = svg.getBoundingClientRect(), u = L.W / r.width;
    return L.nearest(g, (e.clientX - r.left) * u, (e.clientY - r.top) * u, 22 * u);
  };
  svg.addEventListener('click', (e) => show(at(e)));
  svg.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { const i = at(e); if (i !== on) show(i); } });
  show(-1);
  return () => { if (on >= 0) show(on); };  // after a redraw, mark the pick again
}

// Look a species up by name: every one A to Z, each with the first day from today that shows
// it, and choosing one goes there. Days count from today, like the tap's link, not this page.
function finder(pool, key) {
  const sel = $('find'), today = L.dayKey(), mine = L.pickIndex(pool.species.length, key);
  // A closed <select> cuts an option too wide for it with no sign, and the widest option is
  // a pick away rather than on screen, so nobody sees it until they open the list. The
  // longest common name here ("sleeping-sickness trypanosome") is 222px at 16px, and its
  // day costs another 61px, which does not fit a 320px phone. Shrinking the text is not
  // available: bin/audit refuses a form control under 16px, because iPhone Safari zooms
  // into one on tap. So on a narrow screen the day is dropped and the name kept.
  //
  // MEASURED, not a breakpoint. A width chosen by hand would be right for today's hundred
  // names and wrong for the next one added, and it would sit in the gap between the two
  // gates that watch this (narrow-reflow at 320 and 360, the phone shot at 390) rather than
  // where the text actually stops fitting. This asks the box.
  const rows = L.finder(pool.species, today);
  for (const r of rows) {
    // this page's own species stays put: its entry says so, and choosing it goes nowhere
    const here = r.i === mine, o = new Option('', here ? key : r.day);
    o.dataset.i = r.i;
    o.dataset.name = r.name;
    o.dataset.suffix = here ? 'this page' : r.day === today ? 'today' : niceShort(r.day);
    sel.add(o);
  }
  const ruler = document.createElement('canvas').getContext('2d');
  // The widest the list can ever be, not the widest it happens to be today: the longest
  // name crossed with the widest month-and-day the calendar can make. Otherwise the layout
  // would change under a visitor as the dates roll on, and a gate would pass in November
  // and fail in May.
  const widest = (full) => {
    const cs = getComputedStyle(sel);
    ruler.font = [cs.fontStyle, cs.fontVariant, cs.fontWeight, cs.fontSize + '/' + cs.lineHeight, cs.fontFamily].join(' ');
    let w = 0;
    for (const o of sel.options) {
      const name = o.dataset.name;
      if (!name) continue;
      if (!full) { w = Math.max(w, ruler.measureText(name).width); continue; }
      for (const tail of [o.dataset.suffix, 'May 28'])
        w = Math.max(w, ruler.measureText(`${name} · ${tail}`).width);
    }
    return w;
  };
  const relabel = () => {
    const cs = getComputedStyle(sel);
    // the dropdown arrow eats room the padding does not describe; 16px on this engine
    const box = sel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 16;
    const full = widest(true) <= box - 4;
    for (const o of sel.options) {
      if (!o.dataset.name) continue;
      o.textContent = full ? `${o.dataset.name} · ${o.dataset.suffix}` : o.dataset.name;
    }
  };
  relabel();
  addEventListener('resize', relabel);
  sel.addEventListener('change', () => { if (sel.value && sel.value !== key) location.href = `?d=${sel.value}`; });
}

async function main() {
  const pool = await (await fetch('data/pool.json')).json();
  const q = new URLSearchParams(location.search).get('d');
  const key = q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : L.dayKey();
  const scale = () => L.textScale($('art').getBoundingClientRect().width);
  let k = scale();
  const { g, s } = draw(pool, key, k);
  words(pool, key, g, s);
  const remark = picker(pool, key, g);
  finder(pool, key);
  // the words can bring a scrollbar, which narrows the drawing after its first draw
  if (Math.abs(scale() - k) > 0.01) draw(pool, key, (k = scale())), remark();
  $('prev').href = `?d=${shift(key, -1)}`;
  $('next').href = `?d=${shift(key, 1)}`;
  $('today').hidden = key === L.dayKey();
  // a phone turned sideways, or a window resized, redraws at the new label size
  // (watching the drawing, not the window: a scrollbar appearing narrows it too)
  new ResizeObserver(() => { const n = scale(); if (Math.abs(n - k) > 0.01) draw(pool, key, (k = n)), remark(); }).observe($('art'));
  $('save').onclick = () => {
    draw(pool, key, 1);
    const blob = new Blob([new XMLSerializer().serializeToString($('art'))], { type: 'image/svg+xml' });
    draw(pool, key, k);
    remark();
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `kin-${key}.svg` });
    a.click();
  };
  document.body.dataset.ready = key;
}

main().catch((e) => { $('words').textContent = 'Could not load the species: ' + e.message; document.body.dataset.ready = 'error'; });
