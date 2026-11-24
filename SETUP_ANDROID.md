# OneGitVault for Android — Setup & Build Guide

<p align="center">
  <img src="assets/icons/onegitvault.png" alt="OneGitVault Logo" width="80" height="80" />
</p>

<p align="center">
  <strong>Complete guide for building, running, and contributing to OneGitVault on Android</strong>
</p>

---

## 📱 Overview

**OneGitVault for Android** brings the desktop GitHub observatory to mobile devices with a native, edge-to-edge touch experience.

### Key Highlights
- **Native Edge-to-Edge System Bars**: Transparent status bar and navigation bar with automatic light/dark icon contrast switching via `AndroidThemeBridge` and `WindowInsetsControllerCompat`.
- **Ultra-Smooth 120Hz Scrolling**: Hardware-accelerated animations, throttled frame listeners, and low-memory tile layouts.
- **Dual Vault Architecture**:
  - **Vault Bookmarks**: Local bookmark store with automatic bidirectional GitHub Gist cloud synchronization (`onegitvault-bookmarks.json`).
  - **GitHub Starred Explorer**: Direct access to your starred repositories via authenticated GitHub REST API.
- **Translucent Search Flyout**: WhatsApp and Instagram-style search flyout with instant topic pills, live streaming search, and persistent search history.
- **On-Demand README Translation**: Translate international documentation into English on-demand while preserving markdown formatting, code blocks, and badges.
- **Native Android Share Sheet**: Share repository links directly to WhatsApp, Telegram, Slack, and other native apps.

---

## 🛠️ Prerequisites

Before building the Android app, ensure your workstation has the following installed:

| Tool | Recommended Version | Verification Command |
|---|---|---|
| **Node.js** | 18.x or 20.x LTS | `node --version` |
| **npm** | 9.x or 10.x | `npm --version` |
| **JDK (Java Development Kit)** | **Java 17** (Microsoft OpenJDK or Eclipse Temurin) | `java -version` |
| **Android SDK** | API Level 34 (Android 14) & Build Tools 34.0.0 | `adb --version` |
| **Android Device or Emulator** | Android 8.0+ (API 26+) with USB Debugging enabled | `adb devices` |

---

## 🌐 Environment Variables Setup

Ensure `JAVA_HOME` and `ANDROID_HOME` are configured in your system environment:

### Windows (PowerShell)
```powershell
# Set JDK 17
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.21.102-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# Set Android SDK
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:PATH"
```

### macOS / Linux (Bash or Zsh)
```bash
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk" # or /Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

---

## 🚀 Step-by-Step Build Instructions

### 1. Navigate to the Android Directory
```bash
cd android
```

### 2. Install Node Dependencies
```bash
npm install
```

### 3. Build the Web Application
Compile the TypeScript code and bundle the production web assets:
```bash
npm run build
```
This generates the optimized web distribution inside `android/dist/`.

### 4. Sync Web Assets with Capacitor
Sync the bundled assets and plugins into the native Android Gradle project:
```bash
npx cap sync android
```

> **Note on Java Compatibility**: If Capacitor sync sets `JavaVersion.VERSION_21` inside `android/android/app/capacitor.build.gradle`, verify it specifies `JavaVersion.VERSION_17` to match JDK 17:
> ```groovy
> compileOptions {
>     sourceCompatibility JavaVersion.VERSION_17
>     targetCompatibility JavaVersion.VERSION_17
> }
> ```

### 5. Build the Native Debug APK
Run Gradle to assemble the Android package:

**On Windows:**
```powershell
cd android
.\gradlew.bat assembleDebug
```

**On macOS / Linux:**
```bash
cd android
chmod +x ./gradlew
./gradlew assembleDebug
```

The compiled APK will be generated at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📲 Installing on Your Android Device

### Option A: Install via ADB (Command Line)
1. Connect your Android phone via USB and enable **USB Debugging** in Developer Options.
2. Confirm your device is recognized:
   ```bash
   adb devices
   ```
3. Install the APK directly:
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Option B: Sideload Direct APK
Copy the APK to your phone's storage or download the latest release from the [GitHub Releases](https://github.com/VKaddala/OneGitVault/releases/latest) page and tap to install.

---

## 💻 Web Development & Live Testing

You can also run and test the mobile UI directly in your desktop browser with mobile viewport emulation:

```bash
cd android
npm run dev
```
Open `http://localhost:5173` in Chrome or Edge, open DevTools (`F12`), and toggle the **Device Toolbar** (`Ctrl+Shift+M`) to test responsive layouts.

