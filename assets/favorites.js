import { Component } from '@theme/component';

const STORAGE_KEY = 'theme-favorites';
const FAVORITES_CHANGE_EVENT = 'theme:favorites-change';

/**
 * @typedef {object} FavoriteProduct
 * @property {string} id
 * @property {string} title
 * @property {string} url
 * @property {string} image
 */

/**
 * @param {unknown} value
 * @returns {FavoriteProduct[]}
 */
function parseFavorites(value) {
  if (!Array.isArray(value)) {
    throw new Error('Saved favorites are not a list.');
  }

  return value.flatMap((/** @type {unknown} */ item) => {
    if (typeof item !== 'object' || item === null) return [];

    const record = /** @type {Record<string, unknown>} */ (item);
    if (
      typeof record.id !== 'string' ||
      typeof record.title !== 'string' ||
      typeof record.url !== 'string' ||
      !isProductUrl(record.url)
    ) {
      return [];
    }

    return [{ id: record.id, title: record.title, url: record.url, image: normalizeImageUrl(record.image) }];
  });
}

/**
 * Accept Shopify CDN images and same-origin images, including HTTP URLs from a local theme preview.
 * @param {unknown} value
 * @returns {string}
 */
function normalizeImageUrl(value) {
  if (typeof value !== 'string' || value === '') return '';

  try {
    const imageUrl = new URL(value, window.location.origin);
    if (imageUrl.origin === window.location.origin) return imageUrl.href;
    if (
      imageUrl.protocol === 'https:' &&
      (imageUrl.hostname === 'cdn.shopify.com' || imageUrl.hostname === 'images.shopifycdn.net')
    ) {
      return imageUrl.href;
    }
  } catch {
    return '';
  }

  return '';
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isProductUrl(value) {
  if (!value.startsWith('/') || value.startsWith('//')) return false;

  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin && url.pathname.includes('/products/');
  } catch {
    return false;
  }
}

/**
 * @returns {FavoriteProduct[]}
 */
function readFavorites() {
  const storedValue = window.localStorage.getItem(STORAGE_KEY);
  if (storedValue === null) return [];

  return parseFavorites(JSON.parse(storedValue));
}

/**
 * @param {FavoriteProduct[]} favorites
 */
function saveFavorites(favorites) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGE_EVENT));
}

/**
 * A product favorite toggle synchronized across every rendered instance.
 *
 * @extends {Component<{favoriteButton: HTMLButtonElement, favoriteStatus: HTMLElement}>}
 */
class FavoriteToggle extends Component {
  requiredRefs = ['favoriteButton', 'favoriteStatus'];

  connectedCallback() {
    super.connectedCallback();
    this.refs.favoriteButton.addEventListener('click', this.#handleClick);
    window.addEventListener(FAVORITES_CHANGE_EVENT, this.#handleFavoritesChange);
    window.addEventListener('storage', this.#handleStorageChange);
    this.#refresh();
  }

  disconnectedCallback() {
    this.refs.favoriteButton?.removeEventListener('click', this.#handleClick);
    window.removeEventListener(FAVORITES_CHANGE_EVENT, this.#handleFavoritesChange);
    window.removeEventListener('storage', this.#handleStorageChange);
    super.disconnectedCallback();
  }

  /** @type {(event: MouseEvent) => void} */
  #handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      const favorites = readFavorites();
      const product = this.#getProduct();
      const isSaved = favorites.some((favorite) => favorite.id === product.id);
      const updatedFavorites = isSaved
        ? favorites.filter((favorite) => favorite.id !== product.id)
        : [...favorites, product];

      saveFavorites(updatedFavorites);
      this.refs.favoriteStatus.textContent = isSaved
        ? this.dataset.removedStatus || ''
        : this.dataset.addedStatus || '';
    } catch {
      this.#showStorageError();
    }
  };

  #handleFavoritesChange = () => {
    this.#refresh();
  };

  /** @param {StorageEvent} event */
  #handleStorageChange = (event) => {
    if (event.key === STORAGE_KEY || event.key === null) this.#refresh();
  };

  #refresh() {
    try {
      const isSaved = readFavorites().some((favorite) => favorite.id === this.dataset.productId);
      const button = this.refs.favoriteButton;
      button.disabled = false;
      button.setAttribute('aria-pressed', String(isSaved));
      button.setAttribute('aria-label', isSaved ? this.dataset.removeLabel || '' : this.dataset.addLabel || '');
      this.refs.favoriteStatus.textContent = '';
    } catch {
      this.#showStorageError();
    }
  }

  #showStorageError() {
    this.refs.favoriteButton.disabled = true;
    this.refs.favoriteStatus.textContent = this.dataset.storageError || '';
  }

