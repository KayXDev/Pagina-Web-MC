const { spawn } = require('child_process');

const port = process.env.PORT || '3000';

function spawnNextDev() {
  const nextBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const args = ['next', 'dev', '-H', '0.0.0.0', '-p', port];

  const child = spawn(nextBin, args, {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (signal) process.exit(0);
    process.exit(code ?? 0);
  });

  return child;
}

function spawnCloudflared() {
  const cloudflaredBin = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
  const url = `http://localhost:${port}`;

  const child = spawn(cloudflaredBin, ['tunnel', '--url', url, '--no-autoupdate'], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('error', (err) => {
    if (err && err.code === 'ENOENT') {
      console.log('\n[share] cloudflared no está instalado; se inicia sin link público.');
      console.log('[share] Instálalo y vuelve a ejecutar:');
      console.log('  macOS (Homebrew): brew install cloudflared');
      console.log('  Windows (winget): winget install Cloudflare.cloudflared');
      console.log('  Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/');
      return;
    }

    console.log(`\n[share] cloudflared error: ${err?.message || err}`);
  });

  return child;
}

const nextDev = spawnNextDev();
const cloudflared = spawnCloudflared();

function shutdown() {
  try {
    if (cloudflared && !cloudflared.killed) cloudflared.kill('SIGINT');
  } catch {}
  try {
    if (nextDev && !nextDev.killed) nextDev.kill('SIGINT');
  } catch {}
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});
