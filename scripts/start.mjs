import { spawn } from 'child_process';
import process from 'process';
import { createRequire } from 'module';
import { runLicenseStartupCheck } from './license-check.mjs';

const require = createRequire(import.meta.url);

const licenseCheck = await runLicenseStartupCheck();

if (!licenseCheck.ok) {
  console.log('――――――――――――――――――――――――――――――――――――');
  console.log('\x1b[31m%s\x1b[0m', licenseCheck.title || 'License Authentication failed');
  console.log('\x1b[33m%s\x1b[0m', licenseCheck.detail || licenseCheck.message || 'License validation failed');
  console.log('――――――――――――――――――――――――――――――――――――');
  process.exit(1);
}

console.log('――――――――――――――――――――――――――――――――――――');
console.log('\x1b[32m%s\x1b[0m', licenseCheck.title || 'Your license key is valid!');
console.log('\x1b[36m%s\x1b[0m', 'Discord ID: ' + String(licenseCheck.discordId || 'unknown'));
console.log('――――――――――――――――――――――――――――――――――――');

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
