/**
 * Marca un usuario como OWNER y le asigna tags.
 *
 * Uso:
 *   node scripts/set-owner.js --email tu@email.com --tags OWNER,FOUNDER
 *
 * Requiere:
 *   MONGODB_URI en el entorno
 */

const mongoose = require('mongoose');
require('dotenv').config();

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      args[key.slice(2)] = true;
    } else {
      args[key.slice(2)] = value;
      i++;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const email = (args.email || process.env.ADMIN_EMAIL || '').toString().trim().toLowerCase();
  const rawTags = (args.tags || 'OWNER').toString();
  const tags = rawTags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  if (!process.env.MONGODB_URI) {
    console.error('❌ Falta MONGODB_URI en el entorno');
    process.exit(1);
  }

  if (!email) {
    console.error('❌ Debes pasar --email o definir ADMIN_EMAIL');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['USER', 'STAFF', 'ADMIN', 'OWNER'], default: 'USER' },
    tags: { type: [String], default: [] },
  });

  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  const user = await User.findOne({ email });
  if (!user) {
    console.error(`❌ No existe un usuario con email: ${email}`);
    process.exit(1);
  }

  user.role = 'OWNER';
  user.tags = Array.from(new Set([...(Array.isArray(user.tags) ? user.tags : []), ...tags]));
  await user.save();

  console.log('✅ Usuario actualizado a OWNER');
  console.log(`   Email: ${user.email}`);
  console.log(`   Username: ${user.username}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Tags: ${(user.tags || []).join(', ')}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
