/*
  copy-web-assets.js
  Copies the standalone web game (index.html, style.css, js/) into www/, which
  is the webDir Capacitor packages into the native Android app. www/ is a
  generated build artifact -- the root files remain the source of truth and
  still work by opening index.html directly in a browser.
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'www');

function copyFile(rel) {
  const src = path.join(ROOT, rel);
  const dest = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`  copied ${rel}`);
}

function copyDir(rel) {
  const src = path.join(ROOT, rel);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const entryRel = path.join(rel, entry.name);
    if (entry.isDirectory()) copyDir(entryRel);
    else copyFile(entryRel);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

console.log('Copying web assets into www/ ...');
copyFile('index.html');
copyFile('style.css');
copyDir('js');
console.log('Done.');
