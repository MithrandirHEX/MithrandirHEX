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
@keyframes fade{from{opacity:0}}
@keyframes barTop{from{transform:translateY(-${BAR}px)}}
@keyframes barBot{from{transform:translateY(${BAR}px)}}
@keyframes rise{from{opacity:0;transform:translateY(12px)}}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes twinkle{0%,100%{opacity:1}50%{opacity:.15}}
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
  <g id="rings">${rings}</g>
  <g id="b0" fill="none" stroke-linecap="round">${bands[0]}</g>
  <g id="b1" fill="none" stroke-linecap="round">${bands[1]}</g>
  <g id="b2" fill="none" stroke-linecap="round">${bands[2]}</g></defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="${c.bg}"/>
  <g class="scene">
    <rect width="${W}" height="${H}" fill="url(#haze)"/>
    <g fill="${c.star}">${stars}</g>
    ${twinklers}
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
    ${sub ? `<text class="sub" x="${cx + 2}" y="612" text-anchor="middle" font-family="${THIN}" font-weight="500" font-size="20" letter-spacing="2" fill="${c.muted}">${escapeXml(sub)}</text>` : ''}
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
  <text x="${cx}" y="190" text-anchor="middle" font-family="${THIN}" font-weight="700" font-size="68" fill="${c.hud}">${value}</text>
  <text x="${cx}" y="238" text-anchor="middle" font-family="${MONO}" font-size="15" font-weight="700" letter-spacing="2" fill="${c.fg}">${label}</text>
  <text x="${cx}" y="262" text-anchor="middle" font-family="${MONO}" font-size="13" font-weight="700" letter-spacing="1" fill="${c.muted}">${sub}</text>
</g>`;
  const flame = 'M12 2c.8 3.2-1.2 4.6-2.6 6.6C8 10.6 7 12.1 7 14a5 5 0 0 0 10 0c0-2-1.1-3.4-2.1-4.6-.1 1.6-.9 2.6-1.9 2.9C13.700 9.200 13.100 5.200 12 2z';
  const streakCard = `${big(226, fmt(allTotal), 'TOTAL CONTRIBUTIONS', since, 0.4)}
<g class="ro" style="animation-delay:0.5s">
  <circle class="ring" cx="600" cy="152" r="54" fill="none" stroke="${c.hud}" stroke-width="6" stroke-linecap="round"/>
  <circle cx="600" cy="98" r="17" fill="${c.bg}"/>
  <path transform="translate(587 84) scale(1.08)" d="${flame}" fill="${c.hud}"/>
  <text x="600" y="172" text-anchor="middle" font-family="${THIN}" font-weight="700" font-size="54" fill="${c.fg}">${fmt(cur.len)}</text>
  <text x="600" y="238" text-anchor="middle" font-family="${MONO}" font-size="15" font-weight="700" letter-spacing="2" fill="${c.hud}">CURRENT STREAK</text>
  <text x="600" y="262" text-anchor="middle" font-family="${MONO}" font-size="13" font-weight="700" letter-spacing="1" fill="${c.muted}">${range(cur)}</text>
