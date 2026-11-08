// Arsenal: a "Languages & Tools" panel. One tile per language, tool or environment, with its logo
// (Simple Icons, CC0) and its name, grouped in labelled blocks. Self-hosted SVG, so no outside service.
//
// profile.arsenal = { languages: [...], tools: [...], environments: [...] }
// Each entry is a name ("Python") or { name, icon } when the logo name differs from the display name
// ({ "name": "IDA Pro", "icon": "hexrays" }). A name with no matching logo gets a monogram tile, and a
// name starting with "(" is a placeholder: dashed and dim, until it is replaced.

import * as simpleIcons from 'simple-icons';
import { THEMES } from './art';
import { escapeXml } from '../pulsar/art';

const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";
const EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
const REDUCED = '@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }';

const GROUPS = [
  ['languages', 'LANGUAGES'],
  ['tools', 'TOOLS & FRAMEWORKS'],
  ['environments', 'ENVIRONMENTS'],
];

const slug = (name) =>
  String(name)
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/#/g, 'sharp')
    .replace(/[^a-z0-9]/g, '');

// Display names people commonly type, mapped to Simple Icons names.
const ALIASES = {
  js: 'javascript',
  ts: 'typescript',
  bash: 'gnubash',
  shell: 'gnubash',
  java: 'openjdk',
  golang: 'go',
  node: 'nodedotjs',
  nodejs: 'nodedotjs',
  windows: 'windows11',
  kali: 'kalilinux',
  vscode: 'visualstudiocode',
  postgres: 'postgresql',
  burp: 'burpsuite',
  gdb: 'gnu',
  next: 'nextdotjs',
  nextjs: 'nextdotjs',
  reactjs: 'react',
};

// Logos that Simple Icons no longer ships.
const CUSTOM = {
  // Java cup and steam, from Simple Icons 6.0.0 (CC0), before the logo was withdrawn. Shown in Java orange.
  java: { hex: 'E76F00', path: 'M8.851 18.56s-.917.534.653.714c1.902.218 2.874.187 4.969-.211 0 0 .552.346 1.321.646-4.699 2.013-10.633-.118-6.943-1.149M8.276 15.933s-1.028.761.542.924c2.032.209 3.636.227 6.413-.308 0 0 .384.389.987.602-5.679 1.661-12.007.13-7.942-1.218M13.116 11.475c1.158 1.333-.304 2.533-.304 2.533s2.939-1.518 1.589-3.418c-1.261-1.772-2.228-2.652 3.007-5.688 0-.001-8.216 2.051-4.292 6.573M19.33 20.504s.679.559-.747.991c-2.712.822-11.288 1.069-13.669.033-.856-.373.75-.89 1.254-.998.527-.114.828-.093.828-.093-.953-.671-6.156 1.317-2.643 1.887 9.58 1.553 17.462-.7 14.977-1.82M9.292 13.21s-4.362 1.036-1.544 1.412c1.189.159 3.561.123 5.77-.062 1.806-.152 3.618-.477 3.618-.477s-.637.272-1.098.587c-4.429 1.165-12.986.623-10.522-.568 2.082-1.006 3.776-.892 3.776-.892M17.116 17.584c4.503-2.34 2.421-4.589.968-4.285-.355.074-.515.138-.515.138s.132-.207.385-.297c2.875-1.011 5.086 2.981-.928 4.562 0-.001.07-.062.09-.118M14.401 0s2.494 2.494-2.365 6.33c-3.896 3.077-.888 4.832-.001 6.836-2.274-2.053-3.943-3.858-2.824-5.539 1.644-2.469 6.197-3.665 5.19-7.627M9.734 23.924c4.322.277 10.959-.153 11.116-2.198 0 0-.302.775-3.572 1.391-3.688.694-8.239.613-10.937.168 0-.001.553.457 3.393.639' },
  windows: { hex: '0078D4', path: 'M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801' },
};

const entryName = (item) => String(typeof item === 'string' ? item : item?.name ?? '').trim();

function findIcon(item) {
  const name = entryName(item);
  if (CUSTOM[slug(name)]) return CUSTOM[slug(name)];
  const wanted = typeof item === 'object' && item?.icon ? slug(item.icon) : ALIASES[slug(name)] || slug(name);
  if (!wanted) return null;
  return simpleIcons[`si${wanted.charAt(0).toUpperCase()}${wanted.slice(1)}`] || null;
}

