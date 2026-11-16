/* The scrolling story: each <section class="step"> names a layout in data-step; as the
 * reader scrolls into a step, every species' dot moves to its place in that layout (CSS
 * transitions on an SVG). Numbers in the prose are not typed in: a <b data-fact="..."> is
 * filled from story.json, so the text cannot drift from the chart. Modelled on
 * which-country/story, drawn in SVG because a hundred dots do not need WebGL. */
import { layout, monthTicks, COL, STEPS, WIN } from './layout.js';

const fmt = (n) => n.toLocaleString('en-US');
const pct = (v) => `${Math.round(v * 100)}%`;

/* the species named c, or throw: a typo must not render as blank */
export function sp(D, c) {
  const s = D.species.find((r) => r.c === c);
  if (!s) throw new Error(`no species ${c}`);
  return s;
}
const group = (D, s) => D.species.filter((r) => r.age === s.age);
const overlaps = (a, b) => a.age !== b.age && a.hi >= b.lo && b.hi >= a.lo;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const mon = (s) => MON.indexOf(s.date.split(' ')[0]);

/* "date:chimpanzee" -> "Dec 31, 11:27 am". Unknown names throw. */
export function fact(D, spec) {
  const [f, a] = spec.split(/:(.*)/s);
  switch (f) {
    case 'n': return fmt(D.n);
    case 'dates': return fmt(D.dates);
    case 'pairs': return fmt(D.pairs);
    case 'overlap': return fmt(D.overlap);
    case 'overpct': return pct(D.overlap / D.pairs);
    case 'month': { const m = MON.indexOf(a); if (m < 0) throw new Error(`no month ${a}`); return fmt(D.species.filter((s) => mon(s) === m).length); }
    case 'before': { const m = MON.indexOf(a); if (m < 0) throw new Error(`no month ${a}`); return fmt(D.species.filter((s) => mon(s) < m).length); }
    case 'cat': { if (!(a in COL)) throw new Error(`no group ${a}`); return fmt(D.species.filter((s) => s.cat === a).length); }
    case 'first': { const s = D.species.filter((r) => r.cat === a).sort((p, q) => q.age - p.age)[0]; if (!s) throw new Error(`no group ${a}`); return s.date; }
    case 'date': return sp(D, a).date;
    case 'from': return sp(D, a).from;
    case 'to': return sp(D, a).to;
    case 'tt': return `${sp(D, a).tt}`;
    case 'age': return `${sp(D, a).age}`;
    case 'share': return fmt(group(D, sp(D, a)).length);
    case 'span': { const s = sp(D, a); return fmt(Math.round(s.dlo - s.dhi)); }
    case 'mins': { const s = sp(D, a); return fmt(Math.round((s.dlo - s.dhi) * 1440)); }
    case 'flip': return fmt(D.species.filter((s) => [s.from, s.to].some((d) => d.split(' ')[0] !== s.date.split(' ')[0])).length);
    case 'raised': return fmt(D.species.filter((s) => s.raised).length);
    case 'over': {
      const [p, q] = a.split('|').map((c) => group(D, sp(D, c)));
      return fmt(p.reduce((n, x) => n + q.filter((y) => overlaps(x, y)).length, 0));
    }
    default: throw new Error(`unknown fact ${spec}`);
  }
}

/* labelled species per step */
export const LABELS = {
  year: ['white oak', 'chimpanzee'],
  autumn: ['white oak', 'button mushroom', 'fruit fly', 'sea lamprey', 'chimpanzee'],
  dec: ['platypus', 'chicken', 'house mouse', 'chimpanzee'],
  crowds: ['white oak', 'fruit fly', 'chicken', 'gray wolf'],
  blur: ['white oak', 'fruit fly', 'chimpanzee'],
  overlap: ['white oak', 'button mushroom', 'house mouse', 'gray wolf'],
  clash: ['moon jellyfish', 'fruit fly'],
};

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

