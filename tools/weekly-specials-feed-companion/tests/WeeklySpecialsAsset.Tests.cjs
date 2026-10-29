const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const themeRoot = path.resolve(__dirname, '..', '..', '..');
const asset = fs.readFileSync(path.join(themeRoot, 'assets', 'weekly-specials.js'), 'utf8');
const section = fs.readFileSync(path.join(themeRoot, 'sections', 'weekly-specials.liquid'), 'utf8');

class FixtureElement {
  constructor() {
    this.dataset = {};
    this.hidden = false;
    this.textContent = '';
    this.children = [];
    this.attributes = {};
  }

  addEventListener(name, callback) {
    this.listener = { name, callback };
  }

  append(child) {
    child.parentElement = this;
    this.children.push(child);
  }

  remove() {
    if (this.parentElement) {
      this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    }
  }

  replaceChildren(...children) {
    this.children = children;
  }

  querySelector(selector) {
    if (selector === 'img') return this.children.find((child) => child.tagName === 'IMG') || null;
    return null;
  }
}

class FixtureList extends FixtureElement {
  constructor() {
    super();
    this.tagName = 'UL';
  }

  get childElementCount() {
    return this.children.length;
  }
}

async function render(mode, feedUrl = 'https://feed.fixture.invalid/api/weekly-specials.ashx') {
  const status = new FixtureElement();
  const empty = new FixtureElement();
  empty.hidden = true;
  const list = new FixtureList();
  list.hidden = true;
  const root = new FixtureElement();
  root.dataset = {
    feedUrl,
    configError: 'Weekly Specials are not configured.',
    loadError: 'Weekly Specials could not be loaded.',
    emptyMessage: 'There are no weekly specials.',
    imageError: 'Weekly Specials images are unavailable.'
  };
  root.querySelector = (selector) => ({
    '[data-weekly-status]': status,
    '[data-weekly-empty]': empty,
    '[data-weekly-list]': list
  })[selector] || null;

  let fetchCalls = 0;
  const context = {
    document: {
      querySelectorAll: () => [root],
      createElement: (tagName) => Object.assign(new FixtureElement(), { tagName: tagName.toUpperCase() })
    },
    HTMLElement: FixtureElement,
    HTMLUListElement: FixtureList,
    URL,
    fetch: async (url, options) => {
      fetchCalls++;
      assert.equal(options.credentials, 'omit');
      assert.equal(options.mode, 'cors');
      assert.equal(url, feedUrl);
      if (mode === 'error') return { ok: false };
      if (mode === 'invalid') {
        return { ok: true, json: async () => ({ items: [{ recordId: 'bad' }] }) };
      }
      return {
        ok: true,
        json: async () => ({
          items: mode === 'layout'
            ? [
                { recordId: 1, name: 'First flyer', imageUrl: 'https://images.fixture.invalid/one.png', imageVersion: '638974440000000000' },
                { recordId: 2, name: 'Second flyer', imageUrl: 'https://images.fixture.invalid/two.png', imageVersion: '638974440000000001' }
              ]
            : []
        })
      };
    }
  };
  vm.runInNewContext(asset, context, { filename: 'weekly-specials.js' });
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { status, empty, list, fetchCalls };
}

async function run() {
  const empty = await render('empty');
  assert.equal(empty.status.textContent, '');
  assert.equal(empty.empty.textContent, 'There are no weekly specials.');
  assert.equal(empty.empty.hidden, false);

  const failed = await render('error');
  assert.equal(failed.status.textContent, 'Weekly Specials could not be loaded.');
  assert.equal(failed.list.hidden, true);

  const invalid = await render('invalid');
  assert.equal(invalid.status.textContent, 'Weekly Specials could not be loaded.');

  const unconfigured = await render('empty', '');
  assert.equal(unconfigured.status.textContent, 'Weekly Specials are not configured.');
  assert.equal(unconfigured.fetchCalls, 0);

  const layout = await render('layout');
  assert.equal(layout.list.hidden, false);
  assert.equal(layout.list.children.length, 2);
  assert.equal(layout.list.children[0].children[0].alt, 'First flyer');
  assert.equal(layout.list.children[0].children[0].src, 'https://images.fixture.invalid/one.png?v=638974440000000000');
  assert.equal(layout.list.children[0].tagName, 'LI');
  layout.list.children[0].children[0].listener.callback();
  assert.equal(layout.status.textContent, 'Weekly Specials images are unavailable.');
  assert.equal(layout.list.children.length, 1);
  assert.ok(section.includes('@media screen and (max-width: 749px)'));
  assert.ok(section.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'));
  console.log('All Weekly Specials storefront fixture tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
