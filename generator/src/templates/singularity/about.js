// About Me: a short dossier rendered as plain Markdown/HTML, so GitHub styles it natively.
//
// profile.about = {
//   role, tagline, points: [...], focus, techStack, now,        (all optional)
//   connect: [{ label, url }],                                   (a url that is not http(s) shows as plain text)
//   icons: { heading, role, tagline, focus, stack, connect, now } (optional emoji overrides)
// }

import { attr } from '../../lib/links';

const html = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const DEFAULT_ICONS = {
  heading: '🛰️',
  role: '🔐',
  tagline: '🔎',
  focus: '🎯',
  stack: '⚙️',
  connect: '📡',
  now: '🔭',
};

function connectHtml(list) {
  return (list || [])
    .filter((c) => c?.label)
    .map((c) => (/^https?:\/\//i.test(String(c.url || '')) ? `<a href="${attr(c.url)}">${html(c.label)}</a>` : `${html(c.label)}: ${html(c.url || '')}`))
    .join(' · ');
}

export function renderAbout(p) {
  const a = p.about;
  if (!a) return '';
  const icons = { ...DEFAULT_ICONS, ...(a.icons || {}) };

  const lines = [`### ${icons.heading} About Me`, ''];
  if (a.role) lines.push(`${icons.role} **${a.role}**`, '');
  if (a.tagline) lines.push(`> ${icons.tagline} ${a.tagline}`, '');
  const points = (a.points || []).filter(Boolean);
  if (points.length) lines.push(...points.map((x) => `- ${x}`), '');

  const rows = [
    a.focus && [icons.focus, 'Core focus', html(a.focus)],
    a.techStack && [icons.stack, 'Tech stack', html(a.techStack)],
    a.now && [icons.now, 'Right now', html(a.now)],
    connectHtml(a.connect) && [icons.connect, 'Connect', connectHtml(a.connect)],
  ].filter(Boolean);
  if (rows.length) {
    lines.push('---', '', '<table>');
    for (const [icon, label, value] of rows) lines.push(`<tr><td>${icon} <b>${label}</b></td><td>${value}</td></tr>`);
    lines.push('</table>', '');
  }
  return lines.join('\n');
}
