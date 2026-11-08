// Page ornaments, both self-hosted animated SVG:
//  - a typing strip: short phrases typed one character at a time, held, erased, and replaced by the next;
//  - a divider: a line of faint star dust with a star that crosses it now and then.
//
// profile.typing = ["Security Researcher", "Vulnerability Research", ...]   (up to 8 short phrases)

import { THEMES } from './art';
import { escapeXml } from '../pulsar/art';
import { seededRandom } from '../../lib/random';

const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
const REDUCED = '@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }';

export function typingPhrases(profile) {
  return (profile.typing || [])
    .map((s) => String(s).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 8);
}

// Typing strip. Every phrase has its own clip rectangle whose width steps up one character at a time
// (SMIL, discrete) and later steps back down; phrases take turns inside one shared cycle. `textLength`
// forces every character to advance by exactly ADV pixels, so the clip edge and the cursor stay aligned
// with the glyphs whatever monospace font the viewer has.
export function typingSvg(profile, themeName = 'dark') {
  const phrases = typingPhrases(profile);
  if (!phrases.length) return null;
  const c = THEMES[themeName];
  const W = 1200;
  const H = 84;
  const FS = 28;
  const ADV = 18;
  const X0 = 80;
  const TYPE = 0.075;
  const HOLD = 1.8;
  const ERASE = 0.035;
  const GAP = 0.5;

  let t = 0;
  const slots = phrases.map((text) => {
    const n = [...text].length;
    const start = t;
    const events = [];
    for (let i = 1; i <= n; i += 1) events.push([start + i * TYPE, i]);
    const holdEnd = start + n * TYPE + HOLD;
    for (let i = n - 1; i >= 0; i -= 1) events.push([holdEnd + (n - i) * ERASE, i]);
    t = holdEnd + n * ERASE + GAP;
    return { text, n, events };
  });
  const T = t;

  const anim = (attr, events, valueOf) => {
    const times = [0, ...events.map((e) => e[0] / T), 1];
    const values = [valueOf(0), ...events.map((e) => valueOf(e[1])), valueOf(0)];
    return `<animate attributeName="${attr}" dur="${T.toFixed(2)}s" repeatCount="indefinite" calcMode="discrete" keyTimes="${times
      .map((x) => x.toFixed(5))
      .join(';')}" values="${values.join(';')}"/>`;
  };

  const clips = slots
    .map((s, i) => `<clipPath id="tc${i}"><rect x="${X0}" y="0" width="${i === 0 ? s.n * ADV : 0}" height="${H}">${anim('width', s.events, (w) => w * ADV)}</rect></clipPath>`)
    .join('');
  const texts = slots
    .map(
      (s, i) =>
        `<text clip-path="url(#tc${i})" x="${X0}" y="53" font-family="${MONO}" font-size="${FS}" font-weight="700" fill="${c.fg}" textLength="${s.n * ADV}" lengthAdjust="spacing">${escapeXml(s.text)}</text>`
    )
    .join('');
  const cursorEvents = slots.flatMap((s) => s.events);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(`Typed on a loop: ${phrases.join('; ')}.`)}">
<style>.cur{animation:blink 1.05s steps(1,end) infinite}@keyframes blink{0%,55%{opacity:1}56%,100%{opacity:0}}${REDUCED}</style>
<defs>${clips}</defs>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${c.bg}" stroke="${c.faint}"/>
<text x="40" y="53" font-family="${MONO}" font-size="${FS}" font-weight="700" fill="${c.hud}">&gt;</text>
${texts}
<rect class="cur" x="${X0}" y="27" width="12" height="34" rx="2" fill="${c.hud}">${anim('x', cursorEvents, (w) => X0 + w * ADV)}</rect>
</svg>`;
}

// Divider: a hairline of star dust (seeded from the login, so it is the same every build), a few brighter
// stars that twinkle, and two stars that cross it, one each way, on different cycles. Each crossing takes
// 60% of its cycle and then the star waits off-screen, so they pass at irregular moments.
export function dividerSvg(profile, themeName = 'dark') {
  const c = THEMES[themeName];
  const W = 1200;
  const H = 30;
  const Y = 15;
  const rand = seededRandom(`divider:${profile.login}`);

  let dust = '';
  for (let x = 6; x < W; x += 9) {
    const r = (0.5 + rand()).toFixed(1);
    const o = (0.12 + rand() * 0.45).toFixed(2);
    const y = (Y + (rand() - 0.5) * 5).toFixed(1);
    dust += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.fg}" fill-opacity="${o}"/>`;
  }
  let bright = '';
  for (let i = 0; i < 9; i += 1) {
    const x = Math.round(60 + rand() * (W - 120));
    bright += `<circle class="tw" style="animation-delay:${(rand() * 4).toFixed(1)}s" cx="${x}" cy="${Y}" r="1.9" fill="${c.diskHi}"/>`;
  }
  const star = (path, dur, begin, dir, opacity) => `<g opacity="${opacity}"><animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite" calcMode="linear" keyPoints="0;1;1" keyTimes="0;0.6;1" path="${path}"/><line x1="0" y1="0" x2="${dir * 150}" y2="0" stroke="url(#${dir < 0 ? 'tailL' : 'tailR'})" stroke-width="2.4" stroke-linecap="round"/><circle r="9" fill="${c.diskMid}" fill-opacity="0.3"/><circle r="3" fill="${c.fg}"/></g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="">
<style>.tw{animation:twinkle 3.6s ease-in-out infinite}@keyframes twinkle{0%,100%{opacity:1}50%{opacity:.2}}${REDUCED}</style>
<defs>
  <linearGradient id="tailL" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="-150" y2="0"><stop offset="0" stop-color="${c.fg}" stop-opacity="0.95"/><stop offset="1" stop-color="${c.diskMid}" stop-opacity="0"/></linearGradient>
  <linearGradient id="tailR" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="150" y2="0"><stop offset="0" stop-color="${c.fg}" stop-opacity="0.95"/><stop offset="1" stop-color="${c.diskMid}" stop-opacity="0"/></linearGradient>
</defs>
<line x1="0" y1="${Y}" x2="${W}" y2="${Y}" stroke="${c.faint}" stroke-opacity="0.5"/>
${dust}${bright}
${star(`M-30 ${Y} L${W + 30} ${Y}`, 13, 1, -1, 1)}
${star(`M${W + 30} ${Y} L-30 ${Y}`, 19, 6, 1, 0.65)}
</svg>`;
}
