const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const parts = pkg.version.split('.').map(Number);
if (parts.length >= 3) {
  parts[2] = (parts[2] || 0) + 1; // Increment patch/build number
  pkg.version = parts.join('.');
} else {
  pkg.version = '1.0.1';
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

// Also print the new version to stdout so callers can capture it
console.log(pkg.version);
