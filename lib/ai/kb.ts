import fs from 'node:fs/promises';
import path from 'node:path';

type KbDoc = {
  id: string;
  content: string;
};

async function readIfExists(relPath: string): Promise<KbDoc | null> {
  try {
    const abs = path.join(process.cwd(), relPath);
    const content = await fs.readFile(abs, 'utf8');
    return { id: relPath, content };
  } catch {
    return null;
  }
}

async function listDocsDir(): Promise<string[]> {
  const base = path.join(process.cwd(), 'docs');
  const out: string[] = [];

  async function walk(dir: string) {
    let entries: any[] = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true } as any);
    } catch {
      return;
    }

    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        await walk(full);
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) {
        out.push(path.relative(process.cwd(), full));
      }
    }
  }

  await walk(base);
  return out;
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_áéíóúñ]/gi, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 12);
}

function scoreDoc(contentLower: string, tokens: string[]): number {
  let score = 0;
  for (const tok of tokens) {
    let idx = 0;
    while (true) {
      idx = contentLower.indexOf(tok, idx);
      if (idx === -1) break;
      score += 1;
      idx += tok.length;
      if (score > 80) return score;
    }
  }
  return score;
}

function extractSnippet(content: string, tokens: string[], maxLen: number): string {
  const lower = content.toLowerCase();
  let bestPos = -1;
  for (const tok of tokens) {
    const pos = lower.indexOf(tok);
    if (pos !== -1) {
      bestPos = bestPos === -1 ? pos : Math.min(bestPos, pos);
    }
  }

  if (bestPos === -1) {
    return content.slice(0, maxLen);
  }

  const start = Math.max(0, bestPos - Math.floor(maxLen / 3));
  const end = Math.min(content.length, start + maxLen);
  return content.slice(start, end);
}

export async function getKbSnippets(query: string, opts?: { maxDocs?: number; maxCharsPerDoc?: number }) {
  const maxDocs = opts?.maxDocs ?? 3;
  const maxCharsPerDoc = opts?.maxCharsPerDoc ?? 900;

  const tokens = tokenize(query);
  if (tokens.length === 0) return [] as Array<{ id: string; snippet: string }>;

  const docPaths = new Set<string>(['README.md', 'SETUP.md', 'TROUBLESHOOTING.md']);
  for (const p of await listDocsDir()) docPaths.add(p);

  const docs: KbDoc[] = [];
  for (const p of docPaths) {
    const d = await readIfExists(p);
    if (d) docs.push(d);
  }

  const scored = docs
    .map((d) => {
      const contentLower = d.content.toLowerCase();
      return { d, score: scoreDoc(contentLower, tokens) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxDocs);

  return scored.map(({ d }) => ({ id: d.id, snippet: extractSnippet(d.content, tokens, maxCharsPerDoc) }));
}
