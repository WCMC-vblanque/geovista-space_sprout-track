#!/usr/bin/env node

/**
 * Build Info Generator
 *
 * Writes public/build-info.json with the current git branch + short commit so a
 * deployed instance can show exactly which version it is running. Runs as the
 * `prebuild` npm script (automatically before `next build`).
 *
 * Git failures are non-fatal — values fall back to "unknown".
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function git(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
}

const info = {
  branch: git('git rev-parse --abbrev-ref HEAD'),
  commit: git('git rev-parse --short HEAD'),
  builtAt: new Date().toISOString(),
};

const outDir = path.join(__dirname, '..', 'public');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'build-info.json'), JSON.stringify(info));

console.log(`build-info: ${info.branch}@${info.commit} (${info.builtAt})`);
