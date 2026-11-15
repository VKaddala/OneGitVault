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
const TAG_NAME = 'v2.0.0';
const RELEASE_NAME = 'v2.0.0 — Unified TitleBar, In-App GitHub Trending, 4-Column Responsive Grid & Enhanced Vault';

const RELEASE_BODY = `## 🚀 What's New in v2.0.0

### 📐 4-Column Responsive Grid & Compact Modern Cards
- **High-Density Desktop Grid**: Transitioned from a 3-column layout with excessive edge gutters to an expansive, responsive 4-column grid (\`xl:grid-cols-4 2xl:grid-cols-4\`) that maximizes widescreen real estate.
- **Compact & Feature-Rich Project Cards**: Reduced vertical bulk while preserving 100% of interactive capabilities:
  - Instant \`git clone\` copy button with visual checkmark feedback.
  - One-click Vault bookmark toggle with counter updates.
  - Interactive topic pills, language color indicators, and repository license badges.
  - Direct README & Release inspector access on card click.

---

### 🔥 Built-In In-App GitHub Trending Modal
- **Zero Redirection**: Replaced external browser tabs with an integrated, in-app GitHub Trending inspection modal.
- **Time Ranges**: Seamlessly switch between **Daily**, **Weekly**, and **Monthly** trending repositories across the global GitHub ecosystem.
- **Direct README Inspection**: Click any trending repository to immediately preview its documentation and release binaries without losing your place.

---

### 🪟 Unified Frameless Window Header & Flyout Search
- **Unified Titlebar**: Consolidated the native window controls, brand identity, API quota status, trending launcher, vault bookmarks, and theme selector into a single streamlined top header.
- **Expanded Flyout Search Bar**: Clicking the search icon or pressing \`Ctrl+K\` / \`Cmd+K\` reveals a full-width search flyout with quick-filter topic tags and instant keyboard dismissal (\`Esc\`).
- **Mobile & Small-Screen Compliant**: Dynamic flex wrapping and compact button styling prevent overflow even on narrow window dimensions down to 500px.
- **Fixed Theme Palette Trigger**: Permanent palette icon ensures UI consistency across all 5 handcrafted themes.

---

### 🌐 Persistent Location & Clock Footer
- **Live Regional Clock**: Real-time 12-hour ticking digital clock in the bottom footer.
- **Automatic Geo/Timezone Detection**: Detects and displays the user's country and GMT offset (e.g., \`🌐 India (GMT+5:30)\`).

---

### ⭐ Custom Stars Filter Portal
- **Flexible Star Ranges**: Allows filtering from \`All (0+)\` stars up to any custom threshold (\`500\`, \`2,500\`, \`50,000+\`).
- **Body-Portaled Popover**: Portaled to \`document.body\` with high z-index to guarantee it always renders crisply above cards and panels without clipping.

---

### 📦 Downloads & Verification
| File | Type | Architecture | Setup Type |
|---|---|---|---|
| **\`OneGitVault-Setup-2.0.0.exe\`** | Inno Setup Windows Installer | x64 | Clean Upgrade / Seamless Replace |

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
    const installerPath = path.resolve(__dirname, '../release/setup/OneGitVault-Setup-2.0.0.exe');
    if (!fs.existsSync(installerPath)) {
      throw new Error(`Installer file not found at: ${installerPath}`);
    }

    // Check if asset already exists on release
    const existingAsset = (release.assets || []).find(a => a.name === 'OneGitVault-Setup-2.0.0.exe');
    if (existingAsset) {
      console.log(`Asset OneGitVault-Setup-2.0.0.exe already exists (ID: ${existingAsset.id}), deleting old one first...`);
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

    await uploadAsset(release.upload_url, installerPath, 'OneGitVault-Setup-2.0.0.exe');
    console.log(`\n🎉 RELEASE COMPLETE!`);
    console.log(`URL: ${release.html_url}`);
  } catch (err) {
    console.error('Fatal error during release upload:', err);
    process.exit(1);
  }
}

main();
