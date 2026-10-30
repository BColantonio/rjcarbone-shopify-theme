import { Component } from '@theme/component';

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_REASONS = new Set(['damaged', 'incorrect', 'quality', 'wrong_quantity_received', 'other']);

/**
 * @typedef {{ id: string, title: string, purchasedQuantity: number }} SampleItem
 * @typedef {{ id: string, items: SampleItem[] }} SampleOrder
 * @typedef {object} ReturnsRequestRefs
 * @property {HTMLSelectElement} orderSelect
 * @property {HTMLParagraphElement} orderError
 * @property {HTMLUListElement} itemsList
 * @property {HTMLParagraphElement} itemsError
 * @property {HTMLSelectElement} reason
 * @property {HTMLTextAreaElement} notes
 * @property {HTMLInputElement} photoInput
 * @property {HTMLParagraphElement} photoError
 * @property {HTMLUListElement} photoPreviews
 * @property {HTMLDListElement} reviewSummary
 * @property {HTMLUListElement} reviewPhotos
 * @property {HTMLElement} confirmation
 * @property {HTMLParagraphElement} status
 */

/** @type {SampleOrder[]} */
const sampleOrders = [
  {
    id: 'DEMO-1042',
    items: [
      { id: 'rose-color-50cm', title: 'Rose Color 50Cm', purchasedQuantity: 3 },
      { id: 'hydrangea-white-blue', title: 'Hydrangea White/Blue', purchasedQuantity: 2 },
      { id: 'monstera', title: 'Monstera', purchasedQuantity: 1 },
    ],
  },
  {
    id: 'DEMO-2087',
    items: [
      { id: 'tulips-cut', title: 'Tulips Cut', purchasedQuantity: 5 },
      { id: 'foliage-plants', title: 'Foliage Plants', purchasedQuantity: 2 },
      { id: 'spray-roses', title: 'Spray Roses', purchasedQuantity: 4 },
    ],
  },
];

/**
 * Runs a returns-request walkthrough using fictional order data only.
 *
 * @extends {Component<ReturnsRequestRefs>}
 */
