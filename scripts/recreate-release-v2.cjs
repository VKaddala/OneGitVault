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
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('1. Checking existing releases on GitHub...');
  const res = await request({
    hostname: 'api.github.com',
    path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases`,
    method: 'GET',
    headers: {
      'User-Agent': 'OneGitVault-Release-Bot',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json'
    }
  });

  const releases = JSON.parse(res.body);
  console.log(`Found ${releases.length} releases.`);
  for (const r of releases) {
    console.log(`- ID: ${r.id}, Tag: ${r.tag_name}, Name: ${r.name}, Published: ${r.published_at}, Latest: ${r.make_latest || r.latest}`);
    for (const asset of (r.assets || [])) {
      console.log(`    Asset: ${asset.name} (${asset.size} bytes)`);
    }
  }

  // Find release for v2.0.0
  const v2Release = releases.find(r => r.tag_name === 'v2.0.0');
  if (v2Release) {
    console.log(`Found existing v2.0.0 release with ID ${v2Release.id}. Deleting it so we can create a fresh release at the top...`);
    const delRes = await request({
      hostname: 'api.github.com',
      path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases/${v2Release.id}`,
      method: 'DELETE',
      headers: {
        'User-Agent': 'OneGitVault-Release-Bot',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    });
    console.log(`Delete release response code: ${delRes.statusCode}`);
  }

  // Delete remote tag v2.0.0 if it exists
  console.log('2. Updating git tag v2.0.0 to point to latest HEAD...');
  try {
    execSync('git push origin :refs/tags/v2.0.0', { stdio: 'inherit' });
  } catch (e) {
    console.log('Remote tag v2.0.0 may not exist, continuing...');
  }

  try {
    execSync('git tag -d v2.0.0', { stdio: 'inherit' });
  } catch (e) {
    console.log('Local tag v2.0.0 may not exist, continuing...');
  }

  execSync('git tag v2.0.0', { stdio: 'inherit' });
  execSync('git push origin v2.0.0', { stdio: 'inherit' });

  // Get current commit hash
  const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  console.log(`Tag v2.0.0 pushed at commit: ${commitHash}`);

  // Create fresh release
  console.log('3. Creating fresh GitHub release v2.0.0...');
  const releaseName = 'v2.0.0 (Android Feature Launch) — Spotlight Reels for Developers, Living Vault Radar, Home Screen Widgets & OLED Visual Cards';
  const releaseBody = `## 🚀 What's New in OneGitVault Android v2.0.0 (Major Feature Launch)

> **OneGitVault is a spotlighter for developers — something like an Instagram Reels and YouTube Shorts scroll for open-source repositories.**

### 🎬 1. Spotlight Feed — "Reels for Developers"
- **Infinite Vertical Snap-Feed**: Full-screen vertical reels, distilling repository READMEs into clean cards with an **Elevator Pitch ("What It Is & Solves")**, **3 Key Highlights**, language/stars telemetry, and demo screenshots.
- **Pinch-to-Zoom Media Viewer**: Tap any project screenshot or architectural diagram to expand full-screen with 4× pinch zoom, smooth pan, double-tap reset, and universal Android edge-swipe dismissal.
- **Double-Tap to Vault**: Double-tap any card for an instant haptic pulse and animated pop-heart bookmarking gesture.
- **Floating Quick-Actions Dock**: Compact bottom-right trigger (\`⋯\`) expanding an action dock (\`Star\`, \`Vault\`, \`Readme\`, \`Share\`, \`Card\`, \`GitHub\`) that auto-closes when scrolling or switching tabs.

### 🖼️ 2. Pure OLED Black Visual Social Cards
- **One-Tap "Share as Card"**: Export a stunning, high-DPI social media card ready for WhatsApp, X (Twitter), LinkedIn, and Telegram.
- **Pure OLED Black (#000000) Aesthetic**: Clean, seamless pure black styling with glowing language accent tags and star telemetry.
- **Zero-Blink Headless Render**: Off-screen headless rendering via \`html2canvas\` \`onclone\` with immediate haptic response and non-blocking asynchronous event loop scheduling.

### 🛡️ 3. The Living Vault — "Never Forget What You Starred"
- **"What Changed" Changelog Radar**: Background WorkManager periodically scans bookmarked repositories for new releases and tags with an unread badge counter.
- **Full-Screen Changelog Dashboard**: Browse release notes with direct repo navigation, one-tap "Dismiss All", and per-repo "Ignore Updates" radar controls.
- **Private Developer Notes & Tags**: Attach personal notes (e.g., *"Use this auth library for billing service"*) and custom tags to any bookmarked repo.
- **Smart Reminders**: Schedule weekend revisit alerts so discovered tools become real software.

### 📲 4. Native Android Home Screen Widgets
- **Trending Repo Widget (4×2)**: Cycles through top daily and weekly trending repositories in preferred languages right on your Android home screen.
- **Vault Release Tracker Widget**: Glances the latest release tags and changelogs from watched/starred projects directly from your home screen.

### 📳 5. Universal Micro-Haptics & GitHub Dark/Light Themes
- **Native Haptics**: Subtle tactile vibrations across all tabs, buttons, gestures, and actions with a Settings toggle.
- **GitHub Dark & Light Themes**: Pixel-perfect OLED contrast and automatic system night-mode tracking.
- **PolyForm Noncommercial License 1.0.0**: Fully aligned open-source noncommercial license.

---

### 📦 Official Android Download
| Platform | Binary | Version | Size | Verification |
|---|---|---|---|---|
| **Android** | **\`OneGitVault-Android-2.0.0.apk\`** | v2.0.0 | ~1.76 MB | Release APK (v1 + v2 signature scheme, \`allowBackup=false\`) |

*Built with Capacitor 6, React 18, TypeScript, Material UI 5, and Vite.*
`;

  const createPayload = JSON.stringify({
    tag_name: 'v2.0.0',
    target_commitish: commitHash,
    name: releaseName,
    body: releaseBody,
    draft: false,
    prerelease: false,
    make_latest: 'true'
  });

  const createRes = await request({
    hostname: 'api.github.com',
    path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases`,
    method: 'POST',
    headers: {
      'User-Agent': 'OneGitVault-Release-Bot',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(createPayload)
    }
  }, createPayload);

  if (createRes.statusCode < 200 || createRes.statusCode >= 300) {
    console.error(`Failed to create release: status ${createRes.statusCode}`, createRes.body);
    process.exit(1);
  }

  const newRelease = JSON.parse(createRes.body);
  console.log(`✅ Fresh release created successfully! URL: ${newRelease.html_url} (ID: ${newRelease.id})`);

  // Upload APK asset
  const apkPath = path.resolve(__dirname, '../release/setup/OneGitVault-Android-2.0.0.apk');
  if (!fs.existsSync(apkPath)) {
    console.error(`APK not found at ${apkPath}`);
    process.exit(1);
  }

  const apkStats = fs.statSync(apkPath);
  const assetName = 'OneGitVault-Android-2.0.0.apk';
  console.log(`4. Uploading asset ${assetName} (${apkStats.size} bytes)...`);

  const uploadUrl = new URL(newRelease.upload_url.replace(/\{(\?name,label|\?name)\}/, `?name=${encodeURIComponent(assetName)}`));
  const fileStream = fs.createReadStream(apkPath);

  await new Promise((resolve, reject) => {
    const uploadReq = https.request({
      hostname: uploadUrl.hostname,
      path: uploadUrl.pathname + uploadUrl.search,
      method: 'POST',
      headers: {
        'User-Agent': 'OneGitVault-Release-Bot',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': apkStats.size
      }
    }, (uploadRes) => {
      let data = '';
      uploadRes.on('data', chunk => data += chunk);
      uploadRes.on('end', () => {
        if (uploadRes.statusCode >= 200 && uploadRes.statusCode < 300) {
          console.log(`✅ Asset ${assetName} uploaded successfully!`);
          resolve(JSON.parse(data));
        } else {
          console.error(`Upload asset failed: ${uploadRes.statusCode}`, data);
          reject(new Error(`Asset upload failed with ${uploadRes.statusCode}`));
        }
      });
    });

    uploadReq.on('error', reject);
    fileStream.pipe(uploadReq);
  });

  console.log('🎉 Done! GitHub Release v2.0.0 is now live and marked as latest with the APK attached!');
}

run().catch(err => {
  console.error('Error occurred:', err);
  process.exit(1);
});
