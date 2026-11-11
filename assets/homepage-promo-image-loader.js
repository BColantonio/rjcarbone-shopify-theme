import { Component } from '@theme/component';

/**
 * @typedef {object} Refs
 * @property {HTMLImageElement[]} images
 *
 * @extends {Component<Refs>}
 */
class HomepagePromoImageLoader extends Component {
  /** @type {IntersectionObserver | null} */
  #observer = null;

  connectedCallback() {
    super.connectedCallback();
    this.#observeImages();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#observeImages();
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#observer = null;
    super.disconnectedCallback();
  }

  #observeImages() {
    this.#observer?.disconnect();
    this.#observer = null;
    const images = this.refs.images;
    if (!images?.length) return;

    if (!('IntersectionObserver' in window)) {
      for (const image of images) this.#loadImage(image);
      return;
    }

    this.#observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target instanceof HTMLImageElement) {
            this.#loadImage(entry.target);
          }
        }
      },
      { rootMargin: '400px 0px' }
    );

    for (const image of images) this.#observer.observe(image);
  }

  /** @param {HTMLImageElement} image */
  #loadImage(image) {
    const source = image.dataset.src;
    if (!source) return;

    image.alt = image.dataset.alt || '';
    image.src = source;
    delete image.dataset.src;
    delete image.dataset.alt;
    this.#observer?.unobserve(image);
  }
}

if (!customElements.get('homepage-promo-images-component')) {
  customElements.define('homepage-promo-images-component', HomepagePromoImageLoader);
}
