import { Component } from '@theme/component';
import { fetchConfig } from '@theme/utilities';

/**
 * @typedef {object} Refs
 * @property {HTMLInputElement} dateInput
 * @property {HTMLButtonElement} clearButton
 * @property {HTMLButtonElement} retryButton
 * @property {HTMLElement} status
 *
 * @extends {Component<Refs>}
 */
class CartDeliveryDate extends Component {
  requiredRefs = ['dateInput', 'clearButton', 'retryButton', 'status'];

  /** @type {boolean} */
  static #initialized = false;

  /** @type {string} */
  static #selectedDate = '';

  /** @type {string} */
  static #persistedDate = '';

  /** @type {'idle' | 'saving' | 'saved' | 'cleared' | 'error' | 'past'} */
  static #state = 'idle';

  /** @type {number} */
  static #requestVersion = 0;

  /** @type {boolean} */
  static #forceSave = false;

  /** @type {Promise<void> | null} */
  static #savePromise = null;

  connectedCallback() {
    super.connectedCallback();
    this.#initializeSelection();
    this.#render();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#initializeSelection();
    this.#render();
  }

  /**
   * Ensures each newly rendered cart section reflects the current page-level selection.
   */
  #initializeSelection() {
    if (CartDeliveryDate.#initialized) return;

    const savedDate = this.dataset.savedDate || this.refs.dateInput.value;
    CartDeliveryDate.#selectedDate = savedDate;
    CartDeliveryDate.#persistedDate = savedDate;
    CartDeliveryDate.#initialized = true;
  }

  /** @param {Event} event */
  handleDateChange(event) {
    if (event.target !== this.refs.dateInput) return;

    const selectedDate = this.refs.dateInput.value;
    const today = CartDeliveryDate.#getLocalDate();
    this.refs.dateInput.min = today;

    if (selectedDate && (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate) || selectedDate < today)) {
      this.refs.dateInput.value = CartDeliveryDate.#selectedDate;
      CartDeliveryDate.#state = 'past';
      CartDeliveryDate.#renderAll();
      return;
    }

    this.#selectDate(selectedDate);
  }

  /** @param {MouseEvent} event */
  clearDate(event) {
    event.preventDefault();
    this.#selectDate('');
    this.refs.dateInput.focus();
  }

  /** @param {MouseEvent} event */
  retrySave(event) {
    event.preventDefault();
    CartDeliveryDate.#forceSave = true;
    CartDeliveryDate.#state = 'saving';
    CartDeliveryDate.#requestVersion += 1;
    CartDeliveryDate.#renderAll();
    this.refs.dateInput.focus();
    CartDeliveryDate.#saveLatest();
  }

  /** @param {string} selectedDate */
  #selectDate(selectedDate) {
    if (selectedDate === CartDeliveryDate.#selectedDate && CartDeliveryDate.#state !== 'error') return;

    CartDeliveryDate.#selectedDate = selectedDate;
    CartDeliveryDate.#state = 'saving';
    CartDeliveryDate.#requestVersion += 1;
    CartDeliveryDate.#renderAll();
    CartDeliveryDate.#saveLatest();
  }

  static #saveLatest() {
    if (this.#savePromise) return;

    this.#savePromise = this.#persistLatest().finally(() => {
      this.#savePromise = null;
      if (this.#state === 'saving' && (this.#forceSave || this.#persistedDate !== this.#selectedDate)) {
        this.#saveLatest();
      }
    });
  }

  static async #persistLatest() {
    while (this.#forceSave || this.#persistedDate !== this.#selectedDate) {
      const selectedDate = this.#selectedDate;
      const requestVersion = this.#requestVersion;
      this.#forceSave = false;

      try {
        const response = await fetch(
          Theme.routes.cart_update_url,
          fetchConfig('json', {
            body: JSON.stringify({
              attributes: {
                'Requested delivery date': selectedDate,
              },
            }),
          })
        );

        if (!response.ok) {
          throw new Error(`Cart update failed with status ${response.status}`);
        }

        const cart = await response.json();
        if (cart.errors) {
          throw new Error(typeof cart.errors === 'string' ? cart.errors : JSON.stringify(cart.errors));
        }
      } catch (error) {
        console.error('[cart-delivery-date] Failed to save requested delivery date:', error);

        if (requestVersion !== this.#requestVersion) continue;

        this.#state = 'error';
        this.#renderAll();
        return;
      }

      this.#persistedDate = selectedDate;
      if (requestVersion !== this.#requestVersion || selectedDate !== this.#selectedDate) continue;

      this.#state = selectedDate ? 'saved' : 'cleared';
      this.#renderAll();
    }
  }

  #render() {
    const input = this.refs.dateInput;
    const today = CartDeliveryDate.#getLocalDate();
    input.min = today;
    if (input.value !== CartDeliveryDate.#selectedDate) {
      input.value = CartDeliveryDate.#selectedDate;
    }

    this.refs.clearButton.hidden = !CartDeliveryDate.#selectedDate;
    this.refs.retryButton.hidden = CartDeliveryDate.#state !== 'error';
    this.setAttribute('aria-busy', String(CartDeliveryDate.#state === 'saving'));

    const messages = {
      saving: this.dataset.savingMessage,
      saved: this.dataset.savedMessage,
      cleared: this.dataset.clearedMessage,
      error: this.dataset.errorMessage,
      past: this.dataset.pastMessage,
    };
    this.refs.status.textContent = messages[CartDeliveryDate.#state] || '';
  }

  static #renderAll() {
    for (const element of document.querySelectorAll('cart-delivery-date')) {
      if (element instanceof CartDeliveryDate) element.#render();
    }
  }

  static #getLocalDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

if (!customElements.get('cart-delivery-date')) {
  customElements.define('cart-delivery-date', CartDeliveryDate);
}
