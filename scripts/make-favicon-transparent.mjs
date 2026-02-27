import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const inputPath = path.join(projectRoot, 'public', 'icon.png');
const outputPath = path.join(projectRoot, 'public', 'favicon.png');

if (!fs.existsSync(inputPath)) {
  console.error(`Input not found: ${inputPath}`);
  process.exit(1);
}

const inputBuffer = fs.readFileSync(inputPath);
const png = PNG.sync.read(inputBuffer);

// Make near-white pixels transparent (simple chroma key).
// If your logo has white details, lower this threshold.
const threshold = Number(process.env.FAVICON_WHITE_THRESHOLD ?? 250);
const softness = Number(process.env.FAVICON_WHITE_SOFTNESS ?? 10);

for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const idx = (png.width * y + x) << 2;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    const a = png.data[idx + 3];

    if (a === 0) continue;

    const min = Math.min(r, g, b);
    if (min >= threshold) {
      // Fully transparent for near-white.
      png.data[idx + 3] = 0;
      continue;
    }

    // Soft edge: gradually fade very bright pixels.
    // This helps avoid jagged edges when the background isn't pure white.
    const brightness = (r + g + b) / 3;
    const fadeStart = threshold - softness;
    if (brightness > fadeStart) {
      const t = Math.min(1, Math.max(0, (brightness - fadeStart) / Math.max(1, softness)));
      png.data[idx + 3] = Math.round(a * (1 - t));
    }
  }
}

fs.writeFileSync(outputPath, PNG.sync.write(png));
console.log(`Wrote: ${outputPath}`);
