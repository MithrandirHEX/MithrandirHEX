// Regenerates README.md and assets/ for the profile from live GitHub data.
// Usage (bundled by esbuild, see package.json):  node dist/build.mjs
//   GH_TOKEN  - token used for the GitHub GraphQL API (the Action passes GITHUB_TOKEN)
//   GH_LOGIN  - profile to render (defaults to the repository owner)
//   SAMPLE=1  - offline test with fake data, never use for publishing
import fs from 'node:fs';
import path from 'node:path';
import { render } from './src/templates/singularity/index.js';
import { linksFromGitHub } from './src/lib/links.js';

const root = path.resolve(process.argv[2] || '..');
const login = process.env.GH_LOGIN || process.env.GITHUB_REPOSITORY_OWNER || 'MithrandirHEX';
const config = JSON.parse(fs.readFileSync(path.join(root, 'profile.config.json'), 'utf8').replace(/^﻿/, ''));

const QUERY = `
query ($login: String!) {
  user(login: $login) {
    login name bio websiteUrl twitterUsername email createdAt
    followers { totalCount }
    socialAccounts(first: 10) { nodes { provider url } }
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes { ... on Repository { name description url stargazerCount primaryLanguage { name } } }
    }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC,
                 orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes {
        name description url stargazerCount primaryLanguage { name }
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } }
      }
    }
    allRepos: repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, orderBy: { field: PUSHED_AT, direction: DESC }) {
      nodes { name stargazerCount isFork }
    }
    contributionsCollection {
      totalCommitContributions totalPullRequestContributions
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
  }
}`;

const toRepo = (r) => ({ name: r.name, description: r.description || '', url: r.url, stars: r.stargazerCount, language: r.primaryLanguage?.name || '' });

async function fetchLive() {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error('GH_TOKEN is not set');
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });
  const data = await res.json();
  if (!res.ok || data.errors?.length || !data.data?.user) {
    throw new Error(`GitHub API error: ${data.errors?.[0]?.message || data.message || res.status}`);
  }
  const u = data.data.user;

  // Public, non-fork repos only. The profile repo itself is left out.
  const repos = u.repositories.nodes.filter((r) => r.name.toLowerCase() !== u.login.toLowerCase());
  const pinned = u.pinnedItems.nodes.filter(Boolean).map(toRepo);
  const byStars = repos.map(toRepo).sort((a, b) => b.stars - a.stars);
  const seen = new Set();
  const candidates = [...pinned, ...byStars].filter((r) => !seen.has(r.name) && seen.add(r.name)).slice(0, 12);

  const bytes = new Map();
  for (const repo of repos) for (const e of repo.languages.edges) bytes.set(e.node.name, (bytes.get(e.node.name) || 0) + e.size);
  const total = [...bytes.values()].reduce((a, b) => a + b, 0) || 1;
  const languages = [...bytes].sort((a, b) => b[1] - a[1]).map(([name, size]) => ({ name, share: size / total }));

  const days = u.contributionsCollection.contributionCalendar.weeks
    .flatMap((w) => w.contributionDays)
    .map((d) => ({ date: d.date, count: d.contributionCount }));

  return {
    login: u.login,
    name: u.name || u.login,
    headline: u.bio || '',
    website: u.websiteUrl || '',
    email: u.email || '',
    links: linksFromGitHub(u.twitterUsername, u.socialAccounts.nodes),
    joinedYear: new Date(u.createdAt).getFullYear(),
    followers: u.followers.totalCount,
    commits: u.contributionsCollection.totalCommitContributions,
    pullRequests: u.contributionsCollection.totalPullRequestContributions,
    publicRepos: u.allRepos.nodes.filter((r) => r.name.toLowerCase() !== u.login.toLowerCase()).length,
    totalStars: repos.reduce((s, r) => s + r.stargazerCount, 0),
    repos: candidates,
    // Every public repository, forks included (profile repo excluded): one point each on the accretion disk.
    repoPoints: u.allRepos.nodes
      .filter((r) => r.name.toLowerCase() !== u.login.toLowerCase())
      .map((r) => ({ name: r.name, stars: r.stargazerCount })),
    featured: candidates.slice(0, 4).map((r) => r.name),
    languages,
    contributions: { total: u.contributionsCollection.contributionCalendar.totalContributions, days },
  };
}

function fetchSample() {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const start = new Date();
  start.setDate(start.getDate() - 364);
  const days = Array.from({ length: 365 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d.toISOString().slice(0, 10), count: rnd() < 0.35 ? 0 : Math.floor(rnd() * 9) + 1 };
  });
  return {
    login, name: login, headline: '', website: '', email: '', links: [], joinedYear: new Date().getFullYear() - 1,
    followers: 0, totalStars: 0, repos: [], featured: [],
    commits: 120, pullRequests: 7, publicRepos: 4,
    repoPoints: ['recon-notes', 'exploit-lab', 'fuzz-harness', 'writeups'].map((name, i) => ({ name, stars: i * 3 })), languages: [{ name: 'Python', share: 1 }],
    contributions: { total: days.reduce((s, d) => s + d.count, 0), days },
  };
}

const live = process.env.SAMPLE === '1' ? fetchSample() : await fetchLive();

// profile.config.json wins over what GitHub reports, for any field that is filled in.
const pick = (a, b) => (typeof a === 'string' ? (a.trim() ? a : b) : Array.isArray(a) ? (a.length ? a : b) : b);
const profile = {
  ...live,
  name: pick(config.name, live.name),
  headline: pick(config.headline, live.headline),
  intro: config.intro || '',
  arsenal: config.arsenal || {},
  now: config.now || '',
  website: pick(config.website, live.website),
  email: pick(config.email, live.email),
  links: pick(config.links, live.links),
  featured: pick(config.featured, live.featured),
  templateData: { singularity: { missionName: config.missionName || '', signoff: config.signoff || '', contact: config.secureContact || '' } },
};

const { markdown, assets } = render(profile);
fs.writeFileSync(path.join(root, 'README.md'), markdown);
for (const [file, content] of Object.entries(assets)) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
console.log(`Rendered ${login}: ${profile.contributions.total} contributions, ${Object.keys(assets).length} assets`);
