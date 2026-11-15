const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

function getGitToken() {
  try {
    const creds = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8'
    });
    for (const line of creds.split('\n')) {
      if (line.startsWith('password=')) {
        return line.slice('password='.length).trim();
      }
    }
  } catch (e) {
    console.error('Failed to get token from git credential', e.message);
  }
  return process.env.GITHUB_TOKEN || '';
}

const token = getGitToken();
if (!token) {
  console.error('No GitHub token found!');
  process.exit(1);
}

const REPO_OWNER = 'VKaddala';
const REPO_NAME = 'OneGitVault';
const TAG_NAME = 'v1.0.4';
const RELEASE_NAME = 'v1.0.4 — Modular Theme Architecture, Theme Selector Popup & GitHub Themes';

const RELEASE_BODY = `## 🚀 What's New in v1.0.4

### 🎨 Modular Theme Plugin Architecture
- **Plugin-Based Themes**: Introduced a type-safe \`ThemePlugin\` contract and central \`ThemeRegistry\` (\`src/themes/\`), decoupling color definitions from UI code.
- **Header Theme Selector Popup**: Replaced simple button cycling with an elevated, solid opaque theme selection popup rendered via portals. Features dual-panel live preview swatches, light/dark mode tags, palette subtitles, and active checkmarks.
- **5 High-Contrast Handcrafted Themes**:
  1. **Prometheus Dark**: Deep cinematic petrol teal (\`#0c1519\` / \`#16272f\`) with vermilion flame accents (\`#e64833\`) and biscuit typography (\`#fbe9d0\`).
  2. **Sand & Ivory Light**: Warm biscuit sand canvas (\`#FBE9D0\`) with bright ivory cards (\`#FFF9F0\`), petrol headings, and vermilion pills.
  3. **Ambient Twilight**: Cool midnight slate (\`#0a0e14\` / \`#161e2b\`) with serene sky-cyan accents (\`#38bdf8\`) designed for relaxed long-session comfort.
  4. **GitHub Simple Light**: Off-white canvas (\`#f6f8fa\`) with crisp white elevated cards (\`#ffffff\`), dark charcoal typography, and classic GitHub blue highlights (\`#0969da\`).
  5. **GitHub Simple Dark**: Deep GitHub slate canvas (\`#0d1117\`) with elevated containers (\`#1c2128\`), gold stars (\`#e3b341\`), and signature blue accents (\`#1f6feb\`).

---

### 🛠️ Bug Fixes & Visual Polish
- **Transparent Background Elimination**: Resolved an issue where Tailwind CSS variables with slash-opacity generated invalid CSS rules, causing components to drop their backgrounds.
- **Elevated Contrast Ratios**: Re-tuned container-to-canvas deltas and card borders across all themes to eliminate flat/washed-out cards.
- **Vibrant Selection & Hover States**: Ensured active category pills, star tiers, and the Auto-Stream toggle prominently highlight with the active theme's signature accent.

---

### 🏛️ Modular SOLID Refactoring
- **Custom Hooks**: Extracted repository querying, pagination, and streaming into \`useRepositories\`, and bookmark state into \`useBookmarks\`.
- **Domain Services**: Decoupled rate-limit handling into \`rateLimitManager\` with a subscriber pattern, and storage interactions into \`storageService\`.

---

### 📦 Downloads & Verification
| File | Type | Architecture | SHA-256 / Size |
|---|---|---|---|
| **\`OneGitVault-Setup-1.0.4.exe\`** | Inno Setup Windows Installer | x64 | ~83.9 MB |

*Built with Electron 33, React 18, TypeScript, and Vite.*
`;

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function createRelease() {
  console.log(`📦 Creating GitHub Release for ${TAG_NAME}...`);
  const payload = JSON.stringify({
    tag_name: TAG_NAME,
    target_commitish: 'main',
    name: RELEASE_NAME,
    body: RELEASE_BODY,
    draft: false,
    prerelease: false
  });

  const res = await request({
    hostname: 'api.github.com',
    path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases`,
    method: 'POST',
    headers: {
      'User-Agent': 'OneGitVault-Release-Bot',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, payload);

  if (res.statusCode >= 200 && res.statusCode < 300) {
    const release = JSON.parse(res.body);
    console.log(`✅ Release created: ${release.html_url} (ID: ${release.id})`);
    return release;
  } else {
    // If release already exists, fetch it
    console.warn(`Release create returned status ${res.statusCode}: ${res.body}`);
    const getRes = await request({
      hostname: 'api.github.com',
      path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases/tags/${TAG_NAME}`,
      method: 'GET',
      headers: {
        'User-Agent': 'OneGitVault-Release-Bot',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    });
    if (getRes.statusCode === 200) {
      const release = JSON.parse(getRes.body);
      console.log(`Found existing release: ${release.html_url} (ID: ${release.id})`);
      return release;
    }
    throw new Error(`Failed to create or get release: ${res.body}`);
  }
}

function uploadAsset(uploadUrlTemplate, filePath, fileName) {
  return new Promise((resolve, reject) => {
    const uploadUrl = uploadUrlTemplate.replace(/\{(\?name,label)?\}$/, `?name=${encodeURIComponent(fileName)}`);
    const parsedUrl = new URL(uploadUrl);
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    console.log(`⬆️ Uploading ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)...`);

    const fileStream = fs.createReadStream(filePath);

    const req = https.request({
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'User-Agent': 'OneGitVault-Release-Bot',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileSize
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Successfully uploaded ${fileName}!`);
          resolve(JSON.parse(data));
        } else {
          console.error(`❌ Upload failed with status ${res.statusCode}: ${data}`);
          reject(new Error(data));
        }
      });
    });

    req.on('error', reject);
    fileStream.pipe(req);
  });
}

async function main() {
  try {
    const release = await createRelease();
    const installerPath = path.resolve(__dirname, '../release/setup/OneGitVault-Setup-1.0.4.exe');
    if (!fs.existsSync(installerPath)) {
      throw new Error(`Installer file not found at: ${installerPath}`);
    }

    // Check if asset already exists on release
    const existingAsset = (release.assets || []).find(a => a.name === 'OneGitVault-Setup-1.0.4.exe');
    if (existingAsset) {
      console.log(`Asset OneGitVault-Setup-1.0.4.exe already exists (ID: ${existingAsset.id}), deleting old one first...`);
      await request({
        hostname: 'api.github.com',
        path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases/assets/${existingAsset.id}`,
        method: 'DELETE',
        headers: {
          'User-Agent': 'OneGitVault-Release-Bot',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });
    }

    await uploadAsset(release.upload_url, installerPath, 'OneGitVault-Setup-1.0.4.exe');
    console.log(`\n🎉 RELEASE COMPLETE!`);
    console.log(`URL: ${release.html_url}`);
  } catch (err) {
    console.error('Fatal error during release upload:', err);
    process.exit(1);
  }
}

main();
