/** @type {Record<string, Record<string, string>>} */
const transitions = {
  awaiting: { request: 'needs', approve: 'approved', decline: 'declined' },
  needs: { return: 'awaiting', approve: 'approved', decline: 'declined' },
  approved: { revoke: 'revoked' },
  declined: { reopen: 'awaiting' },
  revoked: { reopen: 'awaiting' },
};

const decisions = new Set(['approve', 'decline', 'revoke']);

class WholesaleReviewPreview extends HTMLElement {
  /** @type {Record<string, string>} */
  text = {};
  /** @type {ReturnType<WholesaleReviewPreview['sample']>[]} */
  samples = [];
  selected = this.sample('', '', 'awaiting', 'unavailable');
  /** @type {string | null} */
  pendingAction = null;

  get application() { return this.requireElement('[data-application]', HTMLSelectElement); }
  get action() { return this.requireElement('[data-action]', HTMLSelectElement); }
  get form() { return this.requireElement('[data-action-form]', HTMLFormElement); }
  get reason() { return this.requireElement('[data-reason]', HTMLTextAreaElement); }
  get notes() { return this.requireElement('[data-notes]', HTMLTextAreaElement); }
  get message() { return this.requireElement('[data-message]', HTMLTextAreaElement); }
  get confirmation() { return this.requireElement('[data-confirmation]', HTMLElement); }
  get status() { return this.requireElement('[data-status]', HTMLElement); }

  connectedCallback() {
    if (this.initialized) return;
    this.initialized = true;
    const translations = this.querySelector('[data-review-translations]');
    if (!translations) return;
    this.text = JSON.parse(translations.textContent || '{}');
    this.samples = [
      this.sample('SAMPLE-001', 'Example Floral One', 'awaiting', 'unavailable'),
      this.sample('SAMPLE-002', 'Example Floral Two', 'needs', 'unavailable'),
      this.sample('SAMPLE-003', 'Example Floral Three', 'approved', 'pending'),
      this.sample('SAMPLE-004', 'Example Floral Four', 'declined', 'unavailable'),
      this.sample('SAMPLE-005', 'Example Floral Five', 'revoked', 'revocation'),
    ];
    this.selected = this.samples[0] ?? this.selected;
    this.pendingAction = null;
    for (const sample of this.samples) {
      this.application.add(new Option(`${sample.id} — ${sample.business}`, sample.id));
    }
    this.application.addEventListener('change', () => {
      const sample = this.samples.find((item) => item.id === this.application.value);
      if (!sample) return;
      this.selected = sample;
      this.status.textContent = '';
      this.render();
    });
    this.notes.addEventListener('input', () => { this.selected.notes = this.notes.value; });
    this.message.addEventListener('input', () => {
      this.selected.message = this.message.value;
      this.message.setCustomValidity('');
    });
    this.reason.addEventListener('input', () => this.reason.setCustomValidity(''));
    this.action.addEventListener('change', () => this.updateReason());
    this.form.addEventListener('submit', (event) => this.startAction(event));
    this.requireElement('[data-confirm]', HTMLButtonElement).addEventListener('click', () => this.confirmAction());
    this.requireElement('[data-cancel]', HTMLButtonElement).addEventListener('click', () => this.cancelAction());
    this.requireElement('[data-review-ui]', HTMLElement).hidden = false;
    this.render();
  }

  /**
   * @template {HTMLElement} T
   * @param {string} selector
   * @param {{new (...args: never[]): T}} type
   * @returns {T}
   */
  requireElement(selector, type) {
    const element = this.querySelector(selector);
    if (!(element instanceof type)) throw new Error(`Missing review preview element: ${selector}`);
    return element;
  }

  /** @param {string} id @param {string} business @param {string} state @param {string} access */
  sample(id, business, state, access) {
    const history = [{ date: '2000-01-01 09:00', description: this.text.sample_created }];
    if (state !== 'awaiting') {
      history.push({ date: '2000-01-02 09:00', description: `${this.text.sample_transition}: ${this.text[state]}` });
    }
    return { id, business, state, access, notes: '', message: '', history };
  }

  /** @param {string} selector @param {string} value */
  write(selector, value) {
    this.requireElement(selector, HTMLElement).textContent = value;
  }