function luminance(hex) {
  const channel = (i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

export function arsenalGroups(profile) {
  const a = profile.arsenal || {};
  // Placeholders such as "(.......)" are hidden, so an unfilled group never shows an empty dashed tile.
  return GROUPS.map(([key, label]) => [label, (a[key] || []).filter((item) => entryName(item) && !entryName(item).startsWith('('))]).filter(([, items]) => items.length);
}

export function arsenalSvg(profile, themeName = 'dark') {
  const groups = arsenalGroups(profile);
  if (!groups.length) return null;
  const c = THEMES[themeName];

  // Groups sit side by side, each a block of tiles two (or three) rows high, so the panel is filled evenly.
  const W = 1200;
  const PAD = 40;
  const GAP = 12;
  const GGAP = 40;
  const TH = 128;
  const total = groups.reduce((sum, [, items]) => sum + items.length, 0);
  const ROWS = total > 20 ? 3 : 2;
  const colsOf = groups.map(([, items]) => Math.max(1, Math.ceil(items.length / ROWS)));
  const sumCols = colsOf.reduce((a, b) => a + b, 0);
  const tw = Math.floor((W - PAD * 2 - GGAP * (groups.length - 1) - GAP * (sumCols - groups.length)) / sumCols);

  const top = 30;
  const tilesTop = top + 28;
  const SWEEP = 6;
  let body = '';
  let delay = 0.3;
  let x0 = PAD;
  groups.forEach(([label, items], gi) => {
    const gw = colsOf[gi] * tw + (colsOf[gi] - 1) * GAP;
    body += `<text x="${x0}" y="${top + 8}" font-family="${MONO}" font-size="15" font-weight="700" letter-spacing="3" fill="${c.hud}">${escapeXml(label)}</text><line x1="${x0}" y1="${top + 18}" x2="${x0 + gw}" y2="${top + 18}" stroke="${c.faint}" stroke-width="2"/><line x1="${x0}" y1="${top + 18}" x2="${x0 + Math.min(gw, 56)}" y2="${top + 18}" stroke="${c.hud}" stroke-width="2"/>`;
    items.forEach((item, i) => {
      const x = x0 + (i % colsOf[gi]) * (tw + GAP);
      const ty = tilesTop + Math.floor(i / colsOf[gi]) * (TH + GAP);
      const name = entryName(item);
      const icon = findIcon(item);
      const cx = x + tw / 2;
      let mark;
      if (icon) {
        const color = luminance(icon.hex) < 0.12 ? c.fg : `#${icon.hex}`;
        mark = `<g transform="translate(${cx - 26} ${ty + 20}) scale(2.1667)"><path d="${icon.path}" fill="${color}"/></g>`;
      } else {
        const mono = escapeXml(name.replace(/[^A-Za-z0-9+#]/g, '').slice(0, 2).toUpperCase() || '?');
        mark = `<rect x="${cx - 26}" y="${ty + 20}" width="52" height="52" rx="11" fill="none" stroke="${c.hud}" stroke-opacity="0.6" stroke-width="2"/><text x="${cx}" y="${ty + 55}" text-anchor="middle" font-family="${MONO}" font-size="20" font-weight="700" fill="${c.fg}">${mono}</text>`;
      }
      const size = name.length > 12 ? 13 : 15;
      const glint = (((x - PAD) / (W - PAD * 2)) * SWEEP).toFixed(2);
      body += `<g class="ro" style="animation-delay:${delay.toFixed(2)}s">
  <rect x="${x}" y="${ty}" width="${tw}" height="${TH}" rx="12" fill="${c.faint}" fill-opacity="0.3" stroke="${c.faint}"/>
  <g class="bob" style="animation-delay:-${((i * 1.3 + gi * 0.7) % 4.5).toFixed(1)}s">${mark}</g>
  <text x="${cx}" y="${ty + 108}" text-anchor="middle" font-family="${MONO}" font-size="${size}" font-weight="700" fill="${c.fg}">${escapeXml(name)}</text>
  <rect class="glint" x="${x}" y="${ty}" width="${tw}" height="${TH}" rx="12" fill="none" stroke="${c.hud}" stroke-width="2" style="animation-delay:${glint}s"/>
</g>`;
      delay += 0.04;
    });
    x0 += gw + GGAP;
  });
  const H = tilesTop + ROWS * TH + (ROWS - 1) * GAP + 28;

  const css = `
.frame{animation:fade 1s ease-out both}
.ro{animation:rise .9s ${EXPO} both}
.bob{animation:bob 4.5s ease-in-out infinite alternate}
.glint{opacity:0;animation:glint ${SWEEP + 3}s linear infinite}
@keyframes fade{from{opacity:0}}
@keyframes rise{from{opacity:0;transform:translateY(10px)}}
@keyframes bob{from{transform:translateY(0)}to{transform:translateY(-5px)}}
@keyframes glint{0%{opacity:0}5%{opacity:1}22%,100%{opacity:0}}
${REDUCED}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(
    `Languages and tools: ${groups.map(([label, items]) => `${label.toLowerCase()}: ${items.map(entryName).join(', ')}`).join('; ')}. ${total} entries.`
  )}">
<style>${css}</style>
<g class="frame">
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${c.bg}" stroke="${c.faint}"/>
</g>
${body}
</svg>`;
}
