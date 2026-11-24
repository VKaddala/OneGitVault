const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function createSvgHtml(size, isRound = false) {
  const rx = isRound ? '50' : '24';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    width: ${size}px;
    height: ${size}px;
    overflow: hidden;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  svg {
    width: ${size}px;
    height: ${size}px;
  }
</style>
</head>
<body>
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="border" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#818cf8" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
    <filter id="glow-star" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#fbbf24" flood-opacity="0.8"/>
    </filter>
    <filter id="glow-code" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#38bdf8" flood-opacity="0.8"/>
    </filter>
    <filter id="glow-git" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#a855f7" flood-opacity="0.8"/>
    </filter>
  </defs>

  <!-- Outer Squircle / Round Container -->
  <rect x="3" y="3" width="94" height="94" rx="${rx}" fill="url(#bg)" stroke="url(#border)" stroke-width="3" />

  <!-- Top Hexagon (GitHub Star Module) -->
  <polygon points="50,14 68,24 68,46 50,56 32,46 32,24" fill="#090d16" stroke="#f59e0b" stroke-width="2.5" stroke-linejoin="round" />
  <polygon points="50,28 52,33 57,34 53,37 54,42 50,39 46,42 47,37 43,34 48,33" fill="#fbbf24" filter="url(#glow-star)" />

  <!-- Bottom Left Hexagon (Code Syntax Module) -->
  <polygon points="30,48 48,58 48,80 30,90 12,80 12,58" fill="#090d16" stroke="#38bdf8" stroke-width="2.5" stroke-linejoin="round" />
  <text x="30" y="73" font-family="Consolas, monospace" font-size="13" font-weight="900" fill="#38bdf8" text-anchor="middle" filter="url(#glow-code)">&lt;/&gt;</text>

  <!-- Bottom Right Hexagon (Git Branch Module) -->
  <polygon points="70,48 88,58 88,80 70,90 52,80 52,58" fill="#090d16" stroke="#a855f7" stroke-width="2.5" stroke-linejoin="round" />
  <circle cx="70" cy="63" r="3.2" fill="#a855f7" filter="url(#glow-git)" />
  <circle cx="63" cy="76" r="2.6" fill="#c084fc" />
  <circle cx="77" cy="76" r="2.6" fill="#c084fc" />
  <path d="M 70 65 L 70 69 M 70 69 L 63 74 M 70 69 L 77 74" stroke="#c084fc" stroke-width="2.2" stroke-linecap="round" />

  <!-- Central Intersection Starlight Node -->
  <circle cx="50" cy="56" r="4.5" fill="#ffffff" stroke="#38bdf8" stroke-width="1.5" />
</svg>
</body>
</html>`;
}

function renderPng(size, outPath, isRound = false) {
  const htmlFile = path.resolve(__dirname, `temp_${size}_${isRound ? 'r' : 's'}.html`);
  fs.writeFileSync(htmlFile, createSvgHtml(size, isRound));
  execSync(`"${CHROME_PATH}" --headless --disable-gpu --screenshot="${outPath}" --window-size=${size},${size} --default-background-color=00000000 "${htmlFile}"`, { stdio: 'pipe' });
  try { fs.unlinkSync(htmlFile); } catch (e) {}
}

function buildIco(pngPaths, outPath) {
  // ICO header: 6 bytes (Reserved 0, Type 1, ImageCount N)
  const count = pngPaths.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  const imageBuffers = [];
  let offset = 6 + count * 16;

  for (const p of pngPaths) {
    const buf = fs.readFileSync(p);
    imageBuffers.push(buf);

    // Read PNG dimensions from IHDR chunk (bytes 16..24)
    let width = buf.readUInt32BE(16);
    let height = buf.readUInt32BE(20);

    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buf.length, 8); // Image size in bytes
    entry.writeUInt32LE(offset, 12); // Offset to image data

    dirEntries.push(entry);
    offset += buf.length;
  }

  const finalBuf = Buffer.concat([header, ...dirEntries, ...imageBuffers]);
  fs.writeFileSync(outPath, finalBuf);
}

async function main() {
  console.log('🎨 Generating Module Mesh Icons...');
  const tmpDir = path.resolve(__dirname, 'temp_icons');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  const sizes = [16, 24, 32, 48, 64, 72, 96, 128, 144, 192, 256, 512];
  for (const s of sizes) {
    renderPng(s, path.join(tmpDir, `icon_${s}.png`), false);
    renderPng(s, path.join(tmpDir, `icon_${s}_round.png`), true);
  }

  const png512 = path.join(tmpDir, 'icon_512.png');
  const png32 = path.join(tmpDir, 'icon_32.png');

  // Desktop Assets
  const desktopIconsDir = path.resolve(__dirname, '../assets/icons');
  if (!fs.existsSync(desktopIconsDir)) fs.mkdirSync(desktopIconsDir, { recursive: true });
  fs.copyFileSync(png512, path.join(desktopIconsDir, 'onegitvault.png'));

  const publicIconsDir = path.resolve(__dirname, '../public/assets/icons');
  if (!fs.existsSync(publicIconsDir)) fs.mkdirSync(publicIconsDir, { recursive: true });
  fs.copyFileSync(png512, path.join(publicIconsDir, 'onegitvault.png'));

  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  fs.copyFileSync(png32, path.join(publicDir, 'favicon.png'));

  // Build Desktop ICO (256, 128, 64, 48, 32, 16)
  const icoSizes = [256, 128, 64, 48, 32, 16].map(s => path.join(tmpDir, `icon_${s}.png`));
  buildIco(icoSizes, path.resolve(__dirname, '../assets/icons/onegitvault.ico'));
  buildIco(icoSizes, path.resolve(__dirname, '../public/favicon.ico'));

  // Android Web & Public Assets
  const androidPublicDir = path.resolve(__dirname, '../android/public');
  if (fs.existsSync(androidPublicDir)) {
    fs.copyFileSync(png32, path.join(androidPublicDir, 'favicon.png'));
    const androidIconsDir = path.join(androidPublicDir, 'assets/icons');
    if (!fs.existsSync(androidIconsDir)) fs.mkdirSync(androidIconsDir, { recursive: true });
    fs.copyFileSync(png512, path.join(androidIconsDir, 'onegitvault.png'));
  }

  // Android Native Mipmaps
  const resDir = path.resolve(__dirname, '../android/android/app/src/main/res');
  if (fs.existsSync(resDir)) {
    const densityMap = {
      'mipmap-mdpi': 48,
      'mipmap-hdpi': 72,
      'mipmap-xhdpi': 96,
      'mipmap-xxhdpi': 144,
      'mipmap-xxxhdpi': 192
    };

    for (const [folder, s] of Object.entries(densityMap)) {
      const folderPath = path.join(resDir, folder);
      if (fs.existsSync(folderPath)) {
        fs.copyFileSync(path.join(tmpDir, `icon_${s}.png`), path.join(folderPath, 'ic_launcher.png'));
        fs.copyFileSync(path.join(tmpDir, `icon_${s}_round.png`), path.join(folderPath, 'ic_launcher_round.png'));
        fs.copyFileSync(path.join(tmpDir, `icon_${s}.png`), path.join(folderPath, 'ic_launcher_foreground.png'));
      }
    }

    // Splash
    const splashDir = path.join(resDir, 'drawable');
    if (fs.existsSync(splashDir)) {
      fs.copyFileSync(path.join(tmpDir, 'icon_256.png'), path.join(splashDir, 'splash.png'));
    }
  }

  // Cleanup
  for (const s of sizes) {
    try {
      fs.unlinkSync(path.join(tmpDir, `icon_${s}.png`));
      fs.unlinkSync(path.join(tmpDir, `icon_${s}_round.png`));
    } catch (e) {}
  }
  try { fs.rmdirSync(tmpDir); } catch (e) {}

  console.log('✅ Module Mesh Icon generation completed across desktop and Android!');
}

main().catch(console.error);