</g>
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
  const gy = 354;
  const gridBottom = gy + 7 * pitch;
  const byCol = new Map();
  grid.forEach((g) => byCol.set(g.col, [...(byCol.get(g.col) || []), g]));
  const todayIso = grid.length ? grid[grid.length - 1].date : '';
  const cells = [...byCol]
    .map(
      ([cIdx, list]) =>
        `<g class="col" style="animation-delay:${(0.5 + cIdx * 0.012).toFixed(3)}s">${list
          .map((g) => {
            const [fill, op] = LV[level(g.count)];
            const today = g.date === todayIso;
            return `<rect x="${gx + g.col * pitch}" y="${gy + g.wd * pitch}" width="${cell}" height="${cell}" rx="3" fill="${fill}" fill-opacity="${op}"${today ? ` stroke="${c.fg}" stroke-width="1.5"` : ''}/>`;
          })
          .join('')}</g>`
    )
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
    .map((mk) => `<text x="${gx + mk.cIdx * pitch}" y="${gy - 12}" font-family="${MONO}" font-size="12" font-weight="700" letter-spacing="1" fill="${c.muted}">${MON[mk.m]}</text>`)
    .join('');

  const legendY = gridBottom + 26;
  const legendX = W - 40 - 44 - 5 * pitch;
  const legend = `<text x="${legendX - 8}" y="${legendY + cell - 3}" text-anchor="end" font-family="${MONO}" font-size="12" font-weight="700" letter-spacing="1" fill="${c.muted}">LESS</text>${LV.map(
    ([fill, op], k) => `<rect x="${legendX + k * pitch}" y="${legendY}" width="${cell}" height="${cell}" rx="3" fill="${fill}" fill-opacity="${op}"/>`
  ).join('')}<text x="${W - 40}" y="${legendY + cell - 3}" text-anchor="end" font-family="${MONO}" font-size="12" font-weight="700" letter-spacing="1" fill="${c.muted}">MORE</text>`;

  // Row of figures under the grid.
  const dividerY = legendY + cell + 22;
  const valY = dividerY + 50;
  const labY = valY + 26;
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
      return `<g class="ro" style="animation-delay:${(1 + k * 0.08).toFixed(2)}s">${k ? `<line x1="${r1(x - 14)}" y1="${valY - 34}" x2="${r1(x - 14)}" y2="${labY + 6}" stroke="${c.faint}"/>` : ''}
  <text x="${r1(x)}" y="${valY}" font-family="${THIN}" font-weight="700" font-size="36" fill="${c.fg}">${value}</text>
  <text x="${r1(x)}" y="${labY}" font-family="${MONO}" font-size="13" font-weight="700" letter-spacing="1.5" fill="${c.muted}">${label}</text>
</g>`;
    })
    .join('');

  // Top languages: only when GitHub has found code in the public repositories.
  const langs = (profile.languages || []).filter((l) => l.share >= 0.01).slice(0, 6);
  let languages = '';
  let H = labY + 30;
  if (langs.length) {
    const ly = labY + 24;
    const sw = W - 80;
    const shades = [1, 0.74, 0.54, 0.4, 0.28, 0.18];
    let cursor = 40;
    const parts = langs
      .map((l, k) => {
        const w = Math.max(4, l.share * sw - 3);
        const seg = `<g class="seg" style="animation-delay:${(1.2 + k * 0.1).toFixed(2)}s"><rect x="${r1(cursor)}" y="${ly + 36}" width="${r1(w)}" height="10" rx="3" fill="${c.hud}" fill-opacity="${shades[k] ?? 0.12}"/>${
          w > 110
            ? `<text x="${r1(cursor)}" y="${ly + 70}" font-family="${MONO}" font-size="13" font-weight="700" letter-spacing="1" fill="${c.fg}">${escapeXml(l.name.toUpperCase())} ${Math.round(l.share * 100)}%</text>`
            : ''
        }</g>`;
        cursor += w + 3;
        return seg;
      })
      .join('');
    languages = `<line x1="40" y1="${ly - 6}" x2="${W - 40}" y2="${ly - 6}" stroke="${c.faint}"/><text x="40" y="${ly + 22}" font-family="${MONO}" font-size="13" font-weight="700" letter-spacing="3" fill="${c.muted}">TOP LANGUAGES</text>${parts}`;
    H = ly + 96;
  }

  const css = `
.frame{animation:fade 1s ease-out both}
.ro{animation:rise .9s ${EXPO} both}
.col{animation:fade .6s ease-out both}
.ring{stroke-dasharray:340;animation:ring 1.4s ease-out .4s both}
.seg{transform-box:fill-box;transform-origin:left center;animation:growX 1s ${EXPO} both}
@keyframes fade{from{opacity:0}}
@keyframes rise{from{opacity:0;transform:translateY(10px)}}
@keyframes ring{from{stroke-dashoffset:340}}
@keyframes growX{from{transform:scaleX(0)}}
${REDUCED}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(
    `GitHub stats: ${fmt(allTotal)} total contributions, current streak ${cur.len} days, longest streak ${longest.len} days. ${fmt(n.total)} contributions in the last 12 months, ${fmt(profile.commits || 0)} commits, ${fmt(profile.pullRequests || 0)} pull requests, ${fmt(profile.issues || 0)} issues, ${fmt(n.stars)} stars, ${fmt(profile.publicRepos || 0)} public repositories.`
  )}">
<style>${css}</style>
<g class="frame">
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${c.bg}" stroke="${c.faint}"/>
  <text x="40" y="46" font-family="${MONO}" font-size="16" font-weight="700" letter-spacing="3" fill="${c.hud}">GITHUB  STATS</text>
  <text x="${W - 40}" y="46" text-anchor="end" font-family="${MONO}" font-size="14" font-weight="700" letter-spacing="2" fill="${c.muted}">${escapeXml(missionName.toUpperCase())}  ·  @${escapeXml(profile.login.toUpperCase())}</text>
  <line x1="40" y1="64" x2="${W - 40}" y2="64" stroke="${c.faint}"/>
  <line x1="413" y1="92" x2="413" y2="268" stroke="${c.faint}"/>
  <line x1="787" y1="92" x2="787" y2="268" stroke="${c.faint}"/>
  <line x1="40" y1="290" x2="${W - 40}" y2="290" stroke="${c.faint}"/>
  <text x="40" y="318" font-family="${MONO}" font-size="13" font-weight="700" letter-spacing="3" fill="${c.muted}">CONTRIBUTIONS  ·  LAST 12 MONTHS</text>
  ${monthLabels}
  <line x1="40" y1="${dividerY}" x2="${W - 40}" y2="${dividerY}" stroke="${c.faint}"/>
</g>
${streakCard}
${cells}
${legend}
${figureSvg}
${languages}
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