async function main() {
  const D = await (await fetch('story.json')).json();
  for (const e of document.querySelectorAll('[data-fact]')) e.textContent = fact(D, e.dataset.fact);
  for (const name of Object.keys(LABELS)) LABELS[name].forEach((c) => sp(D, c));

  const steps = [...document.querySelectorAll('.step')];
  for (const s of steps) if (!STEPS[s.dataset.step]) throw new Error(`unknown step ${s.dataset.step}`);
  const plot = document.getElementById('plot');
  const svg = el('svg', { id: 'chart' });
  const gAxis = el('g', { class: 'axis' }), gBars = el('g'), gDots = el('g'), gLab = el('g', { class: 'labels' });
  svg.append(gAxis, gBars, gDots, gLab);
  plot.append(svg);
  const bars = D.species.map(() => gBars.appendChild(el('line', { class: 'bar' })));
  const dots = D.species.map((s) => { const c = gDots.appendChild(el('circle', { r: 3 })); c.append(el('title')); c.firstChild.textContent = `${s.c}: ${s.date}`; return c; });

  let shown = -1, W = 0, H = 0;
  const draw = (i) => {
    const name = steps[i].dataset.step;
    const r = plot.getBoundingClientRect();
    W = r.width; H = r.height;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const L = layout(name, D, W, H);
    L.dots.forEach((d, k) => {
      const c = dots[k];
      c.style.transform = `translate(${d.x}px, ${d.y}px)`;
      c.setAttribute('r', d.r);
      c.style.fill = d.fill;
      c.style.opacity = d.op;
      const b = bars[k];
      b.setAttribute('x1', d.x0); b.setAttribute('x2', d.x1); b.setAttribute('y1', d.y); b.setAttribute('y2', d.y);
      b.style.stroke = d.fill;
      b.style.opacity = L.shape === 'range' ? 0.75 : 0;
    });
    // month ticks along the bottom: the calendar is the only axis
    gAxis.replaceChildren();
    const [a, b] = WIN[L.win], pad = 8;
    const X = (d) => pad + ((d - a) / (b - a)) * (W - 2 * pad);
    for (const t of monthTicks(L.win)) {
      gAxis.append(el('line', { x1: X(t.d), x2: X(t.d), y1: 0, y2: H, class: 'grid' }));
      if (L.win !== 'dec') { const tx = el('text', { x: X(t.d) + 3, y: H + 16, class: 'tick' }); tx.textContent = t.label; gAxis.append(tx); }
    }
    if (L.win === 'dec') for (const d of [1, 8, 15, 22, 29]) {
      const tx = el('text', { x: X(333 + d), y: H + 16, class: 'tick' }); tx.textContent = `Dec ${d}`; gAxis.append(tx);
      gAxis.append(el('line', { x1: X(333 + d), x2: X(333 + d), y1: 0, y2: H, class: 'grid' }));
    }
    const now = el('text', { x: W - pad, y: H + 32, class: 'tick end' }); now.textContent = 'now →'; gAxis.append(now);
    gLab.replaceChildren();
    for (const c of LABELS[name]) {
      const k = D.species.findIndex((s) => s.c === c), d = L.dots[k];
      // a ring marks the labelled dot; the name sits beside it on a stack (above it on a range
      // plot, where the side is the dot's own bar), so it cannot be read as its neighbour's
      gLab.append(el('circle', { cx: d.x, cy: d.y, r: d.r + 2.5, class: 'ring' }));
      const right = d.x < W * 0.6, side = L.shape === 'stack';
      const tx = el('text', { x: d.x + (right ? 1 : -1) * (d.r + 5), y: side ? d.y + 4 : d.y - d.r - 4, class: `lab${right ? '' : ' end'}` });
      tx.textContent = c;
      gLab.append(tx);
    }
    document.body.dataset.step = i;
    window.__story = { step: i, name, shape: L.shape, shown: L.dots.filter((d) => d.op > 0).length };
  };

  const pick = () => {
    const line = innerHeight * 0.5;
    let i = 0;
    for (let k = 0; k < steps.length; k++) if (steps[k].getBoundingClientRect().top < line) i = k;
    if (i !== shown) { shown = i; draw(i); }
  };
  addEventListener('scroll', pick, { passive: true });
  addEventListener('resize', () => { shown = -1; pick(); });
  pick();
}

if (typeof document !== 'undefined') main().catch((e) => {
  document.body.classList.add('failed');
  document.getElementById('err').textContent = String(e.message || e);
  console.error(e);
});
