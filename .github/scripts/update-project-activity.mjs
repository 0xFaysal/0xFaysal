import { readFile, writeFile } from 'node:fs/promises';

const projects = [
  { name: 'ParkEase BD', repository: '0xFaysal/se-lab-wake-up-to-reality' },
  { name: 'HelioBay', repository: '0xFaysal/HelioBay' },
  { name: 'UNO-Mates', repository: '0xFaysal/UNO-Mates' },
];

const start = '<!-- PROJECT_ACTIVITY:START -->';
const end = '<!-- PROJECT_ACTIVITY:END -->';
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Dhaka',
});

async function getProjectActivity(project) {
  const response = await fetch(`https://api.github.com/repos/${project.repository}`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`GitHub API returned HTTP ${response.status} for ${project.repository}`);
  }

  const { pushed_at: pushedAt } = await response.json();
  const timestamp = typeof pushedAt === 'string' ? Date.parse(pushedAt) : NaN;
  if (!Number.isFinite(timestamp)) {
    throw new Error(`GitHub API returned an invalid push date for ${project.repository}`);
  }

  return { ...project, timestamp };
}

const readme = new URL('../../README.md', import.meta.url);
const original = await readFile(readme, 'utf8');
const startIndex = original.indexOf(start);
const endIndex = original.indexOf(end);

if (
  startIndex === -1 ||
  endIndex < startIndex + start.length ||
  original.indexOf(start, startIndex + start.length) !== -1 ||
  original.indexOf(end, endIndex + end.length) !== -1
) {
  throw new Error('Expected exactly one project activity block in README.md');
}

const activity = await Promise.all(projects.map(getProjectActivity));
activity.sort((left, right) => right.timestamp - left.timestamp);

const newline = original.includes('\r\n') ? '\r\n' : '\n';
const rows = activity.map(({ name, repository, timestamp }) =>
  `- [${name}](https://github.com/${repository}) · Last push ${dateFormat.format(timestamp)}`,
);
const updated = [
  original.slice(0, startIndex + start.length),
  ...rows,
  original.slice(endIndex),
].join(newline);

if (updated !== original) {
  await writeFile(readme, updated, 'utf8');
}
