import fs from 'fs';
import path from 'path';
import assert from 'assert';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function getAllJsFiles(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        getAllJsFiles(fullPath, fileList);
      }
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

import { execFileSync } from 'child_process';

export async function runSyntaxTests() {
  console.log('\n--- Running JavaScript Syntax Validation Tests ---');

  const jsFiles = getAllJsFiles(projectRoot);
  assert.ok(jsFiles.length >= 8, 'Expected at least 8 JS files in the project');

  for (const filePath of jsFiles) {
    const relative = path.relative(projectRoot, filePath);
    try {
      execFileSync(process.execPath, ['--check', filePath], { stdio: 'pipe' });
      console.log(`✓ Valid syntax: ${relative}`);
    } catch (err) {
      assert.fail(`Syntax error in ${relative}: ${err.message}`);
    }
  }
}
