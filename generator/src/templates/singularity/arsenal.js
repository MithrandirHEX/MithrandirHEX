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
  ['tools', 'TOOLS'],
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
};

const entryName = (item) => String(typeof item === 'string' ? item : item?.name ?? '').trim();

function findIcon(item) {
  const name = entryName(item);
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
  return GROUPS.map(([key, label]) => [label, (a[key] || []).filter((item) => entryName(item))]).filter(([, items]) => items.length);
}

export function arsenalSvg(profile, themeName = 'dark') {
  const groups = arsenalGroups(profile);
  if (!groups.length) return null;
  const c = THEMES[themeName];

  const W = 1200;
  const PAD = 40;
  const GAP = 12;
  const COLS = 6;
  const TH = 108;
  const tw = Math.floor((W - PAD * 2 - GAP * (COLS - 1)) / COLS);

  let y = 86;
  let delay = 0.3;
  let body = '';
  for (const [label, items] of groups) {
    body += `<text x="${PAD}" y="${y + 6}" font-family="${MONO}" font-size="12" font-weight="700" letter-spacing="3" fill="${c.muted}">${label}</text>`;
    y += 22;
    items.forEach((item, i) => {
      const x = PAD + (i % COLS) * (tw + GAP);
      const ty = y + Math.floor(i / COLS) * (TH + GAP);
      const name = entryName(item);
      const placeholder = name.startsWith('(');
      const icon = placeholder ? null : findIcon(item);
      const cx = x + tw / 2;
      let mark;
      if (icon) {
        const color = luminance(icon.hex) < 0.12 ? c.fg : `#${icon.hex}`;
        mark = `<g transform="translate(${cx - 20} ${ty + 18}) scale(1.6667)"><path d="${icon.path}" fill="${color}"/></g>`;
      } else if (placeholder) {
        mark = '';
      } else {
        const mono = escapeXml(name.replace(/[^A-Za-z0-9+#]/g, '').slice(0, 2).toUpperCase() || '?');
        mark = `<rect x="${cx - 20}" y="${ty + 18}" width="40" height="40" rx="9" fill="none" stroke="${c.hud}" stroke-opacity="0.55" stroke-width="1.5"/><text x="${cx}" y="${ty + 45}" text-anchor="middle" font-family="${MONO}" font-size="16" font-weight="700" fill="${c.fg}">${mono}</text>`;
      }
      const size = name.length > 16 ? 10.5 : 12;
      const labelY = placeholder ? ty + TH / 2 + 4 : ty + 88;
      body += `<g class="ro" style="animation-delay:${delay.toFixed(2)}s">
  <rect x="${x}" y="${ty}" width="${tw}" height="${TH}" rx="10" fill="${c.faint}" fill-opacity="${placeholder ? 0 : 0.28}" stroke="${placeholder ? c.hud : c.faint}" stroke-opacity="${placeholder ? 0.35 : 1}"${placeholder ? ' stroke-dasharray="4 4"' : ''}/>
  ${mark}
  <text x="${cx}" y="${labelY}" text-anchor="middle" font-family="${MONO}" font-size="${size}" font-weight="700" fill="${placeholder ? c.muted : c.fg}">${escapeXml(name)}</text>
</g>`;
      delay += 0.04;
    });
    y += Math.ceil(items.length / COLS) * (TH + GAP) + 8;
  }
  const H = y + 14;

  const css = `
.frame{animation:fade 1s ease-out both}
.ro{animation:rise .9s ${EXPO} both}
@keyframes fade{from{opacity:0}}
@keyframes rise{from{opacity:0;transform:translateY(10px)}}
${REDUCED}`;

  const total = groups.reduce((sum, [, items]) => sum + items.length, 0);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeXml(
    `Languages and tools: ${groups.map(([label, items]) => `${label.toLowerCase()}: ${items.map(entryName).join(', ')}`).join('; ')}. ${total} entries.`
  )}">
<style>${css}</style>
<g class="frame">
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${c.bg}" stroke="${c.faint}"/>
  <text x="${PAD}" y="46" font-family="${MONO}" font-size="14" font-weight="700" letter-spacing="3" fill="${c.hud}">ARSENAL  //  LANGUAGES &amp; TOOLS</text>
  <text x="${W - PAD}" y="46" text-anchor="end" font-family="${MONO}" font-size="13" font-weight="700" letter-spacing="2" fill="${c.muted}">@${escapeXml(profile.login.toUpperCase())}</text>
  <line x1="${PAD}" y1="62" x2="${W - PAD}" y2="62" stroke="${c.faint}"/>
</g>
${body}
</svg>`;
}
