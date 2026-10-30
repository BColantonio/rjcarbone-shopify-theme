import { Component } from '@theme/component';
import { CartErrorEvent, CartLinesUpdateEvent } from '@shopify/events';
import { sampleOrders } from './sample-orders.js';

const STORAGE_KEY = 'theme-saved-orders';
const PRODUCT_HANDLE_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const VARIANT_ID_PATTERN = /^\d+$/;

/**
 * @typedef {{ handle: string, variantId?: string, quantity: number }} SavedOrderItem
 * @typedef {{ name: string, items: SavedOrderItem[] }} SavedOrder
 * @typedef {{ id: string, title: string, price: number, available: boolean, requiresSellingPlan: boolean }} ProductVariant
 * @typedef {{ handle: string, title: string, available: boolean, requiresSellingPlan: boolean, hasSellingPlans: boolean, variants: ProductVariant[] }} ProductData
 * @typedef {{ product?: ProductData, error?: 'missing' | 'lookup' }} LoadedItem
 * @typedef {{ kind: 'sample' | 'saved', sampleId?: string, order: SavedOrder, loaded: LoadedItem[], container: HTMLElement }} ActiveEditor
 * @typedef {{ minimum: number, maximum: number | null, increment: number }} QuantityRule
 * @typedef {object} SavedOrdersRefs
 * @property {HTMLUListElement} sampleList
 * @property {HTMLUListElement} savedList
 * @property {HTMLElement} savedEmpty
 * @property {HTMLElement} savedOrdersStatus
 * @property {HTMLHeadingElement} savedOrdersHeading
 */

/**
 * Validates saved data and limits persistence to names, product/variant IDs, and quantities.
 * @param {unknown} value
 * @returns {SavedOrder[]}
 */
function parseSavedOrders(value) {
  if (!Array.isArray(value)) throw new Error('Saved orders are not a list.');

  const names = new Set();
  return value.map((/** @type {unknown} */ item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error('A saved order is invalid.');
    }

    const record = /** @type {Record<string, unknown>} */ (item);
    if (
      typeof record.name !== 'string' ||
      record.name.trim() === '' ||
      record.name.length > 80 ||
      names.has(record.name)
    ) {
      throw new Error('A saved order name is invalid or duplicated.');
    }
    if (!Array.isArray(record.items)) throw new Error('A saved order has invalid items.');

    const name = record.name.trim();
    if (names.has(name.toLocaleLowerCase())) throw new Error('Saved order names are duplicated.');
    names.add(name.toLocaleLowerCase());
    const items = record.items.map((/** @type {unknown} */ savedItem) => {
      if (typeof savedItem !== 'object' || savedItem === null || Array.isArray(savedItem)) {
        throw new Error('A saved order item is invalid.');
      }

      const savedRecord = /** @type {Record<string, unknown>} */ (savedItem);
      if (
        typeof savedRecord.handle !== 'string' ||
        !PRODUCT_HANDLE_PATTERN.test(savedRecord.handle) ||
        !Number.isSafeInteger(savedRecord.quantity) ||
        Number(savedRecord.quantity) < 1 ||
        (savedRecord.variantId !== undefined &&
          (typeof savedRecord.variantId !== 'string' || !VARIANT_ID_PATTERN.test(savedRecord.variantId)))
      ) {
        throw new Error('A saved order item has invalid product data.');
      }

      return {
        handle: savedRecord.handle,
        ...(typeof savedRecord.variantId === 'string' ? { variantId: savedRecord.variantId } : {}),
        quantity: Number(savedRecord.quantity),
      };
    });

    return { name: record.name.trim(), items };
  });
}

/**
 * Browser-only saved-order and reorder prototype. No customer or order APIs are used.
 *
 * @extends {Component<SavedOrdersRefs>}
 */
class SavedOrders extends Component {
  requiredRefs = ['sampleList', 'savedList', 'savedEmpty', 'savedOrdersStatus', 'savedOrdersHeading'];

  /** @type {ActiveEditor | null} */
  #activeEditor = null;

  #submittingCart = false;
  #quantityRulesInvalid = false;

  /** @type {Map<string, QuantityRule>} */
  #quantityRules = new Map();

  /** @type {AbortController | null} */
  #productLookupController = null;
  #openRequestGeneration = 0;

