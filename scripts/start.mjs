import { spawn } from 'child_process';
import process from 'process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const nextBin = require.resolve('next/dist/bin/next');
const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || '3000';

const child = spawn(process.execPath, [nextBin, 'start', '-H', host, '-p', String(port)], {
  stdio: 'inherit',
  env: process.env,
});

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