  render() {
    const sample = this.selected;
    this.application.value = sample.id;
    this.write('[data-business]', sample.business);
    this.write('[data-business-id]', sample.id);
    this.write('[data-state]', this.text[sample.state] ?? sample.state);
    /** @type {Record<string, string>} */
    const accessLabels = { unavailable: 'not_available', pending: 'access_pending', revocation: 'enforcement_pending', both: 'access_pending_revocation' };
    this.write('[data-access]', this.text[accessLabels[sample.access] ?? 'not_available'] ?? sample.access);
    this.write('[data-business-details]', `${sample.business}\nSample Contact · contact@example.invalid · 555-0101\n100 Example Way, Sample City, ZZ 00000\nProducts sold: sample arrangements · Interest: flowers\nBusiness type: florist · Location: retail · Purchased before: not provided`);
    this.write('[data-permit]', 'Permit number: not provided · Issuing region: not provided');
    this.write('[data-buyers-owner]', 'Authorized buyer: Sample Buyer\nOrganization: sole proprietor · Sample Owner\nOwner home contact: not provided');
    this.write('[data-documents]', 'Identification: not provided · Resale certificate: not provided\nApplicant name/title/date: not provided');
    this.notes.value = sample.notes;
    this.message.value = sample.message;
    this.message.setCustomValidity('');
    this.action.replaceChildren();
    for (const key of Object.keys(transitions[sample.state] ?? {})) {
      this.action.add(new Option(this.text[key], key));
    }
    this.reason.value = '';
    this.reason.setCustomValidity('');
    this.updateReason();
    const history = this.requireElement('[data-history]', HTMLOListElement);
    history.replaceChildren();
    for (const entry of sample.history) {
      const item = document.createElement('li');
      item.textContent = `${entry.date} — ${this.text.sample_reviewer} — ${entry.description}`;
      history.append(item);
    }
  }

  updateReason() {
    const required = decisions.has(this.action.value);
    this.requireElement('[data-reason-wrap]', HTMLElement).hidden = !required;
    this.reason.required = required;
    this.reason.setCustomValidity('');
  }

  /** @param {Event} event */
  startAction(event) {
    event.preventDefault();
    const action = this.action.value;
    if (!transitions[this.selected.state]?.[action]) return;
    if (decisions.has(action) && !this.reason.value.trim()) {
      this.reason.setCustomValidity(this.text.reason_required ?? 'Enter a decision reason.');
      this.reason.reportValidity();
      return;
    }
    if (action === 'request' && !this.message.value.trim()) {
      this.message.setCustomValidity(this.text.message_required ?? 'Describe the information requested.');
      this.message.reportValidity();
      return;
    }
    if (!decisions.has(action)) {
      this.applyAction(action);
      return;
    }
    this.pendingAction = action;
    this.write('[data-confirm-description]', `${this.text.confirm_prompt}: ${this.selected.business} — ${this.text[action]}. ${this.text.reason_label}: ${this.reason.value.trim()}`);
    this.form.hidden = true;
    this.application.disabled = true;
    this.confirmation.hidden = false;
    this.requireElement('[data-confirm-title]', HTMLElement).focus();
  }

  confirmAction() {
    const action = this.pendingAction;
    if (!action || !transitions[this.selected.state]?.[action]) return;
    this.pendingAction = null;
    this.confirmation.hidden = true;
    this.form.hidden = false;
    this.application.disabled = false;
    this.applyAction(action);
    this.action.focus();
  }

  cancelAction() {
    this.pendingAction = null;
    this.confirmation.hidden = true;
    this.form.hidden = false;
    this.application.disabled = false;
    this.action.focus();
  }

  /** @param {string} action */
  applyAction(action) {
    const sample = this.selected;
    const next = transitions[sample.state]?.[action];
    if (!next) return;
    const previous = sample.state;
    const reason = decisions.has(action) ? this.reason.value.trim() : action === 'request' ? this.message.value.trim() : '';
    if (action === 'approve') sample.access = ['revocation', 'both'].includes(sample.access) ? 'both' : 'pending';
    if (action === 'revoke') sample.access = 'revocation';
    if (action === 'decline') sample.access = ['revocation', 'both'].includes(sample.access) ? 'revocation' : 'unavailable';
    sample.state = next;
    sample.history.push({
      date: new Date().toLocaleString(),
      description: `${this.text[action]}: ${this.text[previous]} → ${this.text[next]}${reason ? ` — ${reason}` : ''}`,
    });
    this.render();
    this.status.textContent = this.text.updated ?? '';
  }
}

if (!customElements.get('wholesale-review-preview')) {
  customElements.define('wholesale-review-preview', WholesaleReviewPreview);
}
