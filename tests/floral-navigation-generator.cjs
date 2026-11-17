const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'floral-navigation-'));

try {
  fs.mkdirSync(path.join(temporaryRoot, 'scripts'));
  fs.mkdirSync(path.join(temporaryRoot, 'snippets'));
  for (const file of ['generate-floral-navigation.mjs', 'floral-departments-review.json']) {
    fs.copyFileSync(path.join(root, 'scripts', file), path.join(temporaryRoot, 'scripts', file));
  }
  execFileSync(process.execPath, [path.join(temporaryRoot, 'scripts', 'generate-floral-navigation.mjs')]);

  const config = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'floral-departments-review.json'), 'utf8'));
  const generated = fs.readFileSync(path.join(temporaryRoot, 'snippets', 'floral-department-category-links.liquid'), 'utf8');
  const checkedIn = fs.readFileSync(path.join(root, 'snippets', 'floral-department-category-links.liquid'), 'utf8');
  assert.equal(generated.replace(/\r\n/g, '\n'), checkedIn.replace(/\r\n/g, '\n'));

  for (const department of config.departments) {
    const handle = department.department.toLowerCase();
    const backLinks = fs.readFileSync(path.join(temporaryRoot, 'snippets', `floral-department-back-link-${handle}.liquid`), 'utf8');
    const checkedInBackLinks = fs.readFileSync(path.join(root, 'snippets', `floral-department-back-link-${handle}.liquid`), 'utf8').replace(/\r\n/g, '\n');
    assert.doesNotMatch(backLinks, /<a\b/);
    for (const category of department.categories) {
      assert.ok(backLinks.includes(`{%- when '${category.handle}' -%}\n    ${handle}`), category.handle);
      assert.ok(checkedInBackLinks.includes(`{%- when '${category.handle}' -%}\n    ${handle}`), category.handle);
    }
    if (handle === 'plants') assert.ok(backLinks.includes("{%- when 'plants' -%}\n    plants"));
  }
  console.log('Floral navigation generator contract passed.');
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
