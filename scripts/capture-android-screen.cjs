const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const out1 = path.resolve(__dirname, '../assets/screenshots/27-android-v101-apk-feed.png');

console.log('Spawning vite preview on port 5190...');
const vite = spawn('cmd.exe', ['/c', 'npx.cmd', 'vite', 'preview', '--port', '5190'], {
  cwd: path.resolve(__dirname, '../android'),
  stdio: 'pipe'
});

setTimeout(() => {
  console.log('Capturing mobile view on port 5190...');
  try {
    execSync(`"${chrome}" --headless --disable-gpu --run-all-compositor-stages-before-draw --virtual-time-budget=3000 --screenshot="${out1}" --window-size=412,915 "http://localhost:5190"`, { stdio: 'ignore' });
    console.log('Result exists:', fs.existsSync(out1));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    vite.kill();
    process.exit(0);
  }
}, 4000);