  /** @returns {FavoriteProduct} */
  #getProduct() {
    const { productId, productTitle, productUrl, productImage } = this.dataset;
    if (!productId || !productTitle || !productUrl || !isProductUrl(productUrl)) {
      throw new Error('The product cannot be saved.');
    }

    const image = normalizeImageUrl(productImage);
    return { id: productId, title: productTitle, url: productUrl, image };
  }
}

if (!customElements.get('favorite-toggle')) {
  customElements.define('favorite-toggle', FavoriteToggle);
}

/**
 * Renders the saved browser favorites without prices or purchase controls.
 *
 * @extends {Component<{favoriteList: HTMLElement, favoriteEmpty: HTMLElement, favoriteStatus: HTMLElement, favoriteHeading: HTMLHeadingElement}>}
 */
class FavoritesPage extends Component {
  requiredRefs = ['favoriteList', 'favoriteEmpty', 'favoriteStatus', 'favoriteHeading'];
  #imageLookupController;
  #pendingImageLookups = new Set();

  connectedCallback() {
    super.connectedCallback();
    this.#imageLookupController = new AbortController();
    this.addEventListener('click', this.#handleClick);
    window.addEventListener(FAVORITES_CHANGE_EVENT, this.#handleFavoritesChange);
    window.addEventListener('storage', this.#handleStorageChange);
    this.#render();
  }

  disconnectedCallback() {
    this.#imageLookupController?.abort();
    this.#pendingImageLookups.clear();
    this.removeEventListener('click', this.#handleClick);
    window.removeEventListener(FAVORITES_CHANGE_EVENT, this.#handleFavoritesChange);
    window.removeEventListener('storage', this.#handleStorageChange);
    super.disconnectedCallback();
  }

  /** @type {(event: MouseEvent) => void} */
  #handleClick = (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('[data-remove-favorite]');
    if (!(button instanceof HTMLButtonElement)) return;

    event.preventDefault();
    event.stopPropagation();

    try {
      const productId = button.dataset.removeFavorite;
      if (!productId) throw new Error('The saved product cannot be removed.');
      const buttons = Array.from(this.querySelectorAll('[data-remove-favorite]'));
      const removedIndex = buttons.indexOf(button);
      saveFavorites(readFavorites().filter((favorite) => favorite.id !== productId));
      this.refs.favoriteStatus.textContent = this.dataset.removedStatus || '';
      const remainingButtons = this.querySelectorAll('[data-remove-favorite]');
      const focusTarget = remainingButtons[Math.min(removedIndex, remainingButtons.length - 1)];
      if (focusTarget instanceof HTMLButtonElement) {
        focusTarget.focus();
      } else {
        this.refs.favoriteHeading.focus();
      }
    } catch {
      this.#showStorageError();
    }
  };

  #handleFavoritesChange = () => {
    this.#render();
  };

  /** @param {StorageEvent} event */
  #handleStorageChange = (event) => {
    if (event.key === STORAGE_KEY || event.key === null) this.#render();
  };

  #render() {
    try {
      const favorites = readFavorites();
      const activeElement = document.activeElement;
      const focusedProductId =
        activeElement instanceof HTMLButtonElement && this.contains(activeElement)
          ? activeElement.dataset.removeFavorite
          : undefined;
      this.refs.favoriteStatus.textContent = '';
      this.refs.favoriteList.replaceChildren(...favorites.map((favorite) => this.#createFavoriteItem(favorite)));
      this.refs.favoriteList.hidden = favorites.length === 0;
      this.refs.favoriteEmpty.hidden = favorites.length !== 0;
      for (const favorite of favorites) {
        if (!favorite.image && !this.#pendingImageLookups.has(favorite.id)) {
          this.#loadMissingImage(favorite);
        }
      }

      if (focusedProductId) {
        const remainingButtons = this.querySelectorAll('[data-remove-favorite]');
        const matchingButton = Array.from(remainingButtons).find(
          (button) => button.dataset.removeFavorite === focusedProductId
        );
        if (matchingButton instanceof HTMLButtonElement) {
          matchingButton.focus();
        } else if (remainingButtons[0] instanceof HTMLButtonElement) {
          remainingButtons[0].focus();
        } else {
          this.refs.favoriteHeading.focus();
        }
      }
    } catch {
      this.refs.favoriteList.replaceChildren();
      this.refs.favoriteList.hidden = true;
      this.refs.favoriteEmpty.hidden = true;
      this.#showStorageError();
    }
  }

  /** @param {FavoriteProduct} favorite */
  #createFavoriteItem(favorite) {
    const item = document.createElement('li');
    item.className = 'favorites-page__item';

    const link = document.createElement('a');
    link.className = 'favorites-page__product';
    link.href = favorite.url;

    if (favorite.image) {
      const image = document.createElement('img');
      image.className = 'favorites-page__image';
      image.src = favorite.image;
      image.alt = '';
      image.loading = 'lazy';
      image.width = 160;
      image.height = 160;
      link.append(image);
    }

    const title = document.createElement('span');
    title.className = 'favorites-page__title';
    title.textContent = favorite.title;
    link.append(title);

    const removeButton = document.createElement('button');
    removeButton.className = 'favorites-page__remove button button-secondary';
    removeButton.type = 'button';
    removeButton.dataset.removeFavorite = favorite.id;
    removeButton.textContent = this.dataset.removeAction || '';
    removeButton.setAttribute(
      'aria-label',
      (this.dataset.removeLabel || '').replace('__title__', favorite.title)
    );

    item.append(link, removeButton);
    return item;
  }

  /** @param {FavoriteProduct} favorite */
  async #loadMissingImage(favorite) {
    this.#pendingImageLookups.add(favorite.id);

    try {
      const response = await fetch(favorite.url, {
        credentials: 'same-origin',
        signal: this.#imageLookupController.signal,
      });
      const responseUrl = new URL(response.url);
      if (
        !response.ok ||
        responseUrl.origin !== window.location.origin ||
        !responseUrl.pathname.includes('/products/')
      ) {
        return;
      }

      const html = await response.text();
      const documentFromResponse = new DOMParser().parseFromString(html, 'text/html');
      const imageUrl = normalizeImageUrl(
        documentFromResponse.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
          documentFromResponse.querySelector('meta[name="twitter:image"]')?.getAttribute('content')
      );
      if (!imageUrl || !this.isConnected) return;

      const currentFavorites = readFavorites();
      const currentFavorite = currentFavorites.find((item) => item.id === favorite.id);
      if (!currentFavorite || currentFavorite.image) return;

      saveFavorites(
        currentFavorites.map((item) => (item.id === favorite.id ? { ...item, image: imageUrl } : item))
      );
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.warn('[favorites] Could not load a saved product image:', error);
      }
    } finally {
      this.#pendingImageLookups.delete(favorite.id);
    }
  }

  #showStorageError() {
    this.refs.favoriteStatus.textContent = this.dataset.storageError || '';
  }
}

if (!customElements.get('favorites-page')) {
  customElements.define('favorites-page', FavoritesPage);
}
