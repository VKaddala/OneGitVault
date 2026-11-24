const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const androidOut1 = path.resolve(__dirname, '../assets/screenshots/27-android-v101-apk-feed.png');
const androidDist = path.resolve(__dirname, '../android/dist');

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  let filePath = path.join(androidDist, reqPath === '/' ? 'index.html' : reqPath);
  if (!fs.existsSync(filePath)) filePath = path.join(androidDist, 'index.html');
  const ext = path.extname(filePath);
  const mimeMap = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  };
  res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'text/plain' });
  res.end(fs.readFileSync(filePath));
});

server.listen(5188, () => {
  console.log('Capturing Android APK feed mobile screenshot...');
  try {
    execSync(`"${chrome}" --headless --disable-gpu --virtual-time-budget=5000 --screenshot="${androidOut1}" --window-size=412,915 "http://localhost:5188"`, { stdio: 'ignore' });
    console.log('Android APK Feed captured:', fs.existsSync(androidOut1));
  } catch (e) {
    console.error('Android capture error:', e.message);
  }
  process.exit(0);
});
