// Singularity — cinematic sci-fi artwork.
//
// Hero: a black hole whose accretion disk is built from your contributions — one particle per day,
// brighter for busier days. The disk is a flat ring of particles inside a squashed, tilted group;
// rotating the inner group makes the particles orbit along the ellipse. Three radial bands spin at
// different speeds (inner fastest, as in a real Keplerian disk), and a horizontal mask brightens the
// approaching side (Doppler beaming). The back half of the disk is drawn behind the shadow and the
// front half in front of it.
//
// Light theme is a photographic negative plate (how sky surveys were printed): ink stars, ink disk,
// a white hole.
//
// Same rules as Shōnen: CSS keyframes only, the un-animated state is the final frame, at most two
// loops per image, and prefers-reduced-motion stops everything.

import { seededRandom } from '../../lib/random';
import { escapeXml, monthlySeries } from '../pulsar/art';

const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
const THIN = "'Helvetica Neue', 'Segoe UI', ui-sans-serif, -apple-system, Helvetica, Arial, sans-serif";
const EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
const REDUCED = '@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }';
const TAU = Math.PI * 2;
const r1 = (n) => Math.round(n * 10) / 10;

export const THEMES = {
  dark: {
    bg: '#04050a',
    fg: '#f4f1ea',
    muted: '#b8bed0',
    hud: '#ffb257',
    faint: '#1b2231',
    bar: '#000000',
    barText: '#f1f3f9',
    shadow: '#000000',
    diskLo: '#8a5527',
    diskMid: '#ffb257',
    diskHi: '#fff4e2',
    halo: '#ffc47a',
    haze: '#ff9a45',
    hazeOpacity: 0.16,
    star: '#ffffff',
    planet: '#05060b',
  },
  light: {
    bg: '#f3f1ec',
    fg: '#14161c',
    muted: '#5a6070',
    hud: '#0b5cad',
    faint: '#d6d9df',
    bar: '#0c0d10',
    barText: '#d3d6dd',
    shadow: '#f3f1ec',
    diskLo: '#a29b8e',
    diskMid: '#3d3832',
    diskHi: '#0c0b0a',
    halo: '#2a2723',
    haze: '#14161c',
    hazeOpacity: 0.07,
    star: '#14161c',
    planet: '#e4e1d9',
  },
};

export function roman(n) {
  const table = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  let v = Math.max(1, Math.floor(n));
  for (const [value, sym] of table) while (v >= value) (out += sym), (v -= value);
  return out;
}

export function missionNumbers(profile) {
  const days = profile.contributions?.days || [];
  let streak = 0;
  let run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    streak = Math.max(streak, run);
  }
  return {
    total: profile.contributions?.total || 0,
    active: days.filter((d) => d.count > 0).length,
    streak,
    years: Math.max(1, new Date().getFullYear() - (profile.joinedYear || new Date().getFullYear())),
    stars: profile.totalStars ?? (profile.repos || []).reduce((sum, r) => sum + (r.stars || 0), 0),
    followers: profile.followers || 0,
  };
}

const fmt = (n) => n.toLocaleString('en-US');

// ---------------------------------------------------------------------------
// 1. Hero — the black hole
// ---------------------------------------------------------------------------