  connectedCallback() {
    super.connectedCallback();
    this.#openRequestGeneration += 1;
    this.addEventListener('click', this.#handleClick);
    this.addEventListener('change', this.#handleChange);
    this.addEventListener('input', this.#handleInput);
    this.#readQuantityRules();
    this.#renderSamples();
    this.#renderSavedOrders();
    if (this.#quantityRulesInvalid) this.#setStatus(this.#message('quantityRuleError'));
  }

  disconnectedCallback() {
    this.#openRequestGeneration += 1;
    this.#productLookupController?.abort();
    this.#productLookupController = null;
    this.removeEventListener('click', this.#handleClick);
    this.removeEventListener('change', this.#handleChange);
    this.removeEventListener('input', this.#handleInput);
    super.disconnectedCallback();
  }

  /** @param {MouseEvent} event */
  #handleClick = (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button[data-action]');
    if (!(button instanceof HTMLButtonElement)) return;

    const action = button.dataset.action;
    if (action === 'open-sample') {
      const sampleId = button.dataset.sampleId;
      if (sampleId) void this.#openSample(sampleId, button);
    } else if (action === 'open-saved') {
      const name = button.dataset.savedName;
      if (name) void this.#openSaved(name, button);
    } else if (action === 'close-editor') {
      this.#closeEditor(true);
    } else if (action === 'save-sample') {
      this.#saveSample();
    } else if (action === 'remove-item') {
      this.#removeItem(button);
    } else if (action === 'remove-list') {
      void this.#removeList(button);
    } else if (action === 'save-name') {
      this.#saveName(button);
    } else if (action === 'add-to-cart') {
      void this.#addToCart(button);
    }
  };

  /** @param {Event} event */
  #handleChange = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

    if (target.matches('[data-quantity]')) {
      this.#updateQuantity(target);
    } else if (target.matches('[data-variant]')) {
      this.#updateVariant(target);
    }
  };

  /** @param {Event} event */
  #handleInput = (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.matches('[data-quantity]')) {
      this.#validateQuantity(target, false);
    }
  };

  #renderSamples() {
    this.refs.sampleList.replaceChildren(
      ...sampleOrders.map((sample) => {
        const item = document.createElement('li');
        item.className = 'saved-orders__card';

        const heading = document.createElement('div');
        heading.className = 'saved-orders__card-heading';
        const title = document.createElement('h3');
        title.textContent = this.#message('orderLabel', { id: sample.id });
        const date = document.createElement('p');
        date.textContent = this.#formatSampleDate(sample.date);
        heading.append(title, date);

        const summary = document.createElement('p');
        summary.textContent = this.#message('itemsLabel', {
          items: sample.items.map((entry) => `${entry.title} × ${entry.purchasedQuantity}`).join(', '),
        });

        const button = this.#button('reviewSave', 'open-sample');
        button.dataset.sampleId = sample.id;
        item.append(heading, summary, button);
        this.refs.sampleList.append(item);
        return item;
      })
    );
  }