To open the project in **Android Studio**:
```bash
cd android
npx cap open android
```

---

## 🏛️ Project Structure

```
OneGitVault/android/
├── android/                             # Native Android Gradle Project
│   ├── app/
│   │   ├── src/main/AndroidManifest.xml # Permissions, orientations, and hardware acceleration
│   │   ├── src/main/java/io/onegitvault/app/
│   │   │   └── MainActivity.java        # Edge-to-edge window insets & AndroidThemeBridge
│   │   └── build.gradle                 # Native app Gradle dependencies
│   ├── build.gradle                     # Top-level Gradle configuration
│   └── gradlew / gradlew.bat            # Gradle wrapper executable
├── public/                              # Mobile launcher icons and assets
├── src/
│   ├── components/
│   │   ├── BottomNav.tsx                # Floating elevated bottom navigation bar
│   │   ├── CompactFilterBar.tsx         # Mobile category, sorting, and star filter chips
│   │   ├── RepoCard.tsx                 # Touch-optimized repository tile with direct actions
│   │   ├── RepoDetailSheet.tsx          # Swipeable README & release inspector sheet
│   │   ├── SearchFlyout.tsx             # Translucent WhatsApp/Instagram-style search flyout
│   │   ├── TopAppBar.tsx                # Edge-to-edge top bar with quota and refresh indicator
│   │   ├── TrendingView.tsx             # Mobile GitHub trending feed (Daily/Weekly/Monthly)
│   │   └── VaultView.tsx                # Dual-tab view: Gist Bookmarks & GitHub Starred
│   ├── data/
│   │   ├── categories.ts                # Mobile category definitions and icons
│   │   └── curatedAndroidApks.ts        # Curated top-tier open-source Android APK projects
│   ├── services/
│   │   ├── bookmarkStore.ts             # Local storage bookmark manager
│   │   ├── gistSync.ts                  # Bidirectional GitHub Gist backup & restore
│   │   ├── githubApi.ts                 # Mobile-optimized GitHub REST API client
│   │   ├── shareHelper.ts               # Web Share API & clipboard fallback
│   │   └── translateService.ts          # On-demand markdown README translation
│   ├── themes/                          # Mobile theme registry (GitHub Dark/Light, Sand, Twilight)
│   ├── App.tsx                          # Root application orchestrator
│   └── main.tsx                         # Entry point with safe-area viewport bindings
├── capacitor.config.json                # Capacitor application configuration
├── package.json                         # Node dependencies and scripts
└── vite.config.ts                       # Vite bundling configuration
```

---

## 🔧 Native Bridges & Architecture Details

### 1. `AndroidThemeBridge` (`MainActivity.java`)
The native Android bridge injects a `window.AndroidThemeBridge` JavaScript interface into the WebView:
```java
public class ThemeBridgeInterface {
    @JavascriptInterface
    public void setStatusBarTheme(boolean isDark) {
        runOnUiThread(() -> {
            WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            controller.setAppearanceLightStatusBars(!isDark);
            controller.setAppearanceLightNavigationBars(!isDark);
        });
    }
}
```
Whenever the user toggles a theme (e.g. AMOLED Dark vs. Sand Light), `themeRegistry.ts` immediately updates DOM variables and signals the bridge. The bridge updates the system icon luminance, guaranteeing readability across all status and navigation bars.

### 2. Edge-to-Edge System Insets
The app runs completely under the status bar and navigation bar using Android's modern `WindowCompat.setDecorFitsSystemWindows(window, false)` APIs. The UI leverages `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` to guarantee content never collides with notches, punch-holes, or gesture pills.

---

## ❓ Troubleshooting & FAQs

### Q: `assembleDebug` fails with `Unsupported class file major version`
Ensure `JAVA_HOME` points to **JDK 17**. Check `java -version` and `javac -version`. Capacitor and the Android Gradle Plugin used in this project require Java 17.

### Q: Android SDK licenses are not accepted
Run the SDK license acceptance tool:
```bash
%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat --licenses
```
Press `y` to accept all pending licenses.

### Q: Device is not detected by `adb devices`
1. Verify USB cable supports data transfer.
2. In your device Settings, ensure **Developer Options** and **USB Debugging** are toggled ON.
3. When prompted on your phone, accept the RSA fingerprint authorization key.
