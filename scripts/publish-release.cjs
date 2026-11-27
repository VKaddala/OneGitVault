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
const androidPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../android/package.json'), 'utf8'));
const VERSION = pkg.version;
const ANDROID_VERSION = androidPkg.version;
const IS_ANDROID_ONLY = process.argv.includes('--android');

const TAG_NAME = IS_ANDROID_ONLY ? `v${ANDROID_VERSION}` : `v${VERSION}`;
const RELEASE_NAME = IS_ANDROID_ONLY
  ? `v${ANDROID_VERSION} (Android Minor Update) — 401 Auth Auto-Recovery, 1-Tap PAT Redirect, Spotlight Infinite Loaders & Widget Deep Navigation`
  : `v${VERSION} (Desktop) / v${ANDROID_VERSION} (Android) — Full-Screen Settings, List View, Modal Elimination & Native Status Bar`;

const ANDROID_RELEASE_BODY = `## 🚀 What's New in OneGitVault Android v${ANDROID_VERSION} (Minor Update)

> **OneGitVault is a spotlighter for developers — something like an Instagram Reels and YouTube Shorts scroll for open-source repositories.**

### 🔑 1. Authentication & 401 Auto-Recovery (No More Disappearing Requests)
- **Automatic 401 Public Fallback**: Requests never freeze or disappear when a token expires or is revoked. The API client detects 401, clears the invalid token, and transparently re-issues the request via public guest access.
- **1-Tap GitHub Web Redirect**: Instant token creation with pre-filled scopes (\`public_repo\`, \`gist\`) and description.
- **Automatic Clipboard Token Detection**: Returning to the app auto-detects \`ghp_...\` on clipboard for 1-tap connection.
- **Active User Profile & Live Quota**: Displays avatar, \`@username\`, and 5,000 req/hr rate limit badge with 1-tap disconnect.

### 🎬 2. Spotlight Infinite Scroll Loading & Caught-Up Cards
- **End-of-Feed Snap Card**: Swiping to the end while fetching next batches now snaps into a branded loading card (*"Spotlighting Next Repositories…"*) with zero screen freeze.
- **Floating Pill Indicator**: Non-blocking \`⟳ Loading next spotlight…\` pill at the bottom center while streaming repositories.
- **Caught-Up End Card**: Celebratory *"You're All Caught Up! ✨"* card with 1-tap *"Back to Top"* button when reaching the end of the feed.
- **Smooth Pre-fetch**: Widened scroll threshold so the next batch streams before you hit the bottom.

### 📊 3. Universal Loading Progress & Active Grid Dimming
- **Sticky Top Progress Bar**: Universal \`LinearProgress\` indicator beneath the app bar during search, category filters, and pagination.
- **Active Grid Dimming**: Results dim to 60% opacity while fetching to provide continuous visual feedback during fast interactions.
- **Trending Explorer Smooth Loading**: Filter changes in Trending show a top progress bar without jarring blank screen resets.

### 📲 4. Home Screen Widget Deep-Link Routing Fix
- **Direct Vault Navigation**: Tapping the Home Screen Vault Widget opens directly into the Vault tab (\`onegitvault://tab/vault\`) via native \`onNewIntent\` and intent extra routing.
- **Trending Widget Direct Routing**: Tapping the Trending Widget opens directly into the Trending Explorer tab.

---

### 📦 Official Android Download
| Platform | Binary | Version | Size | Verification |
|---|---|---|---|---|
| **Android** | **\`OneGitVault-Android-${ANDROID_VERSION}.apk\`** | v${ANDROID_VERSION} | ~1.77 MB | Release APK (v1 + v2 signature scheme, \`allowBackup=false\`) |

*Built with Capacitor 6, React 18, TypeScript, Material UI 5, and Vite.*
`;

const RELEASE_BODY = IS_ANDROID_ONLY ? ANDROID_RELEASE_BODY : `## 🚀 What's New in Desktop v${VERSION} & Android v${ANDROID_VERSION}

### 🖥️ Desktop v${VERSION}: Teams-Style Architecture & Modal Elimination
- **Integrated Full-Page Viewports**: Eliminated floating popup modals for Settings and Repository Details. Settings and Details now render as dedicated full-screen views with native keyboard (\`Esc\`) and toolbar back navigation.
- **Repository Observatory Tabs**: Reordered repository details tabs to **\`[ Info | README | Releases ]\`** with \`Info\` set as the default view, displaying complete 6-metric repository health stats, quick clone terminal snippets, and author profiles upfront.
- **2-Zone Edge-to-Edge IDE Status Bar**: Replaced redundant top explore ribbons with a 28px native bottom status bar. Left segment displays connection state and active loaded count (\`All Projects • 33 of 33 loaded\`), while the Right segment groups all interactive toggles (\`Auto-Stream: ON/OFF\`, \`Refresh\`, \`Vault\`, \`Theme\`, and live \`API Quotas\`).
- **Clean TitleBar & Settings Combobox**: Removed legacy dropdown menus from the frameless title bar. Settings now features an uncluttered theme dropdown selector and live telemetry progress meters.

---

### 📱 Android v${ANDROID_VERSION}: Full-Screen Settings, List View & Navigation Stacking
- **Dedicated Full-Page Settings Page**: Replaced the previous modal popup with a native full-screen Android Settings screen featuring safe-area camera cutout padding, live GitHub quota telemetry, and seamless edge-swipe / hardware back button handling.
- **Card & List View Switcher**: Added a tactile Material 3 segmented control (\`[ Card View | List View ]\`) in Settings. Toggling to **List View** switches repository feeds into a sleek 64px horizontal list tile layout, doubling browsing density.
- **Full-Page Personal Access Token Screen**: Converted token management into a top-tier full-screen view (\`zIndex: 1800\`) that reliably overlays all views—including repository details and settings—returning cleanly to the previous screen on completion.
- **Repo Details Star Action Bugfix**: Tapping Star anywhere within the repository details sheet (floating action island, metric card, or title chip) when unauthenticated immediately and reliably launches the Token Connection screen over the details sheet.
- **Theme Dropdown Stacking Fix**: Elevated modal z-index hierarchy so Material-UI \`<Select>\` dropdowns render cleanly above full-screen pages with theme color dots and active checkmarks.
- **Release Flexbox Collision Guard**: Fixed text overflow in repository details where high download counts clipped the "View Releases" button.

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
    const assetsToUpload = IS_ANDROID_ONLY
      ? [
          {
            fileName: `OneGitVault-Android-${ANDROID_VERSION}.apk`,
            filePath: path.resolve(__dirname, `../release/setup/OneGitVault-Android-${ANDROID_VERSION}.apk`)
          }
        ]
      : [
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
