import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const outDir = path.join(root, 'public', 'icons');
await fs.mkdir(outDir, { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#10B981"/>
      <stop offset="0.65" stop-color="#047857"/>
      <stop offset="1" stop-color="#1E3A8A"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="18" fill="url(#g)"/>
  <path d="M15 24a9 9 0 0 1 9-9h16a9 9 0 0 1 9 9v9a9 9 0 0 1-9 9h-9.6L21 49v-7.6A9 9 0 0 1 15 33z" fill="#fff" fill-opacity="0.96"/>
  <path d="M25 28.5h14M25 34h9" stroke="#047857" stroke-width="3.4" stroke-linecap="round"/>
</svg>`;

async function make(size, name, maskable = false) {
  const buf = Buffer.from(svg);
  let img = sharp(buf, { density: 512 }).resize(size, size);
  if (maskable) {
    const inner = Math.round(size * 0.78);
    const pad = Math.round((size - inner) / 2);
    const icon = await sharp(buf, { density: 512 }).resize(inner, inner).png().toBuffer();
    img = sharp({
      create: { width: size, height: size, channels: 4, background: { r: 16, g: 185, b: 129, alpha: 1 } },
    }).composite([{ input: icon, left: pad, top: pad }]);
  }
  await img.png().toFile(path.join(outDir, name));
  console.log('wrote', name);
}

await make(192, 'icon-192.png');
await make(512, 'icon-512.png');
await make(512, 'maskable-512.png', true);
