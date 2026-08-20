import fs from "node:fs";
import path from "node:path";

const roots = ["apps/api/test", "modules"];
const violations = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".test.js")) {
      const source = fs.readFileSync(full, "utf8");
      if (/from\s+["']pg["']|require\(["']pg["']\)/.test(source)) violations.push(full);
    }
  }
}

for (const root of roots) walk(root);
if (violations.length) {
  console.error(`Unit-test database isolation violation:\n${violations.join("\n")}`);
  process.exit(1);
}
