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
const ANDROID_VERSION = '1.1.0';
const TAG_NAME = `v${VERSION}`;
const RELEASE_NAME = `v${VERSION} (Desktop) / v${ANDROID_VERSION} (Android) — Batch Vault Unbookmarking, Badge Clearing & Performance Fixes`;

const RELEASE_BODY = `## 🚀 What's New in Desktop v${VERSION} & Android v${ANDROID_VERSION}

### 🗃️ Android Vault Batch Unbookmarking & Multi-Select
- **Multi-Select Mode**: Added "Select" toggle in the Vault view. Tap multiple bookmarks to select/deselect individually or tap **"Select All" / "Deselect All"**.
- **1-Tap Batch Removal**: Remove all selected bookmarks at once with the prominent **"Unbookmark (N)"** action, automatically updating local storage and synchronizing with your private GitHub Gist in the cloud.
- **Smart Badge Clearing**: Visiting the Vault tab immediately clears the notification count badge on the bottom navigation bar.

---

### ⚡ Ultra-Fluid Bottom Navigation & Instant Switching
- **Zero-Latency Tab Transitions**: Decoupled APKs, Trending, Vault, and Explore into persistently mounted views, eliminating full-tree remounts and redundant API refetching when switching tabs.
- **Removed Tap Delays**: Enabled \`touch-action: manipulation\` to eliminate mobile 300ms tap latency.
- **Targeted Scroll**: Tapping between different tabs preserves your exact scroll position; only tapping the already-active tab scrolls smoothly to the top.

---

### 📖 README Viewer Link Navigation Fixes
- **Internal Heading Anchors**: Clicking table of contents links (e.g. \`#installation\`, \`#usage\`) now smoothly scrolls directly to the corresponding section within the modal.
- **Relative Repo Links**: Document links (e.g. \`docs/guide.md\`, \`./LICENSE\`) automatically resolve to GitHub web URLs in the device browser.
- **Heading ID Retention**: DOMPurify sanitization preserves \`id\` and \`name\` attributes on markdown headers.

---

### ✨ Crisp High-Resolution Launch Branding
- **Pixelation Elimination**: Replaced low-res raster favicon in the app splash loader with an infinite-resolution inline vector SVG logo with smooth pulsing animations, ensuring crisp visuals on high-DPI displays.

---

### 🌐 Desktop Ultra-Fast Translation Support (Google Anycast Edge CDN)
- **On-Demand Translation**: Ported Android's edge CDN translation engine directly into Desktop (\`src/services/translateService.ts\`).
- **Markdown Documentation**: Instant translation of non-English README documentation in \`RepoDetailPanel\` with parallel paragraph chunking (~2,000 chars) via \`Promise.all()\`.
- **Card-Level Descriptions**: Direct inline translation toggles on \`ProjectCard\` (both Grid & List views) and detail modals.
- **Markdown & Code Protection**: Fenced code blocks (\`\`\`...\`\`\`), inline code snippets (\`...\`), and badges are preserved untouched during translation.

---

### 🛡️ Android Vault Alert Banner & Error Layout Redesign
- **Full-Width Diagnostic Alert**: Resolved issue where long GitHub error messages (such as missing \`gist\` scope) overflowed horizontally and squeezed the action icons.
- **Responsive Stacking**: Action buttons ("Pull from Gist", "Push to Gist") now maintain their dedicated top row, while status messages render below in a responsive Material-UI \`Alert\` banner.

---

### 👤 Publisher Identity (VKaddala)
- Standardized publisher and author metadata to **VKaddala** across Windows Inno Setup installer metadata, package manifests, and Android application resources.

---

### 📦 Official Downloads & Verification
| Platform | Binary | Version | Size | Verification |
|---|---|---|---|---|
| **Windows Desktop** | **\`OneGitVault-Setup-${VERSION}.exe\`** | v${VERSION} | ~98 MB | Inno Setup x64 Installer (Interactive & Silent \`/VERYSILENT\` restart) |
| **Android** | **\`OneGitVault-Android-${ANDROID_VERSION}.apk\`** | v${ANDROID_VERSION} | ~3.5 MB | Release APK (v2 signature scheme verified) |

*Built with Electron 33, Capacitor 8, React 18, TypeScript, and Vite.*
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
      let release = JSON.parse(getRes.body);
      console.log(`Found existing release: ${release.html_url} (ID: ${release.id})`);

      // Update title and body of existing release
      const patchRes = await request({
        hostname: 'api.github.com',
        path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases/${release.id}`,
        method: 'PATCH',
        headers: {
          'User-Agent': 'OneGitVault-Release-Bot',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, payload);

      if (patchRes.statusCode >= 200 && patchRes.statusCode < 300) {
        release = JSON.parse(patchRes.body);
        console.log(`✅ Release details updated successfully!`);
      }
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
    const assetsToUpload = [
      {
        fileName: `OneGitVault-Setup-${VERSION}.exe`,
        filePath: path.resolve(__dirname, `../release/setup/OneGitVault-Setup-${VERSION}.exe`)
      },
      {
        fileName: `OneGitVault-Android-${ANDROID_VERSION}.apk`,
        filePath: path.resolve(__dirname, `../release/setup/OneGitVault-Android-${ANDROID_VERSION}.apk`)
      }
    ];

    for (const asset of assetsToUpload) {
      if (!fs.existsSync(asset.filePath)) {
        throw new Error(`File not found at: ${asset.filePath}`);
      }

      const existingAsset = (release.assets || []).find(a => a.name === asset.fileName);
      if (existingAsset) {
        console.log(`Asset ${asset.fileName} already exists (ID: ${existingAsset.id}), deleting old one first...`);
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

      await uploadAsset(release.upload_url, asset.filePath, asset.fileName);
    }

    console.log(`\n🎉 RELEASE COMPLETE!`);
    console.log(`URL: ${release.html_url}`);
  } catch (err) {
    console.error('Fatal error during release upload:', err);
    process.exit(1);
  }
}

main();
