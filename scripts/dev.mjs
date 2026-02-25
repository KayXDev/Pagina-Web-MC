import { spawn } from 'child_process';
import os from 'os';
import process from 'process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const host = process.env.NEXT_DEV_HOST || '127.0.0.1';
const port = Number.parseInt(process.env.NEXT_DEV_PORT || '3000', 10);

const ansi = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

function color(text, code) {
  return `${code}${text}${ansi.reset}`;
}

function getNetworkIPv4() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (!net) continue;
      if (net.family !== 'IPv4') continue;
      if (net.internal) continue;
      return net.address;
    }
  }
  return null;
}

function stripAnsi(input) {
  return input.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '');
}

function padRight(text, width) {
  const raw = stripAnsi(text);
  const pad = Math.max(0, width - raw.length);
  return text + ' '.repeat(pad);
}

function renderBox(lines) {
  const maxWidth = Math.max(...lines.map((l) => stripAnsi(l).length));
  const top = `┌${'─'.repeat(maxWidth + 2)}┐`;
  const bottom = `└${'─'.repeat(maxWidth + 2)}┘`;

  const outLines = [color(top, ansi.cyan)];
  for (const line of lines) {
    outLines.push(color('│', ansi.cyan) + ' ' + padRight(line, maxWidth) + ' ' + color('│', ansi.cyan));
  }
  outLines.push(color(bottom, ansi.cyan));

  return {
    text: outLines.join('\n') + '\n',
    height: outLines.length,
  };
}

function prettyUrl(url) {
  return color(url, ansi.green);
}

function banner({ readyMs } = {}) {
  const title = `${color('999WRLD Network', ansi.bold)} ${color('— Dev Server', ansi.gray)}`;
  const localUrl = `http://${host}:${port}`;
  const netIp = getNetworkIPv4();
  const networkUrl = netIp ? `http://${netIp}:${port}` : null;

  const lines = [
    title,
    color('────────────────────────────────', ansi.gray),
    `${color('Local:   ', ansi.gray)} ${prettyUrl(localUrl)}`,
    `${color('Network: ', ansi.gray)} ${networkUrl ? prettyUrl(networkUrl) : color('N/A', ansi.dim)}`,
    `${color('Env:     ', ansi.gray)} ${color('.env', ansi.yellow)}`,
  ];

  if (typeof readyMs === 'number') {
    lines.push(color('────────────────────────────────', ansi.gray));
    lines.push(`${color('Status:  ', ansi.gray)} ${color('Ready', ansi.green)} ${color(`(${readyMs}ms)`, ansi.dim)}`);
  }

  return renderBox(lines);
}

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[0;0H');
}

function moveCursorUp(lines) {
  if (lines <= 0) return;
  process.stdout.write(`\x1b[${lines}A`);
}

function clearFromCursorDown() {
  process.stdout.write('\x1b[J');
}

function isNextStartupNoise(line) {
  const raw = stripAnsi(line).trim();
  if (!raw) return true;

  // Next.js header block
  if (raw.startsWith('▲ Next.js')) return true;
  if (raw.startsWith('- Local:')) return true;
  if (raw.startsWith('- Network:')) return true;
  if (raw.startsWith('- Environments:')) return true;

  // Startup ticks
  if (raw.startsWith('✓ Starting')) return true;

  return false;
}

function parseReadyMs(line) {
  const raw = stripAnsi(line);
  const match = raw.match(/Ready in\s+(\d+)ms/i);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
}

const isTTY = Boolean(process.stdout.isTTY);

let lastBoxHeight = 0;

function drawBoxInPlace(box) {
  if (!box) return;
  if (lastBoxHeight > 0) {
    moveCursorUp(lastBoxHeight);
    clearFromCursorDown();
  }
  process.stdout.write(box.text);
  lastBoxHeight = box.height;
}

// In a real TTY: show a single banner and update it in-place when Ready.
// In non-TTY (logs/CI): avoid duplicate blocks; print only the final Ready banner.
if (isTTY) {
  clearScreen();
  drawBoxInPlace(banner());
}

const nextBin = require.resolve('next/dist/bin/next');
const child = spawn(process.execPath, [nextBin, 'dev', '-H', host, '-p', String(port)], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: process.env,
});

let seenReady = false;

function pipeStream(stream, write) {
  let buffer = '';
  stream.setEncoding('utf8');

  stream.on('data', (chunk) => {
    buffer += chunk;
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() ?? '';

    for (const line of parts) {
      if (!seenReady) {
        const readyMs = parseReadyMs(line);
        if (readyMs !== null) {
          seenReady = true;
          const box = banner({ readyMs });
          if (isTTY) {
            drawBoxInPlace(box);
          } else {
            process.stdout.write(box.text);
          }
          continue;
        }

        if (isNextStartupNoise(line)) continue;
      }

      write(line + '\n');
    }
  });

  stream.on('end', () => {
    if (buffer) write(buffer);
  });
}

pipeStream(child.stdout, (s) => process.stdout.write(s));
pipeStream(child.stderr, (s) => process.stderr.write(s));

function forwardSignal(sig) {
  try {
    child.kill(sig);
  } catch {
    // ignore
  }
}

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