class ReturnsRequest extends Component {
  constructor() {
    super();
    this.requiredRefs = [
      'orderSelect',
      'orderError',
      'itemsList',
      'itemsError',
      'reason',
      'notes',
      'photoInput',
      'photoError',
      'photoPreviews',
      'reviewSummary',
      'reviewPhotos',
      'confirmation',
      'status',
    ];
    /** @type {File[]} */
    this.photoFiles = [];
    /** @type {Map<File, string>} */
    this.photoUrls = new Map();
  }

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.releasePhotoUrls();
  }

  handleOrderChange() {
    this.clearError(this.refs.orderSelect, this.refs.orderError);
    this.refs.itemsList.replaceChildren();
    this.refs.itemsError.hidden = true;
    this.refs.itemsError.textContent = '';

    const order = this.getSelectedOrder();
    if (order) this.renderItems(order);
  }

  showItems() {
    const order = this.getSelectedOrder();
    if (!order) {
      this.setError(this.refs.orderSelect, this.refs.orderError, this.message('orderError'));
      this.refs.orderSelect.focus();
      return;
    }

    this.clearError(this.refs.orderSelect, this.refs.orderError);
    this.setStep(2);
  }

  backToOrder() {
    this.setStep(1);
  }

  backToItems() {
    this.setStep(2);
  }

  showDetails() {
    if (!this.validateItems()) return;
    this.setStep(3);
  }

  backToDetails() {
    this.setStep(3);
  }

  showReview() {
    const reason = this.refs.reason;
    const reasonError = this.querySelector(`#${reason.id}-error`);
    if (!(reasonError instanceof HTMLElement)) throw new Error('Returns prototype is missing the reason error message.');

    if (!ALLOWED_REASONS.has(reason.value)) {
      this.setError(reason, reasonError, this.message('reasonError'));
      reason.focus();
      return;
    }

    this.clearError(reason, reasonError);
    this.renderReview();
    this.setStep(4);
  }

  submitDemo() {
    this.querySelectorAll('[data-step]').forEach((step) => {
      if (step instanceof HTMLElement) step.hidden = true;
    });
    this.refs.confirmation.hidden = false;
    this.refs.status.textContent = '';
    const heading = this.refs.confirmation.querySelector('h2');
    if (heading instanceof HTMLElement) heading.focus();
  }

  /** @param {Event} event */
  handleItemToggle(event) {
    const checkbox = event.target;
    if (!(checkbox instanceof HTMLInputElement) || checkbox.type !== 'checkbox') return;

    const quantity = this.querySelector(`#${checkbox.id}-quantity`);
    if (!(quantity instanceof HTMLInputElement)) throw new Error('Returns prototype is missing an item quantity field.');

    quantity.disabled = !checkbox.checked;
    quantity.value = checkbox.checked ? '1' : '';
    quantity.removeAttribute('aria-invalid');
    const error = this.querySelector(`#${quantity.id}-error`);
    if (error instanceof HTMLElement) {
      error.hidden = true;
      error.textContent = '';
    }

    if (checkbox.checked) {
      this.refs.itemsError.hidden = true;
      this.refs.itemsError.textContent = '';
    }
  }

  /** @param {Event} event */
  clearFieldError(event) {
    const field = event.target;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) return;

    field.removeAttribute('aria-invalid');
    const error = this.querySelector(`#${field.id}-error`);
    if (error instanceof HTMLElement) {
      error.hidden = true;
      error.textContent = '';
    }
  }

  handlePhotoSelection() {
    const input = this.refs.photoInput;
    if (!(input instanceof HTMLInputElement)) throw new Error('Returns prototype is missing its photo selector.');

    this.refs.photoError.hidden = true;
    this.refs.photoError.textContent = '';
    input.removeAttribute('aria-invalid');
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) return;

    const messages = [];
    const availableSlots = MAX_PHOTOS - this.photoFiles.length;
    const accepted = [];

    for (const file of files) {
      if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
        messages.push(this.message('photoTypeError', { name: file.name }));
      } else if (file.size > MAX_PHOTO_BYTES) {
        messages.push(this.message('photoSizeError', { name: file.name }));
      } else if (accepted.length >= availableSlots) {
        messages.push(this.message('photoLimitError', { name: file.name }));
      } else {
        accepted.push(file);
      }
    }

    for (const file of accepted) {
      this.photoFiles.push(file);
      this.photoUrls.set(file, URL.createObjectURL(file));
    }

    if (messages.length > 0) {
      this.refs.photoError.textContent = messages.join(' ');
      this.refs.photoError.hidden = false;
      input.setAttribute('aria-invalid', 'true');
    }

    this.renderPhotoPreviews();
  }

  /** @param {Event} event */
  removePhoto(event) {
    const button = event.target;
    if (!(button instanceof HTMLButtonElement)) return;

    const index = Number(button.dataset.photoIndex);
    if (!Number.isInteger(index) || index < 0 || index >= this.photoFiles.length) return;

    const [file] = this.photoFiles.splice(index, 1);
    if (file) this.revokePhotoUrl(file);
    this.refs.photoError.hidden = true;
    this.refs.photoError.textContent = '';
    this.refs.photoInput.removeAttribute('aria-invalid');
    this.renderPhotoPreviews();
  }

  /** @param {SampleOrder} order */
  renderItems(order) {
    this.refs.itemsList.replaceChildren();

    for (const item of order.items) {
      const listItem = document.createElement('li');
      listItem.className = 'returns-request__item';

      const choiceLabel = document.createElement('label');
      choiceLabel.className = 'returns-request__item-choice';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = this.itemInputId(item.id);
      checkbox.value = item.id;
      checkbox.setAttribute('on:change', '/handleItemToggle');
      const itemName = document.createElement('span');
      itemName.textContent = this.message('purchasedQuantityLabel', {
        title: item.title,
        quantity: String(item.purchasedQuantity),
      });
      choiceLabel.append(checkbox, itemName);

      const quantityField = document.createElement('div');
      quantityField.className = 'returns-request__quantity-field';
      const quantityLabel = document.createElement('label');
      quantityLabel.htmlFor = `${checkbox.id}-quantity`;
      quantityLabel.textContent = this.message('quantityLabel');
      const quantity = document.createElement('input');
      quantity.type = 'number';
      quantity.className = 'returns-request__quantity';
      quantity.id = `${checkbox.id}-quantity`;
      quantity.min = '1';
      quantity.max = String(item.purchasedQuantity);
      quantity.step = '1';
      quantity.disabled = true;
      quantity.setAttribute('aria-describedby', `${quantity.id}-help ${quantity.id}-error`);
      quantity.setAttribute('on:input', '/clearFieldError');
      const help = document.createElement('span');
      help.className = 'returns-request__help';
      help.id = `${quantity.id}-help`;
      help.textContent = this.message('quantityHelp', { quantity: String(item.purchasedQuantity) });
      const error = document.createElement('span');
      error.className = 'returns-request__error';
      error.id = `${quantity.id}-error`;
      error.setAttribute('role', 'alert');
      error.hidden = true;

      quantityField.append(quantityLabel, quantity, help, error);
      listItem.append(choiceLabel, quantityField);
      this.refs.itemsList.append(listItem);
    }
  }

  validateItems() {
    const checkedItems = this.refs.itemsList.querySelectorAll('input[type="checkbox"]:checked');
    if (checkedItems.length === 0) {
      this.refs.itemsError.textContent = this.message('itemSelectionError');
      this.refs.itemsError.hidden = false;
      const firstCheckbox = this.refs.itemsList.querySelector('input[type="checkbox"]');
      if (firstCheckbox instanceof HTMLElement) firstCheckbox.focus();
      return false;
    }

    this.refs.itemsError.hidden = true;
    this.refs.itemsError.textContent = '';
    /** @type {HTMLInputElement | null} */
    let firstInvalid = null;

    for (const checkbox of checkedItems) {
      if (!(checkbox instanceof HTMLInputElement)) continue;
      const quantity = this.querySelector(`#${checkbox.id}-quantity`);
      if (!(quantity instanceof HTMLInputElement)) throw new Error('Returns prototype is missing an item quantity field.');

      const value = Number(quantity.value);
      const purchasedQuantity = Number(quantity.max);
      const error = this.querySelector(`#${quantity.id}-error`);
      if (!(error instanceof HTMLElement)) throw new Error('Returns prototype is missing an item quantity error message.');

      if (!Number.isInteger(value) || value < 1 || value > purchasedQuantity) {
        this.setError(quantity, error, this.message('quantityError', { quantity: String(purchasedQuantity) }));
        if (!firstInvalid) firstInvalid = quantity;
      } else {
        this.clearError(quantity, error);
      }
    }

    if (firstInvalid instanceof HTMLInputElement) {
      firstInvalid.focus();
      return false;
    }

    return true;
  }

  renderPhotoPreviews() {
    const previews = this.refs.photoPreviews;
    previews.replaceChildren();

    this.photoFiles.forEach((file, index) => {
      const url = this.photoUrls.get(file);
      if (!url) throw new Error('Returns prototype is missing a photo preview URL.');

      const item = document.createElement('li');
      item.className = 'returns-request__photo';
      const image = document.createElement('img');
      image.src = url;
      image.alt = this.message('photoPreviewAlt', { name: file.name });
      image.width = 240;
      image.height = 240;
      image.decoding = 'async';
      const name = document.createElement('span');
      name.textContent = file.name;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button button-secondary returns-request__remove';
      remove.textContent = this.message('removeButton');
      remove.setAttribute('aria-label', this.message('removePhotoLabel', { name: file.name }));
      remove.dataset.photoIndex = String(index);
      remove.setAttribute('on:click', '/removePhoto');
      item.append(image, name, remove);
      previews.append(item);
    });
  }

  renderReview() {
    const order = this.getSelectedOrder();
    if (!order) throw new Error('Returns prototype cannot review a request without a sample order.');

    const entries = [
      [this.message('reviewOrder'), order.id],
      [
        this.message('reviewItems'),
        order.items
          .filter((item) => {
            const checkbox = this.querySelector(`#${this.itemInputId(item.id)}`);
            return checkbox instanceof HTMLInputElement && checkbox.checked;
          })
          .map((item) => {
            const quantity = this.querySelector(`#${this.itemInputId(item.id)}-quantity`);
            if (!(quantity instanceof HTMLInputElement)) throw new Error('Returns prototype is missing an item quantity field.');
            return this.message('reviewItemLine', { title: item.title, quantity: quantity.value });
          })
          .join(', '),
      ],
      [this.message('reviewReason'), this.refs.reason.selectedOptions[0]?.textContent?.trim() ?? ''],
      [this.message('reviewNotes'), this.refs.notes.value.trim() || this.message('reviewNoNotes')],
      [
        this.message('reviewPhotos'),
        this.photoFiles.length ? this.photoFiles.map((file) => file.name).join(', ') : this.message('reviewNoPhotos'),
      ],
    ];

    this.refs.reviewSummary.replaceChildren();
    for (const [label, value] of entries) {
      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      description.textContent = value;
      this.refs.reviewSummary.append(term, description);
    }

    const reviewPhotos = this.refs.reviewPhotos;
    reviewPhotos.replaceChildren();
    this.photoFiles.forEach((file) => {
      const url = this.photoUrls.get(file);
      if (!url) throw new Error('Returns prototype is missing a photo preview URL.');

      const item = document.createElement('li');
      item.className = 'returns-request__photo';
      const image = document.createElement('img');
      image.src = url;
      image.alt = this.message('photoPreviewAlt', { name: file.name });
      image.width = 240;
      image.height = 240;
      image.decoding = 'async';
      const name = document.createElement('span');
      name.textContent = file.name;
      item.append(image, name);
      reviewPhotos.append(item);
    });
  }

  /** @param {number} stepNumber */
  setStep(stepNumber) {
    this.querySelectorAll('[data-step]').forEach((step) => {
      if (step instanceof HTMLElement) {
        step.hidden = step.getAttribute('data-step') !== String(stepNumber);
      }
    });

    this.querySelectorAll('[data-progress-step]').forEach((item) => {
      if (item.getAttribute('data-progress-step') === String(stepNumber)) {
        item.setAttribute('aria-current', 'step');
      } else {
        item.removeAttribute('aria-current');
      }
    });

    this.refs.status.textContent = '';
    const heading = this.querySelector(`[data-step="${stepNumber}"] h2`);
    if (heading instanceof HTMLElement) heading.focus();
  }

  /**
   * @param {HTMLInputElement | HTMLSelectElement} field
   * @param {HTMLElement} error
   * @param {string} message
   */
  setError(field, error, message) {
    field.setAttribute('aria-invalid', 'true');
    error.textContent = message;
    error.hidden = false;
  }

  /**
   * @param {HTMLInputElement | HTMLSelectElement} field
   * @param {HTMLElement} error
   */
  clearError(field, error) {
    field.removeAttribute('aria-invalid');
    error.textContent = '';
    error.hidden = true;
  }

  /** @returns {SampleOrder | undefined} */
  getSelectedOrder() {
    return sampleOrders.find((order) => order.id === this.refs.orderSelect.value);
  }

  /** @param {string} itemId */
  itemInputId(itemId) {
    const sectionId = this.dataset.sectionId;
    if (!sectionId) throw new Error('Returns prototype is missing its section identifier.');

    return `returns-${sectionId}-item-${itemId}`;
  }

  /**
   * @param {string} name
   * @param {Record<string, string>} [values]
   */
  message(name, values = {}) {
    let message = this.dataset[name];
    if (typeof message !== 'string') throw new Error(`Returns prototype is missing the "${name}" translation.`);

    for (const [key, value] of Object.entries(values)) {
      message = message.replace(`__${key}__`, value);
    }

    return message;
  }

  revokePhotoUrl(file) {
    const url = this.photoUrls.get(file);
    if (!url) return;

    URL.revokeObjectURL(url);
    this.photoUrls.delete(file);
  }

  releasePhotoUrls() {
    for (const file of this.photoFiles) this.revokePhotoUrl(file);
    this.photoFiles = [];
  }
}

if (!customElements.get('returns-request-component')) {
  customElements.define('returns-request-component', ReturnsRequest);
}
