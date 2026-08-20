const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const roots = ['apps', 'api', 'modules', 'packages', 'ops'];
const ignored = new Set(['node_modules', '.git']);

function files(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...files(full));
    else if (entry.isFile() && full.endsWith('.js')) result.push(full);
  }
  return result;
}

for (const root of roots) {
  for (const file of files(root)) {
    const check = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    if (check.status !== 0) process.exit(check.status || 1);
  }
}
console.log('Static JavaScript typecheck gate passed: all tracked JS files parse successfully.');
