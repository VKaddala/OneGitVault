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
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
const VERSION = pkg.version;
const TAG_NAME = `v${VERSION}`;
const RELEASE_NAME = `v${VERSION} — System Theme Auto-Default, Google Rounded Sans, Star Integration & Themed Filters`;

const RELEASE_BODY = `## 🚀 What's New in v${VERSION}

### 🌓 System Theme Auto-Default (GitHub Simple Light & Dark)
- **Automatic OS Theme Alignment**: OneGitVault now intelligently detects your operating system theme preference:
  - Defaults to **GitHub Simple Light** on light mode.
  - Defaults to **GitHub Simple Dark** on dark mode.
  - Actively listens to system theme transitions in real time while preserving any explicitly chosen theme overrides.
- **Instant Paint**: Zero flash of unstyled content (FOUC) on startup.

---

### 🔤 Google Rounded Sans Typography (Nunito & Google Sans)
- **Enhanced Legibility**: Applied Google rounded sans (\`Nunito\` / \`Google Sans\`) across cards, titles, descriptions, and detail dialogs for soft, modern, high-comfort reading.
- **Proportional Numbers**: Replaced rigid typewriter monospace fonts on repository numbers, star counters, and filter tags with beautifully proportioned rounded numerals.

---

### 🎛️ Custom-Themed Floating Dropdown Filters
- **Native OS Selects Replaced**: FilterBar dropdowns for Category, Sorting, and Language now feature custom-styled floating popover menus with sector icons, checkmarks, search inputs, and backdrop blur.
- **New Technology Sectors**: Added dedicated filters for "Android & APK Releases" and "Videography & Media Tools".

---

### ⭐ Direct GitHub Repository Starring
- **Interactive Star Toggle**: Authenticated users can now star or unstar repositories directly from the app with live counter feedback and visual pulse animations.

---

### ⏱️ Decoupled API Quotas & Gist Sync Fixes
- **Separated Quotas**: Independently tracks Core (5,000 req/hr) and Search (30 req/min) rate limits with 2s live polling and countdown timers.
- **Reliable Gist Bookmarks**: Fixed "No backup found" bug by querying single Gist endpoints directly by ID.
- **Streamlined Navigation**: Clean, uncluttered icon-only \`[ ← ]\` back navigation in repository details.

---

### 📦 Downloads & Verification
| File | Type | Architecture | Setup Type |
|---|---|---|---|
| **\`OneGitVault-Setup-${VERSION}.exe\`** | Inno Setup Windows Installer | x64 | Clean Upgrade / Seamless Replace |

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
    const installerName = `OneGitVault-Setup-${VERSION}.exe`;
    const installerPath = path.resolve(__dirname, `../release/setup/${installerName}`);
    if (!fs.existsSync(installerPath)) {
      throw new Error(`Installer file not found at: ${installerPath}`);
    }

    // Check if asset already exists on release
    const existingAsset = (release.assets || []).find(a => a.name === installerName);
    if (existingAsset) {
      console.log(`Asset ${installerName} already exists (ID: ${existingAsset.id}), deleting old one first...`);
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

    await uploadAsset(release.upload_url, installerPath, installerName);
    console.log(`\n🎉 RELEASE COMPLETE!`);
    console.log(`URL: ${release.html_url}`);
  } catch (err) {
    console.error('Fatal error during release upload:', err);
    process.exit(1);
  }
}

main();
