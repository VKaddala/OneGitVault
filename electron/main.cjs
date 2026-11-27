const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { spawn } = require('child_process');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let mainWindow = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../assets/icons/onegitvault.ico');
  mainWindow = new BrowserWindow({
    width: 1340,
    height: 890,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#0c0d10',
    title: 'OneGitVault - Open Source Observatory',
    icon: iconPath,
    frame: false, // Frameless window for custom themed titlebar
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    autoHideMenuBar: true,
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Track maximize state changes for UI restore/maximize button
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized-change', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized-change', false);
  });

  // Open external window links in user's default system browser safely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Intercept in-page anchor navigations (e.g. clicking links inside README markdown)
  // so they never replace the OneGitVault application with the webpage
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    try {
      const parsed = new URL(targetUrl);
      if (isDev && process.env.VITE_DEV_SERVER_URL) {
        const devOrigin = new URL(process.env.VITE_DEV_SERVER_URL).origin;
        if (parsed.origin === devOrigin) {
          return;
        }
      }
    } catch {}

    // Cancel all external, file:, remote, and SMB navigations inside the app window
    event.preventDefault();
    if (targetUrl.startsWith('http:') || targetUrl.startsWith('https:')) {
      shell.openExternal(targetUrl);
    }
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ── IPC Handlers for Custom Frameless Titlebar ──
ipcMain.on('window-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.minimize();
  }
});

ipcMain.on('window-maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false;
});

// Auto-discover GitHub Personal Access Token from system Git Credential Manager
ipcMain.handle('get-system-git-token', () => {
  try {
    const { execSync } = require('child_process');
    const creds = execSync('git credential fill', {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    for (const line of creds.split('\n')) {
      if (line.startsWith('password=')) {
        return line.slice('password='.length).trim();
      }
    }
  } catch (e) {
    // Ignore if git credentials are not available
  }
  return process.env.GITHUB_TOKEN || '';
});

ipcMain.on('open-external', (_event, url) => {
  if (url && (url.startsWith('http:') || url.startsWith('https:'))) {
    shell.openExternal(url);
  }
});

// Helper to download update installer stream following redirects
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    // Clean up any stale partial download first
    if (fs.existsSync(destPath)) {
      try { fs.unlinkSync(destPath); } catch (_) {}
    }

    function get(currentUrl) {
      const parsedUrl = new URL(currentUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      client.get(currentUrl, {
        headers: {
          'User-Agent': 'OneGitVault-AutoUpdater',
          'Accept': 'application/octet-stream'
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume(); // Free socket
          const redirectUrl = new URL(res.headers.location, currentUrl).toString();
          return get(redirectUrl);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Download failed with status ${res.statusCode}`));
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let receivedBytes = 0;
        const fileStream = fs.createWriteStream(destPath);

        res.on('data', (chunk) => {
          receivedBytes += chunk.length;
          if (totalBytes > 0 && onProgress) {
            const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
            onProgress({ percent, receivedBytes, totalBytes });
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            try {
              const stats = fs.statSync(destPath);
              if (stats.size < 5000000) {
                fs.unlinkSync(destPath);
                return reject(new Error(`Downloaded installer too small (${stats.size} bytes), download incomplete.`));
              }
              resolve(destPath);
            } catch (statErr) {
              reject(statErr);
            }
          });
        });

        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      }).on('error', reject);
    }

    get(url);
  });
}

// ── Silent Update Download & Background Execution ──
ipcMain.handle('install-update-silently', async (_event, downloadUrl) => {
  if (!mainWindow || _event.sender !== mainWindow.webContents) {
    throw new Error('Unauthorized IPC sender');
  }
  if (!downloadUrl) throw new Error('Missing download URL for update');

  let parsedUrl;
  try {
    parsedUrl = new URL(downloadUrl);
  } catch {
    throw new Error('Invalid update download URL');
  }

  const isOfficialRelease =
    (parsedUrl.protocol === 'https:' &&
      parsedUrl.hostname === 'github.com' &&
      parsedUrl.pathname.startsWith('/VKaddala/OneGitVault/releases/download/') &&
      parsedUrl.pathname.endsWith('.exe')) ||
    (parsedUrl.protocol === 'https:' &&
      parsedUrl.hostname === 'objects.githubusercontent.com' &&
      parsedUrl.pathname.endsWith('.exe'));

  if (!isOfficialRelease) {
    throw new Error('Blocked unverified update download source');
  }

  const tempInstaller = path.join(app.getPath('temp'), 'OneGitVault-Setup-Update.exe');

  await downloadFile(downloadUrl, tempInstaller, (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-download-progress', progress);
    }
  });

  // Launch Inno Setup detached via Windows cmd start to prevent child process termination on exit
  // /VERYSILENT: runs without wizard window
  // /SUPPRESSMSGBOXES: suppresses any confirmation boxes
  // /FORCECLOSEAPPLICATIONS: cleanly closes running OneGitVault instance before replacing files
  const child = spawn('cmd.exe', [
    '/c',
    'start',
    '""',
    tempInstaller,
    '/VERYSILENT',
    '/SUPPRESSMSGBOXES',
    '/FORCECLOSEAPPLICATIONS'
  ], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });

  child.unref();

  // Allow child process 800ms to start up before cleanly terminating running Electron instance
  setTimeout(() => {
    app.exit(0);
  }, 800);

  return true;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