export function heroSvg(profile, themeName, { missionName }) {
  const c = THEMES[themeName];
  const W = 1200;
  const H = 760;
  const BAR = 56;
  const cx = 600;
  const cy = 300;
  const TILT = -7;
  const SQUASH = 0.19;
  const Rs = 100; // shadow radius
  const Rin = 140;
  const Rout = 400;
  const rand = seededRandom(`singularity:${profile.login}`);
  const n = missionNumbers(profile);

  // Starfield; every ninth star twinkles (loop 1 of 2).
  let stars = '';
  let twinklers = '';
  for (let i = 0; i < 260; i++) {
    const x = r1(rand() * W);
    const y = r1(BAR + rand() * (H - BAR * 2));
    const big = rand() > 0.93;
    const r = r1(big ? 1.2 + rand() * 0.8 : 0.4 + rand() * 0.7);
    const o = (0.25 + rand() * 0.7).toFixed(2);
    if (i % 9 === 0) {
      twinklers += `<circle class="tw" style="animation-delay:${(rand() * 4).toFixed(2)}s" cx="${x}" cy="${y}" r="${r}" fill="${c.star}" opacity="${o}"/>`;
    } else {
      stars += `<circle cx="${x}" cy="${y}" r="${r}" opacity="${o}"/>`;
    }
  }

  // Accretion disk particles: one per day of contributions, plus seeded dust for body.
  const days = (profile.contributions?.days || []).slice(-365);
  const peak = Math.max(1, ...days.map((d) => d.count));
  const bands = ['', '', ''];
  const third = (Rout - Rin) / 3;
  const arc = (r, a, len, width, color, opacity) => {
    const x1 = r1(Math.cos(a) * r);
    const y1 = r1(Math.sin(a) * r);
    const x2 = r1(Math.cos(a + len) * r);
    const y2 = r1(Math.sin(a + len) * r);
    const band = r < Rin + third ? 0 : r < Rin + third * 2 ? 1 : 2;
    bands[band] += `<path d="M${x1} ${y1}A${r1(r)} ${r1(r)} 0 0 1 ${x2} ${y2}" stroke="${color}" stroke-width="${r1(width)}" stroke-opacity="${opacity}"/>`;
  };
  days.forEach((d, i) => {
    const v = d.count / peak;
    // Busy days sit nearer the hot inner edge.
    const r = Rin + (Rout - Rin) * Math.pow(rand(), 0.75 + v * 1.6);
    const a = (i / Math.max(1, days.length)) * TAU + rand() * 0.03;
    const color = v === 0 ? c.diskLo : v < 0.45 ? c.diskMid : c.diskHi;
    const opacity = v === 0 ? 0.35 : (0.55 + 0.45 * v).toFixed(2);
    arc(r, a, 0.05 + 0.12 * v + rand() * 0.05, 1.4 + 6 * Math.sqrt(v), color, opacity);
  });
  for (let i = 0; i < 160; i++) {
    arc(Rin + (Rout - Rin) * rand(), rand() * TAU, 0.03 + rand() * 0.08, 1 + rand() * 2, rand() > 0.5 ? c.diskMid : c.diskLo, (0.15 + rand() * 0.25).toFixed(2));
  }

  // Repository particles: every public repository adds one particle to the disk. It is drawn like the
  // brightest contribution days (a short, thick, near-white arc over a soft amber underlay), so it belongs
  // to the same family as the daily particles, bends along the orbit and spins with the disk. Its radius
  // and angle come from the repo name (a separate random stream, so the daily particles do not move) and
  // stay the same between runs; more stars gives a longer, thicker streak.
  (profile.repoPoints || []).slice(0, 80).forEach((repo) => {
    const rr = seededRandom(`repo:${repo.name}`);
    const r = Rin + (Rout - Rin) * (0.06 + 0.7 * rr());
    const a = rr() * TAU;
    const root = Math.sqrt(repo.stars || 0);
    const len = 0.26 + Math.min(0.14, root * 0.035);
    const w = 8 + Math.min(4, root * 1.1);
    arc(r, a, len, w * 1.9, c.diskMid, 0.4);
    arc(r, a + len * 0.15, len * 0.85, w, c.diskHi, 1);
  });

  // Continuous disk body: hottest and brightest at the inner edge, fading outward.
  let rings = '';
  for (let r = Rin; r <= Rout; r += 12) {
    const t = (r - Rin) / (Rout - Rin);
    const o = (0.55 * Math.pow(1 - t, 1.6) + 0.04).toFixed(3);
    rings += `<circle r="${r}" fill="none" stroke="${t < 0.18 ? c.diskHi : c.diskMid}" stroke-width="13" stroke-opacity="${o}"/>`;
  }
  rings += `<circle r="${Rin}" fill="none" stroke="${c.diskHi}" stroke-width="5" stroke-opacity="0.9"/>`;

  const disk = (clip) => `<g clip-path="url(#${clip})" mask="url(#doppler)">
  <g transform="translate(${cx} ${cy}) rotate(${TILT}) scale(1 ${SQUASH})">
    <use xlink:href="#rings" filter="url(#diskGlow)"/>
    <use xlink:href="#rings"/>
    <g class="spin s0"><use xlink:href="#b0"/></g>
    <g class="spin s1"><use xlink:href="#b1"/></g>
    <g class="spin s2"><use xlink:href="#b2"/></g>  </g>
</g>`;

  const name = (profile.name || profile.login).toUpperCase();
  const nameSize = Math.round(Math.max(26, Math.min(58, 1000 / (name.length * 1.05))));
  const tracking = nameSize * 0.42;
  const sub = String(profile.headline || '').slice(0, 96);
  const bottomLine = `${fmt(n.total)} CONTRIBUTIONS  ·  ${fmt(profile.publicRepos || 0)} REPOS  ·  ${fmt(n.active)} DAYS ACTIVE IN GRID  ·  MAX EXPLOIT STREAK ${n.streak} DAYS`;

  const css = `
.scene{animation:fade 2.4s ease-out both}
.bar-top{animation:barTop 1.4s ${EXPO} .15s both}
.bar-bot{animation:barBot 1.4s ${EXPO} .15s both}
.title{animation:rise 1.8s ${EXPO} 1.1s both}
.sub{animation:rise 1.6s ${EXPO} 1.6s both}
.hud{animation:fade 1.2s ease-out 2s both}
.spin{animation-name:spin;animation-timing-function:linear;animation-iteration-count:infinite}
.s0{animation-duration:28s}.s1{animation-duration:46s}.s2{animation-duration:76s}.s3{animation-duration:90s}.tw{animation:twinkle 4.5s ease-in-out infinite}
.n1{animation:drift1 22s ease-in-out infinite alternate}.n2{animation:drift2 28s ease-in-out infinite alternate}.n3{animation:drift3 18s ease-in-out infinite alternate}
.shoot{opacity:0;animation-timing-function:linear;animation-iteration-count:infinite}
.sa{animation-name:shootA}.sb{animation-name:shootB}.sc{animation-name:shootC}
.cursor{animation:blink 1.1s steps(1,end) infinite}
@keyframes fade{from{opacity:0}}
@keyframes barTop{from{transform:translateY(-${BAR}px)}}
@keyframes barBot{from{transform:translateY(${BAR}px)}}
@keyframes rise{from{opacity:0;transform:translateY(12px)}}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes twinkle{0%,100%{opacity:1}50%{opacity:.15}}
@keyframes drift1{to{transform:translate(170px,60px)}}
@keyframes drift2{to{transform:translate(-150px,-55px)}}
@keyframes drift3{to{transform:translate(110px,48px)}}
@keyframes shootA{0%{opacity:0;transform:translate(0,0)}1%{opacity:1}6%{opacity:1;transform:translate(520px,226px)}7%,100%{opacity:0;transform:translate(560px,243px)}}
@keyframes shootB{0%{opacity:0;transform:translate(0,0)}1%{opacity:1}5%{opacity:1;transform:translate(420px,182px)}6%,100%{opacity:0;transform:translate(450px,195px)}}
@keyframes shootC{0%{opacity:0;transform:translate(0,0)}1%{opacity:1}6%{opacity:1;transform:translate(470px,204px)}7%,100%{opacity:0;transform:translate(505px,219px)}}
@keyframes blink{0%,49%{fill-opacity:1}50%,100%{fill-opacity:0}}
${REDUCED}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(`${profile.name || profile.login} — ${profile.headline || ''}. A black hole whose accretion disk is made of ${fmt(n.total)} contributions, one particle per day.`)}">
<style>${css}</style>
<defs>
  <clipPath id="frame"><rect width="${W}" height="${H}" rx="16"/></clipPath>
  <clipPath id="back"><rect x="-800" y="${cy - 1400}" width="2800" height="1400" transform="rotate(${TILT} ${cx} ${cy})"/></clipPath>
  <clipPath id="front"><rect x="-800" y="${cy}" width="2800" height="1400" transform="rotate(${TILT} ${cx} ${cy})"/></clipPath>
  <linearGradient id="dop" gradientUnits="userSpaceOnUse" x1="${cx - Rout}" y1="0" x2="${cx + Rout}" y2="0">
    <stop offset="0" stop-color="#fff"/><stop offset="0.5" stop-color="#c4c4c4"/><stop offset="1" stop-color="#4a4a4a"/>
  </linearGradient>
  <mask id="doppler" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#dop)"/></mask>
  <radialGradient id="haze" cx="${cx}" cy="${cy}" r="540" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${c.haze}" stop-opacity="${c.hazeOpacity}"/><stop offset="1" stop-color="${c.haze}" stop-opacity="0"/>
  </radialGradient>
  <filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>
  <filter id="diskGlow" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="14 3"/></filter>
  <radialGradient id="neb1"><stop offset="0" stop-color="${c.haze}" stop-opacity="0.32"/><stop offset="1" stop-color="${c.haze}" stop-opacity="0"/></radialGradient>
  <radialGradient id="neb2"><stop offset="0" stop-color="#7a3f6b" stop-opacity="0.4"/><stop offset="1" stop-color="#7a3f6b" stop-opacity="0"/></radialGradient>
  <radialGradient id="neb3"><stop offset="0" stop-color="${c.diskLo}" stop-opacity="0.42"/><stop offset="1" stop-color="${c.diskLo}" stop-opacity="0"/></radialGradient>
  <linearGradient id="shootTail" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="-120" y2="-52">
    <stop offset="0" stop-color="${c.fg}" stop-opacity="0.95"/><stop offset="1" stop-color="${c.diskMid}" stop-opacity="0"/>
  </linearGradient>
  <g id="rings">${rings}</g>
  <g id="b0" fill="none" stroke-linecap="round">${bands[0]}</g>
  <g id="b1" fill="none" stroke-linecap="round">${bands[1]}</g>
  <g id="b2" fill="none" stroke-linecap="round">${bands[2]}</g></defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="${c.bg}"/>
  <g class="scene">
    <rect width="${W}" height="${H}" fill="url(#haze)"/>
    <!-- Nebula: three soft clouds that drift slowly behind everything else, each on its own period. -->
    <g aria-hidden="true">
      <ellipse class="n1" cx="${cx - 330}" cy="${cy - 70}" rx="380" ry="200" fill="url(#neb1)"/>
      <ellipse class="n2" cx="${cx + 390}" cy="${cy + 140}" rx="340" ry="180" fill="url(#neb2)"/>
      <ellipse class="n3" cx="${cx + 40}" cy="${cy - 190}" rx="430" ry="150" fill="url(#neb3)"/>
    </g>
    <g fill="${c.star}">${stars}</g>
    ${twinklers}
    <!-- Shooting stars: each streaks across for about a second and then stays dark for a long while. The three
         have different cycle lengths (23 s, 31 s, 41 s) so they never fall into a rhythm. -->
    <g aria-hidden="true">
      ${[[110, 118, 0, 'a', 11, 2], [720, 96, 0, 'b', 14, 6], [1090, 150, 1, 'c', 17, 9], [380, 60, 0, 'c', 9, 4], [900, 230, 1, 'a', 13, 1], [40, 300, 0, 'b', 19, 8], [1150, 320, 1, 'b', 12, 5], [560, 180, 0, 'a', 16, 12]]
        .map(([x, y, m, k, dur, delay]) => `<g transform="translate(${x} ${y})${m ? ' scale(-1 1)' : ''}"><g class="shoot s${k}" style="animation-duration:${dur}s;animation-delay:${delay}s"><line x1="0" y1="0" x2="-120" y2="-52" stroke="url(#shootTail)" stroke-width="2.6" stroke-linecap="round"/><circle r="3" fill="${c.fg}"/></g></g>`)
        .join('\n      ')}
    </g>
    <g mask="url(#doppler)">
      <!-- Gravitational lensing: the far side of the disk is bent into a thick band over the top
           of the shadow and a thin one beneath it. -->
      <g clip-path="url(#back)">
        <ellipse cx="${cx}" cy="${cy}" rx="${Rs * 1.5}" ry="${Rs * 1.4}" fill="none" stroke="${c.halo}" stroke-width="40" stroke-opacity="0.55" filter="url(#glow)"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${Rs * 1.42}" ry="${Rs * 1.32}" fill="none" stroke="${c.halo}" stroke-width="14" stroke-opacity="0.8"/>
        <ellipse cx="${cx}" cy="${cy}" rx="${Rs * 1.33}" ry="${Rs * 1.22}" fill="none" stroke="${c.diskHi}" stroke-width="3" stroke-opacity="0.9"/>
      </g>
      <ellipse cx="${cx}" cy="${cy}" rx="${Rs * 1.3}" ry="${Rs * 1.2}" fill="none" stroke="${c.halo}" stroke-width="10" stroke-opacity="0.35" filter="url(#glow)"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${Rs * 1.24}" ry="${Rs * 1.15}" fill="none" stroke="${c.halo}" stroke-width="3" stroke-opacity="0.75"/>
    </g>
    ${disk('back')}    <circle cx="${cx}" cy="${cy}" r="${Rs}" fill="${c.shadow}"/>
    <circle cx="${cx}" cy="${cy}" r="${Rs * 1.05}" fill="none" stroke="${c.diskHi}" stroke-width="2" stroke-opacity="0.9" mask="url(#doppler)"/>
    ${disk('front')}    <text class="title" x="${cx + tracking / 2}" y="568" text-anchor="middle" font-family="${THIN}" font-weight="600" font-size="${nameSize}" letter-spacing="${r1(tracking)}" fill="${c.fg}">${escapeXml(name)}</text>
    ${sub ? `<text class="sub" x="${cx + 2}" y="612" text-anchor="middle" font-family="${THIN}" font-weight="500" font-size="20" letter-spacing="2" fill="${c.muted}">${escapeXml(sub)}<tspan class="cursor" dx="4" fill="${c.hud}">_</tspan></text>` : ''}
  </g>
  <g class="bar-top">
    <rect width="${W}" height="${BAR}" fill="${c.bar}"/>
    <g class="hud" font-family="${MONO}" font-size="15" font-weight="700" letter-spacing="2.5" fill="${c.barText}">
      <text x="36" y="34">CLASSIFIED  //  EYES ONLY  //  ${escapeXml(missionName.toUpperCase())}</text>
      <text x="${W - 36}" y="34" text-anchor="end">T+ ${n.years} YR  ·  @${escapeXml(profile.login.toUpperCase())}</text>
    </g>
  </g>
  <g class="bar-bot">
    <rect y="${H - BAR}" width="${W}" height="${BAR}" fill="${c.bar}"/>
    <text class="hud" x="${cx}" y="${H - 23}" text-anchor="middle" font-family="${MONO}" font-size="15" font-weight="700" letter-spacing="2" fill="${c.barText}">${bottomLine}</text>
  </g>
</g>
</svg>`;
}

