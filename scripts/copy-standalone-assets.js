// Next.js's standalone output deliberately omits public/ and .next/static/ -
// copy them in so .next/standalone is a complete, self-contained deploy unit.
// No-op if this wasn't a standalone build (NEXT_OUTPUT_MODE unset).
const fs = require('fs');
const path = require('path');

const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');

if (!fs.existsSync(standaloneDir)) {
  process.exit(0);
}

fs.cpSync(path.join(__dirname, '..', 'public'), path.join(standaloneDir, 'public'), { recursive: true });
fs.cpSync(path.join(__dirname, '..', '.next', 'static'), path.join(standaloneDir, '.next', 'static'), { recursive: true });

console.log('Copied public/ and .next/static/ into .next/standalone/');