  #renderSavedOrders() {
    try {
      const orders = this.#readSavedOrders();
      this.refs.savedList.replaceChildren(...orders.map((order) => this.#createSavedOrderCard(order)));
      const active = this.#activeEditor;
      if (active?.kind === 'saved') {
        const card = Array.from(this.refs.savedList.children).find((element) =>
          Array.from(element.querySelectorAll('button[data-action="open-saved"]')).some(
            (button) => button.getAttribute('data-saved-name') === active.order.name
          )
        );
        if (card) card.append(active.container);
      }
      this.refs.savedEmpty.hidden = orders.length !== 0;
      if (orders.length === 0) this.refs.savedOrdersStatus.textContent = '';
    } catch (error) {
      this.refs.savedList.replaceChildren();
      this.refs.savedEmpty.hidden = true;
      this.#showStorageError(error);
    }
  }

  /** @param {SavedOrder} order */
  #createSavedOrderCard(order) {
    const item = document.createElement('li');
    item.className = 'saved-orders__card';

    const heading = document.createElement('div');
    heading.className = 'saved-orders__card-heading';
    const title = document.createElement('h3');
    title.textContent = order.name;
    heading.append(title);

    const renameField = document.createElement('div');
    renameField.className = 'saved-orders__field';
    const renameId = `saved-orders-rename-${this.#safeId(order.name)}`;
    const renameLabel = document.createElement('label');
    renameLabel.htmlFor = renameId;
    renameLabel.textContent = this.#message('renameLabel');
    const renameInput = document.createElement('input');
    renameInput.id = renameId;
    renameInput.type = 'text';
    renameInput.maxLength = 80;
    renameInput.value = order.name;
    renameInput.dataset.rename = order.name;
    const saveNameButton = this.#button('saveName', 'save-name');
    saveNameButton.dataset.savedName = order.name;
    renameField.append(renameLabel, renameInput);

    const summary = document.createElement('p');
    summary.dataset.savedSummary = '';
    summary.textContent = this.#message('itemsLabel', {
      items: order.items.map((entry) => `${entry.handle} × ${entry.quantity}`).join(', '),
    });
    const actions = document.createElement('div');
    actions.className = 'saved-orders__actions';
    const openButton = this.#button('reviewOrder', 'open-saved');
    openButton.dataset.savedName = order.name;
    const removeButton = this.#button('removeList', 'remove-list', true);
    removeButton.dataset.savedName = order.name;
    actions.append(openButton, saveNameButton, removeButton);
    item.append(heading, renameField, summary, actions);
    return item;
  }

  /**
   * @param {SavedOrderItem} entry
   * @param {number} index
   * @param {ActiveEditor} active
   */
  #createQuantityControls(entry, index, active) {
    const controls = document.createElement('div');
    controls.className = 'saved-orders__quantity-controls';
    const quantityField = document.createElement('div');
    quantityField.className = 'saved-orders__field';
    const quantityLabel = document.createElement('label');
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    const variant = active.loaded[index]?.product?.variants.find((candidate) => candidate.id === entry.variantId);
    const rule = variant ? this.#quantityRules.get(`${entry.handle}:${variant.id}`) : undefined;
    quantityInput.min = String(rule?.minimum ?? 1);
    quantityInput.step = String(rule?.increment ?? 1);
    if (rule?.maximum !== null && rule?.maximum !== undefined) {
      quantityInput.max = String(rule.maximum);
    }
    quantityInput.value = String(entry.quantity);
    quantityInput.className = 'saved-orders__quantity';
    quantityInput.dataset.quantity = '';
    quantityInput.dataset.itemIndex = String(index);
    const quantityId = this.#fieldId(active, index, 'quantity');
    quantityInput.id = quantityId;
    quantityLabel.htmlFor = quantityId;
    quantityLabel.textContent = this.#message('quantityLabel');
    quantityInput.setAttribute('aria-describedby', `${quantityId}-error`);
    const quantityError = document.createElement('span');
    quantityError.className = 'saved-orders__error';
    quantityError.id = `${quantityId}-error`;
    quantityError.setAttribute('role', 'alert');
    quantityField.append(quantityLabel, quantityInput, quantityError);
    const removeButton = this.#button('removeItem', 'remove-item', true);
    removeButton.dataset.itemIndex = String(index);
    controls.append(quantityField, removeButton);
    return controls;
  }

  /** @param {string} sampleId @param {HTMLButtonElement} trigger */
  async #openSample(sampleId, trigger) {
    const sample = sampleOrders.find((entry) => entry.id === sampleId);
    if (!sample) return;

    this.#closeEditor();
    const generation = this.#openRequestGeneration;
    const lookupController = this.#startProductLookup();
    trigger.disabled = true;
    this.#setStatus(this.#message('loading'));

    const order = {
      name: sample.id,
      items: sample.items.map((entry) => ({
        handle: entry.id,
        quantity: entry.purchasedQuantity,
      })),
    };
    const loaded = await this.#loadItems(order.items, lookupController.signal);
    if (!this.isConnected || generation !== this.#openRequestGeneration) {
      trigger.disabled = false;
      return;
    }
    this.#applySingleVariantDefaults(order, loaded);

    const container = document.createElement('div');
    container.className = 'saved-orders__editor';
    trigger.closest('.saved-orders__card')?.append(container);
    this.#activeEditor = { kind: 'sample', sampleId, order, loaded, container };
    this.#renderEditor();
    container.querySelector('h3')?.focus();
    trigger.disabled = false;
    this.#setStatus('');
  }

  /** @param {string} name @param {HTMLButtonElement} trigger */
  async #openSaved(name, trigger) {
    let order;
    try {
      order = this.#readSavedOrders().find((entry) => entry.name === name);
    } catch (error) {
      this.#showStorageError(error);
      return;
    }
    if (!order) return;

    this.#closeEditor();
    const generation = this.#openRequestGeneration;
    const lookupController = this.#startProductLookup();
    trigger.disabled = true;
    this.#setStatus(this.#message('loading'));
    const loaded = await this.#loadItems(order.items, lookupController.signal);
    if (!this.isConnected || generation !== this.#openRequestGeneration) {
      trigger.disabled = false;
      return;
    }
    this.#applySingleVariantDefaults(order, loaded);

    const container = document.createElement('div');
    container.className = 'saved-orders__editor';
    trigger.closest('.saved-orders__card')?.append(container);
    this.#activeEditor = { kind: 'saved', order, loaded, container };
    this.#renderEditor();
    container.querySelector('h3')?.focus();
    trigger.disabled = false;
    this.#setStatus('');
  }

  /** @param {boolean} [restoreFocus] */
  #closeEditor(restoreFocus = false) {
    this.#openRequestGeneration += 1;
    this.#productLookupController?.abort();
    this.#productLookupController = null;
    const active = this.#activeEditor;
    const trigger = active?.container.closest('.saved-orders__card')?.querySelector('button[data-action^="open-"]');
    this.#activeEditor?.container.remove();
    this.#activeEditor = null;
    if (restoreFocus && trigger instanceof HTMLButtonElement) trigger.focus();
  }

  #renderEditor() {
    const active = this.#activeEditor;
    if (!active) return;
    const { container, kind, order } = active;
    container.replaceChildren();

    const closeButton = this.#button('closeReview', 'close-editor', true);
    container.append(closeButton);

    const heading = document.createElement('h3');
    heading.tabIndex = -1;
    heading.textContent = kind === 'sample' ? this.#message('sampleHeading') : order.name;
    container.append(heading);

    if (kind === 'sample') {
      const nameField = document.createElement('div');
      nameField.className = 'saved-orders__field';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.maxLength = 80;
      nameInput.value = order.name;
      nameInput.dataset.newName = '';
      nameInput.setAttribute('aria-label', this.#message('nameLabel'));
      nameInput.placeholder = this.#message('namePlaceholder');
      nameField.append(nameInput);
      container.append(nameField);
    } else {
      const removeListButton = this.#button('removeList', 'remove-list', true);
      removeListButton.dataset.savedName = order.name;
      container.append(removeListButton);
    }

    const items = document.createElement('ul');
    items.className = 'saved-orders__items';
    order.items.forEach((entry, index) => {
      const loaded = active.loaded[index] || { error: 'lookup' };
      items.append(this.#createOrderItem(entry, loaded, index, active));
    });
    container.append(items);

    if (kind === 'sample') {
      container.append(this.#button('saveOrder', 'save-sample'));
    } else {
      const addButton = this.#button('addToCart', 'add-to-cart');
      addButton.disabled = this.#submittingCart || this.#quantityRulesInvalid;
      container.append(addButton);
    }
  }

  /**
   * @param {SavedOrderItem} entry
   * @param {LoadedItem} loaded
   * @param {number} index
   * @param {ActiveEditor} active
   */
  #createOrderItem(entry, loaded, index, active) {
    const item = document.createElement('li');
    item.className = 'saved-orders__item';
    item.dataset.itemIndex = String(index);

    const details = document.createElement('div');
    const title = document.createElement('h3');
    title.className = 'saved-orders__item-heading';
    title.textContent = loaded.product?.title || entry.handle;
    details.append(title);

    const status = document.createElement('p');
    status.className = 'saved-orders__item-status';
    status.dataset.itemStatus = '';

    if (loaded.error === 'missing') {
      status.textContent = this.#message('unavailable');
      item.append(
        details,
        this.#createQuantityControls(entry, index, active),
        status,
        this.#createProductLink(entry.handle)
      );
    } else if (loaded.error === 'lookup' || !loaded.product) {
      status.textContent = this.#message('lookupError');
      item.append(
        details,
        this.#createQuantityControls(entry, index, active),
        status,
        this.#createProductLink(entry.handle)
      );
    } else {
      const product = loaded.product;
      const variant = product.variants.find((candidate) => candidate.id === entry.variantId);
      const isProductPageRequired = product.requiresSellingPlan || product.hasSellingPlans;

      if (product.variants.length > 1) {
        const variantField = document.createElement('div');
        variantField.className = 'saved-orders__field';
        const variantLabel = document.createElement('label');
        const variantSelect = document.createElement('select');
        const variantId = this.#fieldId(active, index, 'variant');
        variantSelect.id = variantId;
        variantSelect.dataset.variant = '';
        variantSelect.dataset.itemIndex = String(index);
        variantLabel.htmlFor = variantId;
        variantLabel.textContent = this.#message('variantLabel');

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = this.#message('chooseVariant');
        placeholder.selected = !variant;
        variantSelect.append(placeholder);
        for (const option of product.variants) {
          const optionElement = document.createElement('option');
          optionElement.value = option.id;
          optionElement.textContent = option.title;
          optionElement.disabled = !option.available;
          optionElement.selected = option.id === variant?.id;
          variantSelect.append(optionElement);
        }
        variantField.append(variantLabel, variantSelect);
        details.append(variantField);
      }

      if (isProductPageRequired) {
        status.textContent = this.#message('sellingPlan');
      } else if (!product.available || (variant && !variant.available)) {
        status.textContent = this.#message('unavailable');
      } else if (variant) {
        status.textContent = this.#message('availablePrice', { price: this.#formatPrice(variant.price) });
      } else {
        status.textContent = this.#message('priceCheck');
      }

      details.append(status);
      item.append(details, this.#createQuantityControls(entry, index, active));

      if (isProductPageRequired || !variant || !variant.available) {
        item.append(this.#createProductLink(entry.handle));
      }
    }

    if (active.kind === 'saved') {
      item.dataset.savedItem = 'true';
    }
    return item;
  }

  /** @param {string} handle */
  #createProductLink(handle) {
    const link = document.createElement('a');
    link.className = 'saved-orders__product-link';
    link.href = this.#productUrl(handle).href.replace(/\.js$/, '');
    link.textContent = this.#message('productLink');
    return link;
  }

  /** @param {SavedOrderItem[]} items @returns {Promise<LoadedItem[]>} */
  async #loadItems(items, signal) {
    return Promise.all(items.map((entry) => this.#loadProduct(entry.handle, signal)));
  }

  /** @param {string} handle @param {AbortSignal} [signal] @returns {Promise<LoadedItem>} */
  async #loadProduct(handle, signal) {
    if (!PRODUCT_HANDLE_PATTERN.test(handle)) {
      console.error(`[saved-orders] Invalid product handle "${handle}" could not be checked.`);
      return { error: 'lookup' };
    }

    try {
      const response = await fetch(this.#productUrl(handle), {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        signal,
      });
      if (response.status === 404) return { error: 'missing' };
      if (!response.ok) throw new Error(`Product lookup failed with HTTP ${response.status}.`);

      const raw = await response.json();
      if (
        typeof raw !== 'object' ||
        raw === null ||
        raw.handle !== handle ||
        typeof raw.title !== 'string' ||
        !Array.isArray(raw.variants)
      ) {
        throw new Error('Product lookup returned invalid data.');
      }

      const variants = raw.variants.flatMap((/** @type {unknown} */ item) => {
        if (typeof item !== 'object' || item === null) return [];
        const value = /** @type {Record<string, unknown>} */ (item);
        if (
          (typeof value.id !== 'string' &&
            (typeof value.id !== 'number' || !Number.isSafeInteger(value.id))) ||
          typeof value.price !== 'number' ||
          typeof value.available !== 'boolean' ||
          !VARIANT_ID_PATTERN.test(String(value.id)) ||
          !Number.isSafeInteger(Number(value.id))
        ) {
          return [];
        }
        return [
          {
            id: String(value.id),
            title: typeof value.title === 'string' ? value.title : '',
            price: value.price,
            available: value.available,
            requiresSellingPlan: value.requires_selling_plan === true,
          },
        ];
      });
      if (variants.length === 0) throw new Error('Product lookup returned no valid variants.');

      return {
        product: {
          handle,
          title: raw.title,
          available: raw.available === true,
          requiresSellingPlan: raw.requires_selling_plan === true,
          hasSellingPlans: Array.isArray(raw.selling_plan_groups) && raw.selling_plan_groups.length > 0,
          variants,
        },
      };
    } catch (error) {
      if (error?.name === 'AbortError') return { error: 'lookup' };
      console.warn(`[saved-orders] Could not load current product data for "${handle}":`, error);
      return { error: 'lookup' };
    }
  }

  /** @param {string} handle */
  #productUrl(handle) {
    const configuredRoot = window.Shopify?.routes?.root || '/';
    const root = configuredRoot.endsWith('/') ? configuredRoot : `${configuredRoot}/`;
    const url = new URL(`${root}products/${encodeURIComponent(handle)}.js`, window.location.origin);
    if (url.origin !== window.location.origin) throw new Error('Product URLs must remain on this storefront.');
    return url;
  }

  #saveSample() {
    const active = this.#activeEditor;
    if (!active || active.kind !== 'sample') return;
    const nameInput = active.container.querySelector('input[data-new-name]');
    if (!(nameInput instanceof HTMLInputElement)) throw new Error('Sample order name field is missing.');

    const name = nameInput.value.trim();
    if (!this.#isValidName(name)) {
      this.#setStatus(this.#message('nameError'));
      nameInput.focus();
      return;
    }
    const invalidQuantity = Array.from(active.container.querySelectorAll('input[data-quantity]')).find(
      (input) => input instanceof HTMLInputElement && !this.#validateQuantity(input, true)
    );
    if (invalidQuantity instanceof HTMLInputElement) {
      invalidQuantity.focus();
      return;
    }

    try {
      const orders = this.#readSavedOrders();
      if (orders.some((order) => order.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
        this.#setStatus(this.#message('duplicateName'));
        nameInput.focus();
        return;
      }

      const savedOrder = {
        name,
        items: active.order.items.map((entry, index) => {
          const loaded = active.loaded[index];
          const product = loaded?.product;
          let variantId = entry.variantId;
          if (product?.variants.length === 1) {
            const [onlyVariant] = product.variants;
            if (onlyVariant?.available && !product.requiresSellingPlan && !product.hasSellingPlans) {
              variantId = onlyVariant.id;
            }
          }
          return {
            handle: entry.handle,
            ...(variantId ? { variantId } : {}),
            quantity: entry.quantity,
          };
        }),
      };

      this.#writeSavedOrders([...orders, savedOrder]);
      this.#closeEditor(true);
      this.#renderSavedOrders();
      this.#setStatus(this.#message('sampleSaved'));
    } catch (error) {
      this.#showStorageError(error);
    }
  }

  /** @param {HTMLButtonElement} button */
  #saveName(button) {
    const originalName = button.dataset.savedName;
    const input = button.closest('.saved-orders__card, .saved-orders__editor')?.querySelector('input[data-rename], input[data-new-name]');
    if (!originalName || !(input instanceof HTMLInputElement)) return;

    const name = input.value.trim();
    if (!this.#isValidName(name)) {
      this.#setStatus(this.#message('nameError'));
      input.focus();
      return;
    }

    try {
      const orders = this.#readSavedOrders();
      if (
        orders.some(
          (order) => order.name !== originalName && order.name.toLocaleLowerCase() === name.toLocaleLowerCase()
        )
      ) {
        this.#setStatus(this.#message('duplicateName'));
        input.focus();
        return;
      }

      this.#writeSavedOrders(orders.map((order) => (order.name === originalName ? { ...order, name } : order)));
      this.#renderSavedOrders();
      this.#setStatus(this.#message('nameSaved'));
      if (this.#activeEditor?.kind === 'saved' && this.#activeEditor.order.name === originalName) {
        this.#activeEditor.order.name = name;
        this.#closeEditor();
      }
      this.#focusSavedOrder(name);
    } catch (error) {
      this.#showStorageError(error);
    }
  }

  /** @param {HTMLButtonElement} button */
  async #removeList(button) {
    const name = button.dataset.savedName;
    if (!name) return;
    try {
      this.#writeSavedOrders(this.#readSavedOrders().filter((order) => order.name !== name));
      if (this.#activeEditor?.kind === 'saved' && this.#activeEditor.order.name === name) this.#closeEditor();
      this.#renderSavedOrders();
      this.#setStatus(this.#message('listRemoved'));
      const firstOrderButton = this.refs.savedList.querySelector('button[data-action="open-saved"]');
      if (firstOrderButton instanceof HTMLButtonElement) firstOrderButton.focus();
      else this.refs.savedOrdersHeading.focus();
    } catch (error) {
      this.#showStorageError(error);
    }
  }

  /** @param {HTMLButtonElement} button */
  #removeItem(button) {
    const active = this.#activeEditor;
    const index = Number(button.dataset.itemIndex);
    if (!active || !Number.isInteger(index) || index < 0 || index >= active.order.items.length) return;
    active.order.items.splice(index, 1);
    active.loaded.splice(index, 1);

    if (active.kind === 'saved') {
      try {
        this.#writeSavedOrders(
          this.#readSavedOrders().map((order) =>
            order.name === active.order.name ? { ...order, items: active.order.items } : order
          )
        );
        this.#updateSavedSummary(active);
      } catch (error) {
        this.#showStorageError(error);
        return;
      }
    }
    this.#renderEditor();
    active.container.querySelector('h3')?.focus();
    this.#setStatus(this.#message('itemRemoved'));
  }

  /** @param {HTMLInputElement} input */
  #updateQuantity(input) {
    const active = this.#activeEditor;
    const index = Number(input.dataset.itemIndex);
    if (!active || !Number.isInteger(index) || !active.order.items[index]) return;

    if (!this.#validateQuantity(input, true)) return;
    active.order.items[index].quantity = Number(input.value);
    if (active.kind === 'saved') this.#persistActiveOrder();
  }

  /** @param {HTMLInputElement} input @param {boolean} announce @returns {boolean} */
  #validateQuantity(input, announce) {
    const value = Number(input.value);
    const active = this.#activeEditor;
    const index = Number(input.dataset.itemIndex);
    const entry = active?.order.items[index];
    const variant = entry && active?.loaded[index]?.product?.variants.find((candidate) => candidate.id === entry.variantId);
    const rule = variant && entry ? this.#quantityRules.get(`${entry.handle}:${variant.id}`) : undefined;
    const minimum = rule?.minimum ?? 1;
    const maximum = rule?.maximum ?? null;
    const increment = rule?.increment ?? 1;
    const valid =
      input.value.trim() !== '' &&
      Number.isSafeInteger(value) &&
      value >= minimum &&
      (maximum === null || value <= maximum) &&
      (value - minimum) % increment === 0;
    input.setAttribute('aria-invalid', String(!valid));
    const error = input.parentElement?.querySelector('.saved-orders__error');
    if (error instanceof HTMLElement) {
      error.textContent = valid
        ? ''
        : this.#message('quantityError', {
            minimum: String(minimum),
            maximum: maximum === null ? '' : ` and at most ${maximum}`,
            increment: String(increment),
          });
    }
    if (!valid && announce) {
      this.#setStatus(
        this.#message('quantityError', {
          minimum: String(minimum),
          maximum: maximum === null ? '' : ` and at most ${maximum}`,
          increment: String(increment),
        })
      );
    }
    return valid;
  }

  /** @param {HTMLSelectElement} select */
  #updateVariant(select) {
    const active = this.#activeEditor;
    const index = Number(select.dataset.itemIndex);
    if (!active || !Number.isInteger(index) || !active.order.items[index]) return;
    const selected = select.value;
    if (selected && !VARIANT_ID_PATTERN.test(selected)) return;
    const selectedVariant = active.loaded[index]?.product?.variants.find((variant) => variant.id === selected);
    if (selected && (!selectedVariant || !selectedVariant.available)) return;

    const entry = active.order.items[index];
    if (selected) entry.variantId = selected;
    else delete entry.variantId;
    this.#renderEditor();
    const updatedSelect = active.container.querySelector(
      `[data-variant][data-item-index="${index}"]`
    );
    if (updatedSelect instanceof HTMLSelectElement) updatedSelect.focus();
    if (active.kind === 'saved') this.#persistActiveOrder();
  }

  #persistActiveOrder() {
    const active = this.#activeEditor;
    if (!active || active.kind !== 'saved') return;
    try {
      this.#writeSavedOrders(
        this.#readSavedOrders().map((order) =>
          order.name === active.order.name ? { ...order, items: active.order.items } : order
        )
      );
      this.#updateSavedSummary(active);
    } catch (error) {
      this.#showStorageError(error);
    }
  }

  /**
   * Single-variant, one-time products can be restored without storing historical variant data.
   * @param {SavedOrder} order
   * @param {LoadedItem[]} loaded
   */
  #applySingleVariantDefaults(order, loaded) {
    order.items.forEach((entry, index) => {
      const product = loaded[index]?.product;
      const [variant] = product?.variants ?? [];
      if (
        product?.variants.length === 1 &&
        variant?.available &&
        !product.requiresSellingPlan &&
        !product.hasSellingPlans
      ) {
        entry.variantId = variant.id;
      }
    });
  }

  /** @param {ActiveEditor} active */
  #updateSavedSummary(active) {
    const summary = active.container.closest('.saved-orders__card')?.querySelector('[data-saved-summary]');
    if (summary instanceof HTMLElement) {
      summary.textContent = this.#message('itemsLabel', {
        items: active.order.items.map((entry) => `${entry.handle} × ${entry.quantity}`).join(', '),
      });
    }
  }

  #startProductLookup() {
    this.#productLookupController?.abort();
    this.#productLookupController = new AbortController();
    return this.#productLookupController;
  }

  #readQuantityRules() {
    const serializedRules = this.dataset.quantityRules;
    if (!serializedRules) return;
    try {
      const rules = JSON.parse(serializedRules);
      if (!Array.isArray(rules)) throw new Error('Quantity rules are not a list.');
      this.#quantityRules.clear();
      for (const rule of rules) {
        if (
          typeof rule?.handle !== 'string' ||
          typeof rule?.variantId !== 'string' ||
          !Number.isInteger(rule.minimum) ||
          rule.minimum < 1 ||
          !Number.isInteger(rule.increment) ||
          rule.increment < 1 ||
          (rule.maximum !== null && (!Number.isInteger(rule.maximum) || rule.maximum < rule.minimum))
        ) {
          throw new Error('A product quantity rule is invalid.');
        }
        this.#quantityRules.set(`${rule.handle}:${rule.variantId}`, {
          minimum: rule.minimum,
          maximum: rule.maximum,
          increment: rule.increment,
        });
      }
    } catch (error) {
      this.#quantityRulesInvalid = true;
      console.error('[saved-orders] Product quantity rules could not be read:', error);
      this.#setStatus(this.#message('quantityRuleError'));
    }
  }

  async #addToCart(button) {
    const active = this.#activeEditor;
    if (!active || active.kind !== 'saved' || this.#submittingCart) return;
    if (this.#quantityRulesInvalid) {
      this.#setStatus(this.#message('quantityRuleError'));
      return;
    }

    const invalidQuantity = Array.from(active.container.querySelectorAll('input[data-quantity]')).find(
      (input) => input instanceof HTMLInputElement && !this.#validateQuantity(input, true)
    );
    if (invalidQuantity instanceof HTMLInputElement) {
      invalidQuantity.focus();
      return;
    }

    this.#submittingCart = true;
    button.disabled = true;
    this.#setStatus(this.#message('loading'));

    const lookupController = this.#startProductLookup();
    const refreshed = await this.#loadItems(active.order.items, lookupController.signal);
    if (!this.isConnected || this.#activeEditor !== active) {
      this.#submittingCart = false;
      return;
    }

    const changed = refreshed.some(
      (entry, index) => JSON.stringify(active.loaded[index]) !== JSON.stringify(entry)
    );
    active.loaded = refreshed;
    if (changed) {
      this.#submittingCart = false;
      this.#renderEditor();
      active.container.querySelector('h3')?.focus();
      this.#setStatus(this.#message('priceChanged'));
      return;
    }

    const eligible = [];
    const ineligible = [];
    active.order.items.forEach((entry, index) => {
      const product = refreshed[index]?.product;
      const variant = product?.variants.find((candidate) => candidate.id === entry.variantId);
      if (!product || !variant || !variant.available || product.requiresSellingPlan || product.hasSellingPlans) {
        ineligible.push(entry.handle);
        return;
      }
      eligible.push({ variantId: variant.id, quantity: entry.quantity, handle: entry.handle });
    });

    if (eligible.length === 0) {
      this.#submittingCart = false;
      this.#renderEditor();
      active.container.querySelector('h3')?.focus();
      this.#setStatus(
        ineligible.length
          ? this.#message('cartNone', { items: ineligible.join(', ') })
          : this.#message('cartNone', { items: '' })
      );
      return;
    }

    try {
      const result = await this.#submitCartItems(eligible);
      const failures = [...ineligible, ...result.failures];
      const addedNames = result.successes.join(', ');
      this.#setStatus(
        failures.length
          ? this.#message('cartPartial', { added: addedNames || this.#message('cartNone', { items: '' }), failed: failures.join(', ') })
          : this.#message('cartSuccess', { items: addedNames })
      );
      this.#submittingCart = false;
      this.#renderEditor();
      active.container.querySelector('h3')?.focus();
    } catch (error) {
      console.error('[saved-orders] Cart refresh failed after add-to-cart attempt:', error);
      this.#setStatus(this.#message('cartRefreshError'));
      this.#submittingCart = false;
      this.#renderEditor();
    }
  }

  /**
   * Adds eligible variants one at a time so failures are reported without blocking successful lines.
   * @param {{variantId: string, quantity: number, handle: string}[]} items
   * @returns {Promise<{successes: string[], failures: string[]}>}
   */
  async #submitCartItems(items) {
    const addUrl = Theme?.routes?.cart_add_url;
    if (!addUrl) throw new Error('The theme cart add route is unavailable.');

    const sectionIds = [];
    for (const component of document.querySelectorAll('cart-items-component')) {
      if (component instanceof HTMLElement && component.dataset.sectionId) {
        sectionIds.push(component.dataset.sectionId);
      }
    }

    const deferred = CartLinesUpdateEvent.createPromise();
    this.dispatchEvent(
      new CartLinesUpdateEvent({
        action: 'add',
        context: 'product',
        lines: items.map((item) => ({ merchandiseId: item.variantId, quantity: item.quantity })),
        promise: deferred.promise,
      })
    );

    /** @type {string[]} */
    const successes = [];
    /** @type {string[]} */
    const failures = [];
    /** @type {Record<string, string> | undefined} */
    let sections;

    for (const item of items) {
      try {
        const response = await fetch(addUrl, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            items: [{ id: Number(item.variantId), quantity: item.quantity }],
            sections: sectionIds.join(','),
            sections_url: `${window.location.pathname}${window.location.search}`,
          }),
        });
        const data = await response.json();
        if (!response.ok || data.status) {
          const message = typeof data.description === 'string' ? data.description : data.message || `HTTP ${response.status}`;
          failures.push(`${item.handle}: ${message}`);
          this.dispatchEvent(new CartErrorEvent({ error: message, code: 'INVALID' }));
          continue;
        }
        successes.push(item.handle);
        if (data.sections) sections = data.sections;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Network error';
        failures.push(`${item.handle}: ${message}`);
      }
    }

    if (successes.length === 0) {
      deferred.reject(new Error(failures.join('; ') || 'No items could be added.'));
      return { successes, failures };
    }

    try {
      const cartUrl = Theme?.routes?.cart_url;
      if (!cartUrl) throw new Error('The theme cart route is unavailable.');
      const cartResponse = await fetch(`${cartUrl}.js`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!cartResponse.ok) throw new Error(`Cart refresh failed with HTTP ${cartResponse.status}.`);
      const cart = await cartResponse.json();
      deferred.resolve({
        cart: CartLinesUpdateEvent.createCartFromAjaxResponse(cart),
        detail: {
          items: cart.items,
          sections,
          didError: false,
          source: 'saved-orders',
        },
      });
    } catch (error) {
      deferred.reject(error);
      throw error;
    }

    return { successes, failures };
  }

  /** @returns {SavedOrder[]} */
  #readSavedOrders() {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === null ? [] : parseSavedOrders(JSON.parse(value));
  }

  /** @param {SavedOrder[]} orders */
  #writeSavedOrders(orders) {
    const validated = parseSavedOrders(orders);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
  }

  /** @param {string} name */
  #isValidName(name) {
    return name.length > 0 && name.length <= 80;
  }

  /** @param {string} name */
  #safeId(name) {
    return Array.from(name, (character) => character.codePointAt(0).toString(16)).join('-');
  }

  /** @param {string} name */
  #focusSavedOrder(name) {
    const button = Array.from(this.refs.savedList.querySelectorAll('button[data-action="open-saved"]')).find(
      (candidate) => candidate.dataset.savedName === name
    );
    if (button instanceof HTMLButtonElement) button.focus();
  }

  /** @param {ActiveEditor} active @param {number} index @param {string} suffix */
  #fieldId(active, index, suffix) {
    return `saved-orders-${this.#safeId(active.order.name)}-${index}-${suffix}`;
  }

  /** @param {string} key @param {Record<string, string>} [values] */
  #message(key, values = {}) {
    const message = this.dataset[key];
    if (typeof message !== 'string') throw new Error(`Saved orders is missing the "${key}" translation.`);
    return message.replace(/__([a-z]+)__/g, (_match, name) => values[name] ?? '');
  }

  /** @param {string} date */
  #formatSampleDate(date) {
    const parsedDate = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsedDate.getTime())) throw new Error(`Invalid sample date "${date}".`);
    return new Intl.DateTimeFormat(this.dataset.locale || undefined, {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(parsedDate);
  }

  /** @param {number} price */
  #formatPrice(price) {
    const currency = this.dataset.currency;
    if (!currency) return (price / 100).toFixed(2);
    return new Intl.NumberFormat(this.dataset.locale || undefined, {
      style: 'currency',
      currency,
    }).format(price / 100);
  }

  /** @param {string} key @param {string} action @param {boolean} [secondary] */
  #button(key, action, secondary = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = secondary ? 'button button-secondary' : 'button';
    button.dataset.action = action;
    button.textContent = this.#message(key);
    return button;
  }

  /** @param {string} message */
  #setStatus(message) {
    this.refs.savedOrdersStatus.textContent = message;
  }

  /** @param {unknown} error */
  #showStorageError(error) {
    if (error instanceof Error) console.warn('[saved-orders] Browser storage could not be used:', error);
    this.#setStatus(this.#message('storageError'));
  }
}

if (!customElements.get('saved-orders-component')) {
  customElements.define('saved-orders-component', SavedOrders);
}
