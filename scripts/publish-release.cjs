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
const RELEASE_NAME = `v${VERSION} (Desktop) / v${ANDROID_VERSION} (Android) — Native UI Redesign, Floating Liquid Glass Island & Rate Limit Fixes`;

const RELEASE_BODY = `## 🚀 What's New in Desktop v${VERSION} & Android v${ANDROID_VERSION}

### 💎 Android Native UI Redesign & Floating Liquid Glass Action Island
- **Floating Capsule Action Island**: Transformed repository details bottom action bar into a floating capsule island with Material 3 glassmorphism, matching bottom navigation physics.
- **Scroll Clearance**: Extended bottom scroll margins so repository content, specs, and topics scroll completely above the floating bottom bar without clipping.
- **Uncluttered Actions**: Streamlined the bottom bar to focus on Star, Translate, APK, GitHub, and Share actions, with clean un-highlighted state.
- **Clean README**: Removed redundant top summary card from the README tab for an unobstructed reading experience.

---

### ℹ️ Comprehensive Repository Info Dashboard
- **6-Metric Health Grid**: Real-time display of Stars, Forks, Watchers, Open Issues, Primary Language, and License without edge bleeding.
- **Android Package Status**: Dedicated APK distribution card displaying package size, filename, and direct 1-tap download.
- **Repository Specifications**: Default branch, creation timestamp, last push/commit relative time, and last updated date.
- **Developer Quick Clone**: Embedded terminal code snippet with one-tap clipboard copy and feedback.
- **Publisher Profile**: Direct link and avatar preview of repository author/organization.

---

### 🛡️ Rate Limit Resilience & Release Caching
- **Multi-Tier Release Caching**: Releases are cached in-memory and persistent \`localStorage\` to eliminate empty release states when browsing multiple repositories.
- **Public Raw CDN Fallback**: README documentation queries \`raw.githubusercontent.com\` first, consuming 0 GitHub API rate limit quota and preserving rate limits for releases.
- **Android Installer Filtering**: Desktop-only binaries (\`.exe\`, \`.dmg\`, \`.deb\`, \`.zip\`) are marked "Desktop only" and disabled, preventing accidental incompatible downloads.
- **Empty State Recovery**: Added retry action and rate limit guidance if GitHub API limits are reached.

---

### 🎯 Trending Horizontal Scroll Fix
- **Negative Overflow Elimination**: Fixed issue in Trending where centered flex alignment pushed the "Today" pill into negative coordinates on mobile screens.

---

### 🗃️ Android Vault Batch Unbookmarking & Multi-Select
- **Multi-Select Mode**: Added "Select" toggle in the Vault view. Tap multiple bookmarks to select/deselect individually or tap **"Select All" / "Deselect All"**.
- **1-Tap Batch Removal**: Remove all selected bookmarks at once with the prominent **"Unbookmark (N)"** action, automatically updating local storage and synchronizing with your private GitHub Gist in the cloud.
- **Smart Badge Clearing**: Visiting the Vault tab immediately clears the notification count badge on the bottom navigation bar.

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

function uploadAsset(uploadUrlTemplate, filePath, fileName, retries = 3) {
  return new Promise(async (resolve, reject) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const uploadUrl = uploadUrlTemplate.replace(/\{(\?name,label)?\}$/, `?name=${encodeURIComponent(fileName)}`);
        const parsedUrl = new URL(uploadUrl);
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        console.log(`⬆️ Uploading ${fileName} (${(fileSize / (1024 * 1024)).toFixed(2)} MB, attempt ${attempt}/${retries})...`);

        await new Promise((resResolve, resReject) => {
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
                resResolve(JSON.parse(data));
              } else {
                console.error(`❌ Upload failed with status ${res.statusCode}: ${data}`);
                resReject(new Error(`Upload failed with status ${res.statusCode}`));
              }
            });
          });

          req.on('error', (err) => {
            console.warn(`Attempt ${attempt} network error for ${fileName}:`, err.message);
            resReject(err);
          });
          fileStream.pipe(req);
        });

        return resolve(true);
      } catch (err) {
        if (attempt === retries) {
          return reject(err);
        }
        console.log(`Waiting 3s before retry...`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  });
}

async function main() {
  try {
    const release = await createRelease();
    const assetsToUpload = [
      {
        fileName: `OneGitVault-Android-${ANDROID_VERSION}.apk`,
        filePath: path.resolve(__dirname, `../release/setup/OneGitVault-Android-${ANDROID_VERSION}.apk`)
      },
      {
        fileName: `OneGitVault-Setup-${VERSION}.exe`,
        filePath: path.resolve(__dirname, `../release/setup/OneGitVault-Setup-${VERSION}.exe`)
      }
    ];

    for (const asset of assetsToUpload) {
      if (!fs.existsSync(asset.filePath)) {
        console.warn(`File not found at: ${asset.filePath}, skipping`);
        continue;
      }

      // Re-fetch current release assets before check to have up-to-date IDs
      const checkRes = await request({
        hostname: 'api.github.com',
        path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases/${release.id}`,
        method: 'GET',
        headers: {
          'User-Agent': 'OneGitVault-Release-Bot',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });
      const currentRelease = checkRes.statusCode === 200 ? JSON.parse(checkRes.body) : release;
      const existingAsset = (currentRelease.assets || []).find(a => a.name === asset.fileName);

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

      try {
        await uploadAsset(release.upload_url, asset.filePath, asset.fileName);
      } catch (uploadErr) {
        console.error(`Failed to upload ${asset.fileName}:`, uploadErr.message);
      }
    }

    console.log(`\n🎉 RELEASE COMPLETE!`);
    console.log(`URL: ${release.html_url}`);
  } catch (err) {
    console.error('Fatal error during release upload:', err);
    process.exit(1);
  }
}

main();
