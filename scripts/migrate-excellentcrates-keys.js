/*
  Migration: update shop KEY products to use ExcellentCrates key IDs.

  Usage (dry-run):
    node scripts/migrate-excellentcrates-keys.js

  Apply changes:
    node scripts/migrate-excellentcrates-keys.js --apply

  Notes:
  - Requires MONGODB_URI in env (same as web app).
  - Only targets products with category === 'KEYS'.
  - Detects key id from product name/description: epic, omega, prime, rare, vote.
  - Detects pack amount from the first number in the product name (e.g., "Pack 5 ..." -> 5).
  - For single-key products, uses {qty} so cart quantity works.
*/

const mongoose = require('mongoose');

try {
  require('dotenv').config({ path: process.env.DELIVERY_ENV_FILE || '.env' });
} catch {
  // ignore
}

function required(name) {
  const v = String(process.env[name] || '').trim();
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function foldText(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function detectKeyId(product) {
  const hay = foldText(`${product.name || ''} ${product.description || ''}`);

  if (/(^|\b)omega(\b|$)/.test(hay)) return 'omega';
  if (/(^|\b)prime(\b|$)/.test(hay)) return 'prime';
  if (/(^|\b)rare(\b|$)/.test(hay) || /\brara(s)?\b/.test(hay)) return 'rare';
  if (/(^|\b)vote(\b|$)/.test(hay) || /\bvoto(s)?\b/.test(hay)) return 'vote';

  // Must come last because many packs mention "epic" generically.
  if (/(^|\b)epic(a|o|as|os)?(\b|$)/.test(hay) || /\bepic\b/.test(hay)) return 'epic';

  // Spanish accents: "Épica" -> "epica" after folding.
  if (/\bepica(s)?\b/.test(hay) || /\bepico(s)?\b/.test(hay)) return 'epic';

  return null;
}

function detectAmountFromName(name) {
  const m = String(name || '').match(/\b(\d{1,3})\b/);
  if (!m) return 1;
  const n = Math.max(1, Math.floor(Number(m[1])));
  return Number.isFinite(n) ? n : 1;
}

function buildCommands(keyId, amount) {
  if (amount <= 1) {
    // For 1-key products, respect cart quantity.
    return [`crates key give {user} ${keyId} {qty} -sf`];
  }
  // For packs (e.g. 5 keys), use a fixed amount.
  return [`crates key give {user} ${keyId} ${amount} -sf`];
}

async function main() {
  const apply = process.argv.includes('--apply');
  const mongodbUri = required('MONGODB_URI');

  await mongoose.connect(mongodbUri, { bufferCommands: false });

  const ProductSchema = new mongoose.Schema(
    {
      name: String,
      description: String,
      category: String,
      deliveryCommands: [String],
    },
    { timestamps: true, strict: false }
  );

  const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

  const products = await Product.find({ category: 'KEYS' }).lean();
  if (!products.length) {
    console.log('[migrate-excellentcrates-keys] No KEY products found.');
    await mongoose.disconnect();
    return;
  }

  let changed = 0;
  let skipped = 0;

  for (const p of products) {
    const keyId = detectKeyId(p);
    if (!keyId) {
      skipped++;
      continue;
    }

    const amount = detectAmountFromName(p.name);
    const nextCommands = buildCommands(keyId, amount);

    const prevCommands = Array.isArray(p.deliveryCommands) ? p.deliveryCommands.map((c) => String(c || '').trim()).filter(Boolean) : [];
    const prevJoined = prevCommands.join('\n');
    const nextJoined = nextCommands.join('\n');

    if (prevJoined === nextJoined) {
      continue;
    }

    changed++;
    console.log(`\n[migrate-excellentcrates-keys] ${apply ? 'UPDATE' : 'DRY-RUN'} product=${p._id}`);
    console.log(`  name: ${p.name}`);
    console.log(`  keyId: ${keyId}  amount: ${amount}`);
    console.log('  from:', prevCommands.length ? prevCommands : '(empty)');
    console.log('  to:  ', nextCommands);

    if (apply) {
      await Product.updateOne({ _id: p._id }, { $set: { deliveryCommands: nextCommands } });
    }
  }

  console.log(`\n[migrate-excellentcrates-keys] Done. changed=${changed} skipped_no_key_match=${skipped} apply=${apply}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[migrate-excellentcrates-keys] fatal:', err);
  process.exit(1);
});
