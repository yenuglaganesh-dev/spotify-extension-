import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

export async function runManifestTests() {
  console.log('\n--- Running Manifest V3 & File Existence Tests ---');

  const manifestPath = path.join(projectRoot, 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');

  const raw = fs.readFileSync(manifestPath, 'utf8');
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (err) {
    assert.fail(`manifest.json is not valid JSON: ${err.message}`);
  }

  // 1. Manifest version
  assert.strictEqual(manifest.manifest_version, 3, 'Must be Manifest V3');

  // 2. Metadata
  assert.ok(manifest.name && manifest.name.length > 0, 'Name must be specified');
  assert.ok(manifest.version && /^\d+\.\d+(\.\d+)?$/.test(manifest.version), 'Version must follow semver format');
  assert.ok(manifest.description, 'Description must be specified');

  // 3. Permissions
  const allowedPermissions = ['storage', 'tabs'];
  manifest.permissions.forEach((perm) => {
    assert.ok(allowedPermissions.includes(perm), `Unexpected permission: ${perm}`);
  });
  assert.deepStrictEqual(manifest.host_permissions, ['*://open.spotify.com/*'], 'Host permissions must only target open.spotify.com');

  // 4. Action / Popup
  assert.ok(manifest.action, 'action section must exist');
  assert.strictEqual(manifest.action.default_popup, 'popup.html');
  assert.ok(fs.existsSync(path.join(projectRoot, manifest.action.default_popup)), 'popup.html must exist');

  // 5. Background Service Worker
  assert.ok(manifest.background, 'background section must exist');
  assert.strictEqual(manifest.background.service_worker, 'background.js');
  assert.strictEqual(manifest.background.type, 'module');
  assert.ok(fs.existsSync(path.join(projectRoot, manifest.background.service_worker)), 'background.js must exist');

  // 6. Options Page
  assert.strictEqual(manifest.options_page, 'options.html');
  assert.ok(fs.existsSync(path.join(projectRoot, manifest.options_page)), 'options.html must exist');

  // 7. Content Scripts
  assert.ok(Array.isArray(manifest.content_scripts) && manifest.content_scripts.length > 0);
  const cs = manifest.content_scripts[0];
  assert.deepStrictEqual(cs.matches, ['*://open.spotify.com/*']);
  assert.deepStrictEqual(cs.js, ['content.js']);
  assert.ok(fs.existsSync(path.join(projectRoot, cs.js[0])), 'content.js must exist');

  // 8. Icons
  assert.ok(manifest.icons, 'icons section must exist');
  ['16', '32', '48', '128'].forEach((size) => {
    const iconRel = manifest.icons[size];
    assert.ok(iconRel, `Icon size ${size} must be defined`);
    const iconAbs = path.join(projectRoot, iconRel);
    assert.ok(fs.existsSync(iconAbs), `Icon file ${iconRel} must exist`);
    const stat = fs.statSync(iconAbs);
    assert.ok(stat.size > 0, `Icon file ${iconRel} must not be empty`);
  });

  // 9. Commands
  assert.ok(manifest.commands, 'commands section must exist');
  assert.ok(manifest.commands['play-pause'], 'play-pause command must exist');
  assert.ok(manifest.commands['next-track'], 'next-track command must exist');
  assert.ok(manifest.commands['previous-track'], 'previous-track command must exist');

  console.log('✓ Manifest V3 schema and referenced files verified successfully');
}