// ---------------------------------------------------------------------------
// 2. Mission telemetry — HUD panel
// ---------------------------------------------------------------------------

function brackets(x, y, w, h, s, color) {
  return `<path d="M${x} ${y + s}V${y}H${x + s} M${x + w - s} ${y}H${x + w}V${y + s} M${x + w} ${y + h - s}V${y + h}H${x + w - s} M${x + s} ${y + h}H${x}V${y + h - s}" fill="none" stroke="${color}" stroke-width="1.5"/>`;
}

function closedCurve(points, samples = 10) {
  // Catmull-Rom through the points, closed, sampled to a polyline so we know its length.
  const out = [];
  const N = points.length;
  for (let i = 0; i < N; i++) {
    const p0 = points[(i - 1 + N) % N];
    const p1 = points[i];
    const p2 = points[(i + 1) % N];
    const p3 = points[(i + 2) % N];
    for (let s = 0; s < samples; s++) {
      const t = s / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  let length = 0;
  for (let i = 0; i < out.length; i++) {
    const [ax, ay] = out[i];
    const [bx, by] = out[(i + 1) % out.length];
    length += Math.hypot(bx - ax, by - ay);
  }
  return { d: `M${out.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L')} Z`, length: Math.ceil(length) };
}

export function telemetrySvg(profile, themeName, { missionName }) {
  const c = THEMES[themeName];
  const W = 1200;
  const n = missionNumbers(profile);
  const days = profile.contributions?.days || [];
  const all = profile.allTime?.days?.length ? profile.allTime.days : days;
  const allTotal = profile.allTime ? profile.allTime.total : n.total;
  // Each animated effect can be switched off in profile.config.json ("effects": { "snake": false, ... }).
  const fx = { snake: false, constellation: true, replay: true, ripples: true, satellite: true, flame: true, comet: true, ...(profile.effects || {}) };

  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dateText = (iso, year = false) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-').map(Number);
    return `${MON[m - 1]} ${d}${year ? `, ${y}` : ''}`;
  };

  // Streaks over the whole history: the longest run, and the run that ends today (or yesterday, since today
  // may not have a contribution yet).
  const runs = (list) => {
    let longest = { len: 0 };
    let run = 0;
    let start = null;
    for (const d of list) {
      if (d.count > 0) {
        if (!run) start = d.date;
        run += 1;
        if (run > longest.len) longest = { len: run, start, end: d.date };
      } else {
        run = 0;
      }
    }
    let i = list.length - 1;
    if (i >= 0 && list[i].count === 0) i -= 1;
    let cur = { len: 0 };
    if (i >= 0 && list[i].count > 0) {
      let j = i;
      while (j >= 0 && list[j].count > 0) j -= 1;
      cur = { len: i - j, start: list[j + 1].date, end: list[i].date };
    }
    return { longest, cur };
  };
  const { longest, cur } = runs(all);
  const range = (s) => (s.len ? (s.start === s.end ? dateText(s.start, true) : `${dateText(s.start)} – ${dateText(s.end, true)}`) : 'NO STREAK YET');
  const since = profile.createdAt ? `${dateText(profile.createdAt, true)} – PRESENT` : 'LAST 12 MONTHS';

  // Streak card: total, current streak (ring with a flame) and longest streak.
  const big = (cx, value, label, sub, delay) => `<g class="ro" style="animation-delay:${delay}s">
  <text x="${cx}" y="192" text-anchor="middle" font-family="${THIN}" font-weight="700" font-size="78" fill="${c.hud}">${value}</text>
  <text x="${cx}" y="244" text-anchor="middle" font-family="${MONO}" font-size="17" font-weight="700" letter-spacing="2" fill="${c.fg}">${label}</text>
  <text x="${cx}" y="270" text-anchor="middle" font-family="${MONO}" font-size="15" font-weight="700" letter-spacing="1" fill="${c.muted}">${sub}</text>
</g>`;
  // A small satellite circles the streak ring; the longer the streak, the faster it goes (16 s a lap at
  // zero, down to 4 s from twelve days).
  const satDur = Math.max(4, 16 - Math.min(cur.len, 12));
  const satellite = fx.satellite
    ? `<g><animateTransform attributeName="transform" type="rotate" from="0 600 154" to="360 600 154" dur="${satDur}s" repeatCount="indefinite"/><circle cx="656" cy="154" r="17" fill="${c.diskMid}" fill-opacity="0.3"/><circle cx="656" cy="154" r="8" fill="${c.diskHi}"/></g>`
    : '';
  const flame = 'M12 2c.8 3.2-1.2 4.6-2.6 6.6C8 10.6 7 12.1 7 14a5 5 0 0 0 10 0c0-2-1.1-3.4-2.1-4.6-.1 1.6-.9 2.6-1.9 2.9C13.700 9.200 13.100 5.200 12 2z';
  const streakCard = `${big(226, fmt(allTotal), 'TOTAL CONTRIBUTIONS', since, 0.4)}
<g class="ro" style="animation-delay:0.5s">
  <circle class="ring" cx="600" cy="154" r="56" fill="none" stroke="${c.hud}" stroke-width="6" stroke-linecap="round"/>
  <circle cx="600" cy="98" r="28" fill="${c.bg}"/>
  <g${fx.flame ? ' class="flame"' : ''}>
    <path transform="translate(571 62) scale(2.4)" d="${flame}" fill="url(#flameGrad)"/>
    <path class="flame2" transform="translate(588 84) scale(1.0)" d="${flame}" fill="url(#flameCore)" style="transform-box:fill-box;transform-origin:center bottom"/>
  </g>
  <text x="600" y="176" text-anchor="middle" font-family="${THIN}" font-weight="700" font-size="60" fill="${c.fg}">${fmt(cur.len)}</text>
  <text x="600" y="244" text-anchor="middle" font-family="${MONO}" font-size="17" font-weight="700" letter-spacing="2" fill="${c.hud}">CURRENT STREAK</text>
  <text x="600" y="270" text-anchor="middle" font-family="${MONO}" font-size="15" font-weight="700" letter-spacing="1" fill="${c.muted}">${range(cur)}</text>
${satellite}</g>
${big(974, fmt(longest.len), 'LONGEST STREAK', range(longest), 0.6)}`;

  // Contribution grid: one square per day, one column per week (Sunday first), five brightness levels.
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const level = (count) => (count <= 0 ? 0 : Math.min(4, Math.ceil((count / maxDay) * 4)));
  const LV = [[c.faint, 0.9], [c.diskLo, 1], [c.diskMid, 0.6], [c.diskMid, 1], [c.diskHi, 1]];
  const weekday = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  };
  let col = -1;
  const grid = days.map((d, i) => {
    const wd = weekday(d.date);
    if (i === 0 || wd === 0) col += 1;
    return { ...d, col, wd };
  });
  const cols = col + 1;
  const pitch = Math.floor((W - 80) / Math.max(cols, 53));
  const cell = pitch - 4;
  const gx = 40 + Math.round((W - 80 - cols * pitch) / 2);
  const gy = 372;
  const gridBottom = gy + 7 * pitch;
  const byCol = new Map();
  grid.forEach((g) => byCol.set(g.col, [...(byCol.get(g.col) || []), g]));
  const todayIso = grid.length ? grid[grid.length - 1].date : '';
  const cells = [...byCol]
    .map(
      ([cIdx, list]) =>
        `<g class="col" style="animation-delay:${(0.5 + cIdx * 0.012).toFixed(3)}s">${list
          .map((g, k) => {
            const lv = level(g.count);
            const [fill, op] = LV[lv];
            const today = g.date === todayIso;
            const twinkle = lv >= 2 ? ` class="lit" style="animation-delay:${((cIdx * 7 + k * 3) % 36) / 10}s"` : '';
            return `<rect${twinkle} x="${gx + g.col * pitch}" y="${gy + g.wd * pitch}" width="${cell}" height="${cell}" rx="3" fill="${fill}" fill-opacity="${op}"${today ? ` stroke="${c.fg}" stroke-width="1.5"` : ''}/>`;
          })
          .join('')}</g>`
    )
    .join('');

  // A serpent of starlight slithers across the grid in a wave. Its path is one closed loop: left to right along
  // a sine wave, then back along the mirrored wave (they meet at both ends because the wave has a whole number
  // of half-periods, so the loop has no seam). Every segment follows that path a little behind the one in front
  // (a negative `begin` puts it that far ahead of the tail), the body tapers towards the tail, and
  // `rotate="auto"` turns the head to face the way it is going.
  const gridW = cols * pitch;
  const center = (g) => [gx + g.col * pitch + cell / 2, gy + g.wd * pitch + cell / 2];

  // Constellation: every active day is joined to its active neighbours (same column below, next column at the
  // same row and the two diagonals), so runs of activity become star charts.
  const byKey = new Map(grid.map((g) => [`${g.col},${g.wd}`, g]));
  let links = '';
  if (fx.constellation) {
    for (const g of grid) {
      if (g.count <= 0) continue;
      for (const [dc, dw] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const o = byKey.get(`${g.col + dc},${g.wd + dw}`);
        if (o && o.count > 0) {
          const [x1, y1] = center(g);
          const [x2, y2] = center(o);
          links += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
        }
      }
    }
    if (links) links = `<g stroke="${c.diskMid}" stroke-opacity="0.5" stroke-width="1.4" stroke-linecap="round">${links}</g>`;
  }

  // Gravitational waves: rings spread from the busiest day, three at a time, and fade as they grow.
  let ripples = '';
  if (fx.ripples && grid.some((g) => g.count > 0)) {
    const peakDay = grid.reduce((b, g) => (g.count >= b.count ? g : b), grid[0]);
    const [rx, ry] = center(peakDay);
    ripples = [0, 2.3, 4.6]
      .map((d) => `<circle class="rip" cx="${r1(rx)}" cy="${r1(ry)}" r="${r1(cell * 0.6)}" fill="none" stroke="${c.diskHi}" stroke-width="1" style="animation-delay:${d}s"/>`)
      .join('');
  }

  // Replay: a scanning beam sweeps the grid left to right, and each active day flashes as the beam passes it,
  // as if the year were being read back. One sweep takes 5.5 s out of a 17 s cycle.
  const SWEEP = 3.6;
  const PERIOD = 7;
  let flashes = '';
  let beam = '';
  if (fx.replay) {
    flashes = grid
      .filter((g) => g.count > 0)
      .map((g) => `<rect class="fl" x="${gx + g.col * pitch}" y="${gy + g.wd * pitch}" width="${cell}" height="${cell}" rx="3" fill="${c.fg}" style="animation-delay:${((g.col / cols) * SWEEP).toFixed(2)}s"/>`)
      .join('');
    beam = `<g class="beam"><rect x="${gx - 90}" y="${gy - 6}" width="90" height="${7 * pitch + 8}" fill="url(#beamTrail)"/><rect x="${gx - 3}" y="${gy - 6}" width="3.5" height="${7 * pitch + 8}" fill="${c.diskHi}"/></g>`;
  }

  // A rare comet crosses the grid diagonally (about two seconds in every 37).
  const cdx = gridW + 140;
  const cdy = 7 * pitch + 90;
  const clen = Math.hypot(cdx, cdy);
  const ctx = r1((-cdx / clen) * 170);
  const cty = r1((-cdy / clen) * 170);
  const comet = fx.comet
    ? `<g transform="translate(${gx - 70} ${gy - 50})"><g class="comet"><line x1="0" y1="0" x2="${ctx}" y2="${cty}" stroke="url(#cometTail)" stroke-width="3" stroke-linecap="round"/><circle r="11" fill="${c.diskMid}" fill-opacity="0.3"/><circle r="3.6" fill="${c.fg}"/></g></g>`
    : '';

  // The route has no pattern to spot: waypoints are drawn at random (from a seed made of the login, so the
  // route is the same every time the picture is rebuilt), first left to right and then back, each one
  // wandering up or down from the last by a random amount, then joined by a smooth closed curve.
  const sx0 = gx + cell / 2;
  const sx1 = gx + (cols - 1) * pitch + cell / 2;
  const span = sx1 - sx0;
  const yLo = gy + cell / 2 + 6;
  const yHi = gy + 6 * pitch + cell / 2 - 6;
  const wander = seededRandom(`snake:${profile.login}`);
  const WAYS = 15;
  let wy = (yLo + yHi) / 2;
  const nextY = () => {
    wy = Math.min(yHi, Math.max(yLo, wy + (wander() - 0.5) * 2 * 80));
    return wy;
  };
  const way = [];
  for (let round = 0; round < 2; round += 1) {
    for (let i = 0; i < WAYS; i += 1) {
      const edge = i === 0 || i === WAYS - 1;
      way.push([sx0 + (span * i) / (WAYS - 1) + (edge ? 0 : (wander() - 0.5) * 50), nextY()]);
    }
    for (let i = WAYS - 2; i > 0; i -= 1) way.push([sx0 + (span * i) / (WAYS - 1) + (wander() - 0.5) * 50, nextY()]);
  }
  const { d: snakePath, length: pathLen } = closedCurve(way, 14);
  const SEG = 26;
  const GAP = 6.5;
  const LAP = r1(pathLen / 150);
  const lag = (GAP / pathLen) * LAP;
  const snake = !fx.snake ? '' : Array.from({ length: SEG }, (_, i) => {
    const t = i / (SEG - 1);
    const radius = i === 0 ? 9.5 : Math.max(2.4, 8 - i * 0.26);
    const op = i === 0 ? 1 : Math.max(0.35, 0.95 - t * 0.6);
    const begin = i === SEG - 1 ? '0s' : `-${((SEG - 1 - i) * lag).toFixed(3)}s`;
    const fill = i === 0 ? c.diskHi : t < 0.5 ? c.hud : c.diskMid;
    const headParts =
      i === 0
        ? `<circle r="18" fill="${c.diskMid}" fill-opacity="0.22"/><circle r="${r1(radius)}" fill="${fill}"/><circle cx="4.5" cy="-4" r="1.9" fill="${c.bg}"/><circle cx="4.5" cy="4" r="1.9" fill="${c.bg}"/>`
        : `<circle r="${r1(radius)}" fill="${fill}" fill-opacity="${op.toFixed(2)}"/>`;
    return `<g><animateMotion dur="${LAP}s" begin="${begin}" repeatCount="indefinite" rotate="auto"><mpath xlink:href="#snakePath"/></animateMotion>${headParts}</g>`;
  })
    .reverse()
    .join('');

  // Month labels above the grid; a label is dropped when the next month starts less than 3 columns later.
  const monthMarks = [];
  let prevMonth = -1;
  for (const [cIdx, list] of byCol) {
    const m = Number(list[0].date.slice(5, 7)) - 1;
    if (m !== prevMonth) {
      prevMonth = m;
      monthMarks.push({ cIdx, m });
    }
  }
  const monthLabels = monthMarks
    .filter((mk, i) => !monthMarks[i + 1] || monthMarks[i + 1].cIdx - mk.cIdx >= 3)
    .map((mk) => `<text x="${gx + mk.cIdx * pitch}" y="${gy - 14}" font-family="${MONO}" font-size="14" font-weight="700" letter-spacing="1" fill="${c.muted}">${MON[mk.m]}</text>`)
    .join('');

  const legendY = gridBottom + 30;
  const legendX = W - 40 - 56 - 5 * pitch;
  const legend = `<text x="${legendX - 8}" y="${legendY + cell - 2}" text-anchor="end" font-family="${MONO}" font-size="14" font-weight="700" letter-spacing="1" fill="${c.muted}">LESS</text>${LV.map(
    ([fill, op], k) => `<rect x="${legendX + k * pitch}" y="${legendY}" width="${cell}" height="${cell}" rx="3" fill="${fill}" fill-opacity="${op}"/>`
  ).join('')}<text x="${W - 40}" y="${legendY + cell - 2}" text-anchor="end" font-family="${MONO}" font-size="14" font-weight="700" letter-spacing="1" fill="${c.muted}">MORE</text>`;

  // Row of figures under the grid.
  const dividerY = legendY + cell + 24;
  const valY = dividerY + 56;
  const labY = valY + 28;
  const figures = [
    ['STARS', fmt(n.stars)],
    ['COMMITS · 12 MO', fmt(profile.commits || 0)],
    ['PULL REQUESTS', fmt(profile.pullRequests || 0)],
    ['ISSUES', fmt(profile.issues || 0)],
    ['PUBLIC REPOS', fmt(profile.publicRepos || 0)],
    ['CONTRIBUTED TO', fmt(profile.contributedTo || 0)],
  ];
  const fw = (W - 80) / figures.length;
  const figureSvg = figures
    .map(([label, value], k) => {
      const x = 40 + k * fw;
      return `<g class="ro" style="animation-delay:${(1 + k * 0.08).toFixed(2)}s">${k ? `<line x1="${r1(x - 14)}" y1="${valY - 40}" x2="${r1(x - 14)}" y2="${labY + 8}" stroke="${c.faint}"/>` : ''}
  <text x="${r1(x)}" y="${valY}" font-family="${THIN}" font-weight="700" font-size="44" fill="${c.fg}">${value}</text>
  <text x="${r1(x)}" y="${labY}" font-family="${MONO}" font-size="15" font-weight="700" letter-spacing="1.2" fill="${c.muted}">${label}</text>
</g>`;
    })
    .join('');

  // Top languages: only when GitHub has found code in the public repositories.
  const langs = (profile.languages || []).filter((l) => l.share >= 0.01).slice(0, 6);
  let languages = '';
  let H = labY + 34;
  if (langs.length) {
    const ly = labY + 28;
    const sw = W - 80;
    const shades = [1, 0.74, 0.54, 0.4, 0.28, 0.18];
    let cursor = 40;
    const parts = langs
      .map((l, k) => {
        const w = Math.max(4, l.share * sw - 3);
        const seg = `<g class="seg" style="animation-delay:${(1.2 + k * 0.1).toFixed(2)}s"><rect x="${r1(cursor)}" y="${ly + 40}" width="${r1(w)}" height="12" rx="3" fill="${c.hud}" fill-opacity="${shades[k] ?? 0.12}"/>${
          w > 120
            ? `<text x="${r1(cursor)}" y="${ly + 78}" font-family="${MONO}" font-size="15" font-weight="700" letter-spacing="1" fill="${c.fg}">${escapeXml(l.name.toUpperCase())} ${Math.round(l.share * 100)}%</text>`
            : ''
        }</g>`;
        cursor += w + 3;
        return seg;
      })
      .join('');
    languages = `<line x1="40" y1="${ly - 6}" x2="${W - 40}" y2="${ly - 6}" stroke="${c.faint}"/><text x="40" y="${ly + 24}" font-family="${MONO}" font-size="15" font-weight="700" letter-spacing="3" fill="${c.muted}">TOP LANGUAGES</text>${parts}`;
    H = ly + 104;
  }
  // The README heading above the image already names the panel, so the image has no title bar of its own:
  // everything moves up by SHIFT and the image gets that much shorter.
  const SHIFT = 52;
  H -= SHIFT;

  const css = `
.frame{animation:fade 1s ease-out both}
.ro{animation:rise .9s ${EXPO} both}
.col{animation:fade .6s ease-out both}
.lit{animation:twinkle 3.6s ease-in-out infinite}
.flame{transform-box:fill-box;transform-origin:center bottom;animation:flicker 1.7s ease-in-out infinite}
.rip{opacity:0;transform-box:fill-box;transform-origin:center;animation:ripple 7s ease-out infinite}
.flame2{animation:flicker2 .9s ease-in-out infinite}
.fl{opacity:0;transform-box:fill-box;transform-origin:center;animation:flash ${PERIOD}s linear infinite}
.shoot{opacity:0;animation-timing-function:linear;animation-iteration-count:infinite}
.sa{animation-name:shootA}.sb{animation-name:shootB}.sc{animation-name:shootC}
@keyframes shootA{0%{opacity:0;transform:translate(0,0)}1%{opacity:1}6%{opacity:1;transform:translate(520px,226px)}7%,100%{opacity:0;transform:translate(560px,243px)}}
@keyframes shootB{0%{opacity:0;transform:translate(0,0)}1%{opacity:1}5%{opacity:1;transform:translate(420px,182px)}6%,100%{opacity:0;transform:translate(450px,195px)}}
@keyframes shootC{0%{opacity:0;transform:translate(0,0)}1%{opacity:1}6%{opacity:1;transform:translate(470px,204px)}7%,100%{opacity:0;transform:translate(505px,219px)}}
@keyframes flicker2{0%,100%{transform:scale(1,1)}33%{transform:scale(.85,1.18)}66%{transform:scale(1.12,.9)}}
.beam{opacity:0;animation:sweep ${PERIOD}s linear infinite}
.comet{opacity:0;animation:cometPass 37s linear 9s infinite}
.ring{stroke-dasharray:352;animation:ring 1.4s ease-out .4s both}
.seg{transform-box:fill-box;transform-origin:left center;animation:growX 1s ${EXPO} both}
@keyframes fade{from{opacity:0}}
@keyframes rise{from{opacity:0;transform:translateY(10px)}}
@keyframes twinkle{0%,100%{opacity:1}50%{opacity:.62}}
@keyframes ring{from{stroke-dashoffset:352}}
@keyframes growX{from{transform:scaleX(0)}}
@keyframes flicker{0%,100%{transform:scale(1,1)}25%{transform:scale(1.07,.93)}50%{transform:scale(.95,1.09)}75%{transform:scale(1.04,.97)}}
@keyframes ripple{0%{opacity:.3;transform:scale(.6)}100%{opacity:0;transform:scale(5)}}
@keyframes flash{0%{opacity:0;transform:scale(1)}4%{opacity:1;transform:scale(2)}20%,100%{opacity:0;transform:scale(1)}}
@keyframes sweep{0%{opacity:0;transform:translateX(0)}1%{opacity:1}${((SWEEP / PERIOD) * 100).toFixed(2)}%{opacity:1;transform:translateX(${gridW}px)}${((SWEEP / PERIOD) * 100 + 1).toFixed(2)}%,100%{opacity:0;transform:translateX(${gridW}px)}}
@keyframes cometPass{0%{opacity:0;transform:translate(0,0)}1%{opacity:1}6%{opacity:1;transform:translate(${cdx}px,${cdy}px)}7%,100%{opacity:0;transform:translate(${cdx}px,${cdy}px)}}
${REDUCED}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(
    `GitHub stats: ${fmt(allTotal)} total contributions, current streak ${cur.len} days, longest streak ${longest.len} days. ${fmt(n.total)} contributions in the last 12 months, ${fmt(profile.commits || 0)} commits, ${fmt(profile.pullRequests || 0)} pull requests, ${fmt(profile.issues || 0)} issues, ${fmt(n.stars)} stars, ${fmt(profile.publicRepos || 0)} public repositories.`
  )}">
<style>${css}</style>
<defs>
  <path id="snakePath" d="${snakePath}" fill="none"/>
  <linearGradient id="beamTrail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c.hud}" stop-opacity="0"/><stop offset="1" stop-color="${c.hud}" stop-opacity="0.6"/></linearGradient>
  <linearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ff3d1f"><animate attributeName="stop-color" values="#ff3d1f;#ff7a1a;#ff3d1f" dur="1.3s" repeatCount="indefinite"/></stop>
    <stop offset="0.55" stop-color="#ff9a1f"><animate attributeName="stop-color" values="#ff9a1f;#ffc23d;#ff9a1f" dur="1.7s" repeatCount="indefinite"/></stop>
    <stop offset="1" stop-color="#ffe066"/>
  </linearGradient>
  <linearGradient id="flameCore" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd25a"/><stop offset="1" stop-color="#fffbe6"/></linearGradient>
  <linearGradient id="shootTail" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="-120" y2="-52"><stop offset="0" stop-color="${c.fg}" stop-opacity="0.95"/><stop offset="1" stop-color="${c.diskMid}" stop-opacity="0"/></linearGradient>
  <linearGradient id="cometTail" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${ctx}" y2="${cty}"><stop offset="0" stop-color="${c.fg}" stop-opacity="0.95"/><stop offset="1" stop-color="${c.diskMid}" stop-opacity="0"/></linearGradient>
</defs>
<g class="frame"><rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${c.bg}" stroke="${c.faint}"/></g>
<g transform="translate(0 ${-SHIFT})">
<g class="frame">
  <line x1="413" y1="92" x2="413" y2="278" stroke="${c.faint}"/>
  <line x1="787" y1="92" x2="787" y2="278" stroke="${c.faint}"/>
  <line x1="40" y1="302" x2="${W - 40}" y2="302" stroke="${c.faint}"/>
  <text x="40" y="332" font-family="${MONO}" font-size="15" font-weight="700" letter-spacing="3" fill="${c.muted}">CONTRIBUTIONS  ·  LAST 12 MONTHS</text>
  ${monthLabels}
  <line x1="40" y1="${dividerY}" x2="${W - 40}" y2="${dividerY}" stroke="${c.faint}"/>
</g>
${streakCard}
${cells}
${links}${ripples}${flashes}${beam}
${snake}
${comet}
${legend}
${figureSvg}
${languages}
</g>
<g aria-hidden="true">${[[70, 40, 0, 'a', 8, 1], [520, 24, 0, 'b', 11, 4], [1130, 60, 1, 'c', 9, 2], [820, 150, 1, 'a', 13, 6], [300, 190, 0, 'c', 10, 7]]
    .map(([x, y, m, k, dur, delay]) => `<g transform="translate(${x} ${y})${m ? ' scale(-1 1)' : ''}"><g class="shoot s${k}" style="animation-duration:${dur}s;animation-delay:${delay}s"><line x1="0" y1="0" x2="-120" y2="-52" stroke="url(#shootTail)" stroke-width="2.6" stroke-linecap="round"/><circle r="3" fill="${c.fg}"/></g></g>`)
    .join('')}</g>
</svg>`;
}

