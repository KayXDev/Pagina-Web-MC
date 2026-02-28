/*
  Delivery worker (run outside Vercel).

  It polls the web app for pending delivery jobs and executes commands on your Minecraft server via RCON.

  Required env:
  - SITE_URL (e.g. https://your-site.vercel.app)
  - DELIVERY_API_KEY (same as in the web app)
  - RCON_HOST (e.g. 127.0.0.1)
  - RCON_PORT (default 25575)
  - RCON_PASSWORD

  Optional env:
  - DELIVERY_POLL_INTERVAL_MS (default 2000)
  - DELIVERY_CLIENT_NAME (default hostname)
*/

const os = require('os');
const { Rcon } = require('rcon-client');

// Convenience: allow running the worker with a local .env file.
// This project already depends on dotenv; if it isn't available (minimal setups), we just skip.
try {
  // Optionally override the env file path with DELIVERY_ENV_FILE.
  require('dotenv').config({ path: process.env.DELIVERY_ENV_FILE || '.env' });
} catch {
  // ignore
}

function required(name) {
  const v = String(process.env[name] || '').trim();
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function numEnv(name, def) {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw) || raw <= 0) return def;
  return Math.floor(raw);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function boolEnv(name, def = false) {
  const raw = String(process.env[name] || '').trim().toLowerCase();
  if (!raw) return def;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'y' || raw === 'on';
}

function normalizeCommand(cmd) {
  // Commands executed via RCON/console should not require a leading '/'.
  // Some servers/plugins accept it, some don't; stripping is safest.
  return String(cmd || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\s+/g, ' ');
}

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = String(data && data.error ? data.error : `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return data;
}

async function main() {
  const siteUrl = required('SITE_URL').replace(/\/$/, '');
  const apiKey = required('DELIVERY_API_KEY');

  const rconHost = required('RCON_HOST');
  const rconPort = numEnv('RCON_PORT', 25575);
  const rconPassword = required('RCON_PASSWORD');

  const pollMs = numEnv('DELIVERY_POLL_INTERVAL_MS', 2000);
  const clientName = String(process.env.DELIVERY_CLIENT_NAME || os.hostname() || 'worker').slice(0, 80);

  const logCommands = boolEnv('DELIVERY_LOG_COMMANDS', false);
  const logResponses = boolEnv('DELIVERY_LOG_RCON_RESPONSES', false);

  const headers = {
    'x-delivery-key': apiKey,
    'x-delivery-client': clientName,
  };

  console.log(`[delivery-worker] starting. site=${siteUrl} rcon=${rconHost}:${rconPort} client=${clientName}`);

  // Keep a single RCON connection and reconnect on failure.
  let rcon = null;
  async function ensureRcon() {
    if (rcon) return rcon;
    rcon = await Rcon.connect({ host: rconHost, port: rconPort, password: rconPassword });
    return rcon;
  }

  while (true) {
    try {
      const res = await fetch(`${siteUrl}/api/deliveries/next`, { headers, cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(String(data && data.error ? data.error : `HTTP ${res.status}`));
      }

      const delivery = data && data.delivery ? data.delivery : null;
      if (!delivery) {
        await sleep(pollMs);
        continue;
      }

      const deliveryId = String(delivery.id || '').trim();
      const commands = Array.isArray(delivery.commands)
        ? delivery.commands.map((c) => normalizeCommand(c)).filter(Boolean)
        : [];

      if (!deliveryId || !commands.length) {
        // Malformed; mark failed so it can retry / be inspected.
        await postJson(`${siteUrl}/api/deliveries/fail`, headers, {
          deliveryId: deliveryId || 'unknown',
          error: 'Malformed delivery payload',
        }).catch(() => null);
        await sleep(250);
        continue;
      }

      console.log(`[delivery-worker] job=${deliveryId} cmds=${commands.length} player=${delivery.minecraftUsername || ''}`);

      try {
        const conn = await ensureRcon();
        for (const cmd of commands) {
          if (logCommands) console.log(`[delivery-worker] rcon> ${cmd}`);
          const resp = await conn.send(cmd);
          if (logResponses && resp) console.log(`[delivery-worker] rcon< ${String(resp).trim()}`);
        }

        await postJson(`${siteUrl}/api/deliveries/complete`, headers, { deliveryId });
        console.log(`[delivery-worker] completed job=${deliveryId}`);
      } catch (err) {
        const message = String(err && err.message ? err.message : err).slice(0, 500);
        console.error(`[delivery-worker] failed job=${deliveryId}: ${message}`);

        // reset rcon connection to force reconnect next loop
        try {
          if (rcon) await rcon.end();
        } catch {
          // ignore
        }
        rcon = null;

        await postJson(`${siteUrl}/api/deliveries/fail`, headers, { deliveryId, error: message }).catch(() => null);
      }

      await sleep(250);
    } catch (err) {
      const message = String(err && err.message ? err.message : err);
      console.error(`[delivery-worker] loop error: ${message}`);
      await sleep(Math.min(10000, pollMs));
    }
  }
}

main().catch((e) => {
  console.error('[delivery-worker] fatal:', e);
  process.exit(1);
});
