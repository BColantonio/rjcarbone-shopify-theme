/**
 * Renders the public image-only Weekly Specials feed.
 *
 * @param {HTMLElement} root
 */
async function loadWeeklySpecials(root) {
  const status = root.querySelector('[data-weekly-status]');
  const empty = root.querySelector('[data-weekly-empty]');
  const list = root.querySelector('[data-weekly-list]');
  if (!(status instanceof HTMLElement) || !(empty instanceof HTMLElement) || !(list instanceof HTMLUListElement)) return;

  const feedUrl = root.dataset.feedUrl?.trim();
  if (!feedUrl) {
    status.textContent = root.dataset.configError || '';
    return;
  }

  let endpoint;
  try {
    endpoint = new URL(feedUrl);
  } catch {
    status.textContent = root.dataset.configError || '';
    return;
  }

  if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && endpoint.hostname === '127.0.0.1')) {
    status.textContent = root.dataset.configError || '';
    return;
  }

  try {
    const response = await fetch(endpoint.href, {
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      mode: 'cors'
    });
    if (!response.ok) throw new Error('Weekly Specials feed request failed.');

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.items)) throw new Error('Weekly Specials feed response was invalid.');

    if (!payload.items.every(isWeeklySpecialItem)) throw new Error('Weekly Specials feed response was invalid.');
    const items = payload.items;
    list.replaceChildren();
    if (items.length === 0) {
      status.textContent = '';
      empty.textContent = root.dataset.emptyMessage || '';
      empty.hidden = false;
      return;
    }

    for (const item of items) {
      const imageUrl = new URL(item.imageUrl);
      if (imageUrl.protocol !== 'https:') continue;
      imageUrl.searchParams.set('v', item.imageVersion);

      const listItem = document.createElement('li');
      listItem.className = 'weekly-specials__item';

      const image = document.createElement('img');
      image.className = 'weekly-specials__image';
      image.src = imageUrl.href;
      image.alt = item.name;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.addEventListener('error', () => {
        listItem.remove();
        if (!status.textContent) status.textContent = root.dataset.imageError || root.dataset.loadError || '';
        if (!list.querySelector('img')) {
          list.hidden = true;
        }
      }, { once: true });

      listItem.append(image);
      list.append(listItem);
    }

    if (list.childElementCount === 0) {
      status.textContent = root.dataset.loadError || '';
      return;
    }

    empty.hidden = true;
    list.hidden = false;
    status.textContent = '';
  } catch {
    status.textContent = root.dataset.loadError || '';
  }
}

/**
 * @param {unknown} value
 * @returns {value is { recordId: number, name: string, imageUrl: string, imageVersion: string }}
 */
function isWeeklySpecialItem(value) {
  if (typeof value !== 'object' || value === null) return false;
  const item = /** @type {Record<string, unknown>} */ (value);
  if (
    !Number.isInteger(item.recordId) ||
    typeof item.name !== 'string' ||
    typeof item.imageUrl !== 'string' ||
    typeof item.imageVersion !== 'string' ||
    !/^\d+$/.test(item.imageVersion)
  ) {
    return false;
  }

  try {
    const imageUrl = new URL(item.imageUrl);
    return imageUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

for (const root of document.querySelectorAll('[data-weekly-specials]')) {
  if (root instanceof HTMLElement) loadWeeklySpecials(root);
}