// ---------------------------------------------------------------------------
// 3. End of transmission — planet limb at sunrise
// ---------------------------------------------------------------------------

export function transmissionEndSvg(profile, themeName, { signoff, contact }) {
  const c = THEMES[themeName];
  const W = 1200;
  const H = 170;
  const css = `
.sun{transform-box:fill-box;transform-origin:center bottom;animation:sunrise 3.2s ${EXPO} .3s both}
.end{animation:rise 1.6s ${EXPO} .9s both}
@keyframes sunrise{from{opacity:0;transform:scale(.4,.2)}}
@keyframes rise{from{opacity:0;transform:translateY(8px)}}
${REDUCED}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="End of transmission. ${escapeXml(signoff)}">
<style>${css}</style>
<defs>
  <clipPath id="frame"><rect width="${W}" height="${H}" rx="14"/></clipPath>
  <radialGradient id="sun" cx="600" cy="134" r="420" gradientUnits="userSpaceOnUse" gradientTransform="translate(600 134) scale(1 0.32) translate(-600 -134)">
    <stop offset="0" stop-color="${c.diskHi}" stop-opacity="${themeName === 'dark' ? 0.95 : 0.35}"/><stop offset="0.25" stop-color="${c.diskMid}" stop-opacity="${themeName === 'dark' ? 0.45 : 0.12}"/><stop offset="1" stop-color="${c.diskMid}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="limb" x1="0" x2="1"><stop offset="0" stop-color="${c.hud}" stop-opacity="0"/><stop offset="0.5" stop-color="${c.hud}" stop-opacity="0.9"/><stop offset="1" stop-color="${c.hud}" stop-opacity="0"/></linearGradient>
</defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="${c.bg}"/>
  <ellipse class="sun" cx="600" cy="134" rx="420" ry="134" fill="url(#sun)"/>
  <circle cx="600" cy="${134 + 2400}" r="2400" fill="${c.planet}"/>
  <circle cx="600" cy="${134 + 2400}" r="2400" fill="none" stroke="url(#limb)" stroke-width="2"/>
  <g class="end" text-anchor="middle">
    <text x="${600 + 6}" y="62" font-family="${THIN}" font-weight="600" font-size="22" letter-spacing="12" fill="${c.fg}">END OF TRANSMISSION</text>
    <text x="600" y="90" font-family="${MONO}" font-size="11" letter-spacing="2.5" fill="${c.muted}">@${escapeXml(profile.login.toUpperCase())}  ·  ${escapeXml(signoff.toUpperCase())}</text>
    ${contact ? `<text x="600" y="116" font-family="${MONO}" font-size="12" font-weight="700" letter-spacing="2.5" fill="${c.hud}">SECURE CONTACT  ·  ${escapeXml(contact.toUpperCase())}</text>` : ''}
  </g>
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="none" stroke="${c.faint}"/>
</svg>`;
}
