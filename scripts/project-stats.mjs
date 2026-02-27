import fs from 'node:fs/promises';
import path from 'node:path';

const cwd = process.cwd();

const IGNORE_DIRS = new Set([
  '.git',
  '.next',
  'node_modules',
  '.vercel',
  'dist',
  'build',
  'coverage',
]);

const IGNORE_FILES = new Set([
  'package-lock.json',
]);

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.md',
  '.css',
  '.scss',
  '.sass',
  '.yml',
  '.yaml',
  '.txt',
  '.env',
  '.example',
  '.sh',
  '.sql',
]);

function isProbablyBinary(buffer) {
  // Heuristic: if there is a NUL byte, treat as binary.
  return buffer.includes(0);
}

function human(n) {
  return new Intl.NumberFormat('en-US').format(n);
}

function groupKeyForFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext) return ext;
  const base = path.basename(filePath);
  if (base.startsWith('.env')) return '.env';
  return '(noext)';
}

async function countLines(filePath) {
  const buf = await fs.readFile(filePath);
  if (isProbablyBinary(buf)) return null;

  const text = buf.toString('utf8');
  const lines = text.split(/\r?\n/);
  const total = lines.length;
  const nonEmpty = lines.filter((l) => l.trim().length > 0).length;
  return { total, nonEmpty };
}

async function walk(rootDir) {
  const stack = [rootDir];

  const stats = {
    generatedAt: new Date().toISOString(),
    root: rootDir,
    files: 0,
    directories: 0,
    textFiles: 0,
    totalLines: 0,
    nonEmptyLines: 0,
    byExt: {},
  };

  while (stack.length) {
    const current = stack.pop();
    if (!current) break;

    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      const rel = path.relative(rootDir, abs);

      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        stats.directories += 1;
        stack.push(abs);
        continue;
      }

      if (!entry.isFile()) continue;
      if (IGNORE_FILES.has(entry.name)) continue;

      stats.files += 1;

      const ext = groupKeyForFile(abs);
      const isText = TEXT_EXTENSIONS.has(ext) || ext === '(noext)' || entry.name.startsWith('.env');
      if (!isText) continue;

      // Avoid counting giant generated assets.
      let st;
      try {
        st = await fs.stat(abs);
      } catch {
        continue;
      }
      if (st.size > 2_000_000) continue;

      const lineStats = await countLines(abs);
      if (!lineStats) continue;

      stats.textFiles += 1;
      stats.totalLines += lineStats.total;
      stats.nonEmptyLines += lineStats.nonEmpty;

      if (!stats.byExt[ext]) {
        stats.byExt[ext] = { files: 0, totalLines: 0, nonEmptyLines: 0 };
      }

      stats.byExt[ext].files += 1;
      stats.byExt[ext].totalLines += lineStats.total;
      stats.byExt[ext].nonEmptyLines += lineStats.nonEmpty;
    }
  }

  return stats;
}

function toMarkdown(stats) {
  const exts = Object.entries(stats.byExt)
    .sort((a, b) => b[1].nonEmptyLines - a[1].nonEmptyLines)
    .slice(0, 12);

  const lines = [];
  lines.push(`Generated: ${stats.generatedAt}`);
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---:|');
  lines.push(`| Total files | ${human(stats.files)} |`);
  lines.push(`| Total directories | ${human(stats.directories)} |`);
  lines.push(`| Text files counted | ${human(stats.textFiles)} |`);
  lines.push(`| Total lines (text) | ${human(stats.totalLines)} |`);
  lines.push(`| Non-empty lines (text) | ${human(stats.nonEmptyLines)} |`);
  lines.push('');
  lines.push('Top file types (by non-empty lines):');
  lines.push('');
  lines.push('| Ext | Files | Lines | Non-empty |');
  lines.push('|---|---:|---:|---:|');
  for (const [ext, s] of exts) {
    lines.push(`| ${ext} | ${human(s.files)} | ${human(s.totalLines)} | ${human(s.nonEmptyLines)} |`);
  }

  return lines.join('\n');
}

const args = new Set(process.argv.slice(2));
const asMarkdown = args.has('--md');

const stats = await walk(cwd);
if (asMarkdown) {
  console.log(toMarkdown(stats));
} else {
  console.log(JSON.stringify(stats, null, 2));
}
