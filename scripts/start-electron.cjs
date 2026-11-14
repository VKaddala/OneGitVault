const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const VITE_PORT = 5173;
const DEV_URL = `http://localhost:${VITE_PORT}`;

console.log('🚀 Starting GitPulse Desktop Development Server...');

// 1. Start Vite development server
const viteCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const viteProcess = spawn(viteCmd, ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..'),
});

function checkServerReady() {
  return new Promise((resolve) => {
    const req = http.get(DEV_URL, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    const ready = await checkServerReady();
    if (ready) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

waitForServer().then((ready) => {
  if (!ready) {
    console.error('❌ Vite dev server did not respond in time.');
    viteProcess.kill();
    process.exit(1);
  }

  console.log('⚡ Vite is ready! Launching Electron Desktop Window...');
  
  let electronBin;
  try {
    electronBin = require('electron');
  } catch (err) {
    console.error('Electron binary not found. Please run: npm install electron --save-dev');
    viteProcess.kill();
    process.exit(1);
  }

  const electronProcess = spawn(electronBin, ['.'], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: DEV_URL,
    },
  });

  electronProcess.on('close', (code) => {
    console.log('👋 Desktop window closed. Stopping server...');
    viteProcess.kill();
    process.exit(code || 0);
  });
});

process.on('SIGINT', () => {
  viteProcess.kill();
  process.exit(0);
});
