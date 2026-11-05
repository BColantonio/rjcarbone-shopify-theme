import { Component } from '@theme/component';

/**
 * Provides local-only validation and a review summary for the wholesale application preview.
 */
class WholesaleApplicationPreview extends Component {
  constructor() {
    super();
    this.requiredRefs = ['applicationFields', 'navigation', 'progress', 'status', 'review', 'summary'];
  }

  connectedCallback() {
    super.connectedCallback();
    this.currentStep ??= 1;

    for (const fieldset of this.querySelectorAll('fieldset[data-conditional-fields]')) {
      if (fieldset instanceof HTMLFieldSetElement) this.setConditionalFields(fieldset);
    }

    this.updateAddressFields();
    this.refs.navigation.hidden = false;
    this.showStep(this.currentStep, false);
  }

  clearPreview() {
    this.clearStatus();
    for (const control of this.querySelectorAll('[aria-invalid="true"]')) {
      if (this.isFormControl(control)) this.validateControl(control);
    }
  }

  clearStatus() {
    const status = this.refs.status;
    if (!(status instanceof HTMLElement)) {
      throw new Error('Wholesale application preview is missing its status element.');
    }

    status.textContent = '';
  }

  /** @param {Element} element */
  isFormControl(element) {
    return (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    );
  }

  isUnitedStates() {
    const country = this.querySelector('[name="country"]');
    if (!(country instanceof HTMLSelectElement)) return false;

    return country.value === 'US';
  }

  updateAddressFields() {
    const isUnitedStates = this.isUnitedStates();
    for (const group of this.querySelectorAll('[data-us-region-group]')) {
      for (const field of group.querySelectorAll('[data-us-region], [data-international-region]')) {
        if (!(field instanceof HTMLElement)) continue;

        const isUsField = field.hasAttribute('data-us-region');
        field.hidden = isUsField !== isUnitedStates;
        const control = field.querySelector('input, select');
        if (this.isFormControl(control)) control.disabled = isUsField !== isUnitedStates;
      }
    }

    for (const control of this.querySelectorAll('[aria-invalid="true"]')) {
      if (this.isFormControl(control)) this.validateControl(control);
    }
  }

  /** @param {Event} event */
  updateCountryFields(event) {
    if (event.target instanceof HTMLSelectElement && event.target.name === 'country') {
      this.clearStatus();
      this.updateAddressFields();
    }
  }

  /** @param {Element} control */
  getValidationMessage(control) {
    if (!this.isFormControl(control) || control.disabled) return '';

    const rawValue = control.value;
    const value = rawValue.trim();
    if (control.required && !value) return this.dataset.requiredError ?? '';
    if (!value) return '';

    const validationType = control.dataset.validationType;
    if (validationType === 'email' && !this.isValidEmail(rawValue)) {
      return this.dataset.emailError ?? '';
    }

    if (validationType === 'us-phone' && this.isUnitedStates() && !this.isValidUsPhone(value)) {
      return this.dataset.phoneError ?? '';
    }

    if (validationType === 'us-postal' && this.isUnitedStates() && !/^\d{5}(?:-\d{4})?$/.test(value)) {
      return this.dataset.postalError ?? '';
    }

    if (validationType === 'us-state') {
      const state = control instanceof HTMLSelectElement
        ? Array.from(control.options).find((option) => option.value === value)
        : null;
      if (!state) return this.dataset.stateError ?? '';
    }

    if (validationType === 'personal-name' && !this.isValidPersonalName(value)) {
      return this.dataset.nameError ?? '';
    }

    if (validationType === 'personal-name-lines') {
      const names = value.split(/\r?\n/).map((name) => name.trim()).filter(Boolean);
      if (names.some((name) => !this.isValidPersonalName(name))) {
        return this.dataset.buyerNamesError ?? '';
      }
    }

    if (
      ['city', 'international-region'].includes(validationType ?? '') &&
      /^[\p{N}\s\p{P}]*\p{N}[\p{N}\s\p{P}]*$/u.test(value)
    ) {
      return this.dataset.numberNameError ?? '';
    }

    return '';
  }

  /** @param {string} value */
  isValidEmail(value) {
    if (/\s/u.test(value)) return false;

    const separator = value.indexOf('@');
    if (separator <= 0 || separator !== value.lastIndexOf('@') || separator === value.length - 1) {
      return false;
    }

    const localPart = value.slice(0, separator);
    const domain = value.slice(separator + 1);
    const localAtom = "[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+";
    if (
      localPart.length > 64 ||
      !new RegExp(`^${localAtom}(?:\\.${localAtom})*$`).test(localPart) ||
      domain.length > 253
    ) {
      return false;
    }

    const labels = domain.split('.');
    const validLabel = /^[\p{L}\p{N}](?:[\p{L}\p{M}\p{N}-]{0,61}[\p{L}\p{N}])?$/u;
    const topLevelDomain = labels[labels.length - 1] ?? '';
    return (
      labels.length > 1 &&
      labels.every((label) => label.length <= 63 && validLabel.test(label)) &&
      topLevelDomain.length >= 2 &&
      /\p{L}/u.test(topLevelDomain)
    );
  }

  /** @param {FocusEvent} event */
  validateField(event) {
    const control = event.target;
    if (!this.isFormControl(control)) return;

    this.validateControl(control);
    this.clearStatus();
  }

  /** @param {string} value */
  isValidPersonalName(value) {
    const normalized = value.trim().replace(/\s+/g, ' ');
    return (
      /\p{L}/u.test(normalized) &&
      !/\p{N}/u.test(normalized) &&
      /^[\p{L}\p{M}\p{P}\s]+$/u.test(normalized)
    );
  }

  getTodayDate() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
  }

  refreshAcknowledgmentDate() {
    const date = this.querySelector('[name="signature_date"]');
    if (!(date instanceof HTMLOutputElement)) {
      throw new Error('Wholesale application preview is missing its acknowledgment date display.');
    }

    date.value = this.getTodayDate();
  }

  /** @param {string} value */
  isValidUsPhone(value) {
    if (!/^\+?[\d\s().-]+$/.test(value)) return false;
    const digits = value.replace(/\D/g, '');
    return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
  }

  /** @param {Element} control */
  validateControl(control) {
    if (!this.isFormControl(control)) return '';

    const message = this.getValidationMessage(control);
    const field = control.closest('.wholesale-application__field, fieldset');
    if (!(field instanceof HTMLElement)) {
      if (message) {
        throw new Error(`Wholesale application field "${control.getAttribute('name') ?? ''}" is missing its field wrapper.`);
      }
      return '';
    }

    let error = field.querySelector(`[data-validation-error-for="${CSS.escape(control.id)}"]`);
    if (!(error instanceof HTMLElement)) {
      error = document.createElement('p');
      error.className = 'wholesale-application__field-error';
      error.id = `${control.id}-error`;
      error.dataset.validationErrorFor = control.id;
      error.setAttribute('role', 'alert');
      field.append(error);
    }

    if (message) {
      error.textContent = message;
      error.hidden = false;
      control.setAttribute('aria-invalid', 'true');
      const describedBy = new Set((control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean));
      describedBy.add(error.id);
      control.setAttribute('aria-describedby', Array.from(describedBy).join(' '));
    } else {
      error.textContent = '';
      error.hidden = true;
      control.removeAttribute('aria-invalid');
      const describedBy = (control.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .filter((id) => id && id !== error.id);
      if (describedBy.length) {
        control.setAttribute('aria-describedby', describedBy.join(' '));
      } else {
        control.removeAttribute('aria-describedby');
      }
    }

    return message;
  }

  /** @param {Event} event */
  formatPhone(event) {
    const control = event.target;
    if (!(control instanceof HTMLInputElement) || control.dataset.validationType !== 'us-phone') return;

    const value = control.value.trim();
    if (!value || !this.isUnitedStates()) {
      this.validateControl(control);
      return;
    }

    if (this.isValidUsPhone(value)) {
      const digits = value.replace(/\D/g, '').slice(-10);
      control.value = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} - ${digits.slice(6)}`;
    }

    this.validateControl(control);
    this.clearStatus();
  }

  /** @param {HTMLElement} panel */
  validatePanel(panel) {
    const controls = Array.from(panel.querySelectorAll('input, textarea, select')).filter(
      (control) => this.isFormControl(control) && !control.disabled
    );
    const invalidControls = [];
    for (const control of controls) {
      if (this.isFormControl(control) && this.validateControl(control)) invalidControls.push(control);
    }

    if (invalidControls.length > 0) {
      invalidControls[0].focus();
      return invalidControls;
    }

    return [];
  }

  /** @param {HTMLFieldSetElement} fieldset */
  setConditionalFields(fieldset) {
    const selectedValues = new Set(
      Array.from(fieldset.querySelectorAll('input:checked'), (input) =>
        input instanceof HTMLInputElement ? input.value : ''
      )
    );

    for (const group of fieldset.querySelectorAll('[data-conditional-value]')) {
      if (!(group instanceof HTMLElement)) continue;

      const active = selectedValues.has(group.dataset.conditionalValue ?? '');
      group.hidden = !active;
      for (const control of group.querySelectorAll('input, textarea, select')) {
        if (
          control instanceof HTMLInputElement ||
          control instanceof HTMLTextAreaElement ||
          control instanceof HTMLSelectElement
        ) {
          control.disabled = !active;
        }
      }
    }
  }

  /** @param {Event} event */
  updateConditionalFields(event) {
    const target = event.target;
    const fieldset = target instanceof Element ? target.closest('fieldset[data-conditional-fields]') : null;
    if (!(fieldset instanceof HTMLFieldSetElement)) return;

    this.setConditionalFields(fieldset);
  }

  showStep(step, focusHeading) {
    const panels = this.querySelectorAll('[data-step-panel]');
    const panel = this.querySelector(`[data-step-panel="${step}"]`);
    const backButton = this.querySelector('[data-step-back]');
    const continueButton = this.querySelector('[data-step-continue]');
    const progress = this.refs.progress;

    if (
      !(panel instanceof HTMLElement) ||
      !(backButton instanceof HTMLButtonElement) ||
      !(continueButton instanceof HTMLButtonElement) ||
      !(progress instanceof HTMLElement)
    ) {
      throw new Error('Wholesale application preview is missing its step navigation elements.');
    }

    for (const stepPanel of panels) {
      if (stepPanel instanceof HTMLElement) stepPanel.hidden = stepPanel !== panel;
    }

    this.currentStep = step;
    if (step === 4) this.refreshAcknowledgmentDate();
    backButton.hidden = step === 1;
    continueButton.hidden = step === 5;
    progress.textContent = `${this.dataset.stepLabel} ${step} ${this.dataset.stepOf} 5`;

    if (focusHeading) {
      const heading = panel.querySelector('[data-step-heading]');
      if (!(heading instanceof HTMLElement)) {
        throw new Error(`Wholesale application step ${step} is missing its heading.`);
      }
      heading.focus();
    }
  }

  validateCurrentStep() {
    const panel = this.querySelector(`[data-step-panel="${this.currentStep}"]`);
    const status = this.refs.status;

    if (!(panel instanceof HTMLElement) || !(status instanceof HTMLElement)) {
      throw new Error('Wholesale application preview is missing the current step or status element.');
    }

    const invalidControls = this.validatePanel(panel);
    if (invalidControls.length > 0) {
      status.textContent = this.dataset.validationError ?? '';
      return false;
    }

    status.textContent = '';
    return true;
  }

  /** @param {KeyboardEvent} event */
  handleKeydown(event) {
    const target = event.composedPath()[0];
    if (
      event.key !== 'Enter' ||
      !(target instanceof HTMLInputElement) ||
      ['button', 'checkbox', 'file', 'image', 'radio', 'reset', 'submit'].includes(target.type)
    ) {
      return;
    }

    event.preventDefault();
    this.goForward();
  }

  goBack() {
    if (this.currentStep <= 1) return;
    this.showStep(this.currentStep - 1, true);
  }

  goForward() {
    if (this.currentStep >= 5 || !this.validateCurrentStep()) return;

    const nextStep = this.currentStep + 1;
    if (nextStep === 5) {
      for (let step = 1; step <= 4; step += 1) {
        const panel = this.querySelector(`[data-step-panel="${step}"]`);
        if (!(panel instanceof HTMLElement)) {
          throw new Error(`Wholesale application step ${step} is missing.`);
        }

        const invalidControls = this.validatePanel(panel);
        if (invalidControls.length > 0) {
          this.showStep(step, true);
          invalidControls[0].focus();
          const status = this.refs.status;
          if (status instanceof HTMLElement) status.textContent = this.dataset.validationError ?? '';
          return;
        }
      }

      this.refreshAcknowledgmentDate();
      this.renderSummary();
      const status = this.refs.status;
      if (!(status instanceof HTMLElement)) {
        throw new Error('Wholesale application preview is missing its status element.');
      }
      status.textContent = this.dataset.previewSuccess ?? '';
    }

    this.showStep(nextStep, true);
  }

  /** @param {Event} event */
  editStep(event) {
    const target = event.target;
    const button = target instanceof Element ? target.closest('[data-edit-step]') : null;
    const step = button instanceof HTMLElement ? Number(button.dataset.editStep) : NaN;
    if (!Number.isInteger(step) || step < 1 || step > 4) {
      throw new Error('Wholesale application review has an invalid edit step.');
    }

    this.showStep(step, true);
  }

  renderSummary() {
    const fields = this.refs.applicationFields;
    const summary = this.refs.summary;
    if (!(fields instanceof HTMLElement) || !(summary instanceof HTMLElement)) {
      throw new Error('Wholesale application preview is missing its summary elements.');
    }

    const notProvided = this.dataset.notProvided ?? '';
    const readValue = (name) => {
      if (name === 'signature_date') {
        const date = fields.querySelector('[name="signature_date"]');
        return date instanceof HTMLOutputElement && date.value.trim() ? date.value : notProvided;
      }

      const countryAwareFields = {
        region: 'region_us',
        tax_permit_state: 'tax_permit_state_us',
        owner_home_state: 'owner_home_state_us',
      };
      const fieldName = this.isUnitedStates() && countryAwareFields[name] ? countryAwareFields[name] : name;
      const field = fields.querySelector(`[name="${fieldName}"]`);
      if (!this.isFormControl(field) || !field.value.trim()) return notProvided;

      return field instanceof HTMLSelectElement
        ? field.selectedOptions[0]?.textContent?.trim() ?? notProvided
        : field.value.trim();
    };
    const readSelectedLabels = (name) => {
      const selected = fields.querySelectorAll(`input[name="${name}"]:checked`);
      const labels = Array.from(selected, (input) =>
        input instanceof HTMLInputElement ? input.labels?.[0]?.textContent?.trim() : ''
      ).filter(Boolean);

      return labels.length ? labels.join(', ') : notProvided;
    };
    const otherBusinessTypeSelected =
      fields.querySelector('input[name="business_type"][value="other"]:checked') instanceof HTMLInputElement;
    const selectedStructure = fields.querySelector('input[name="business_structure"]:checked');
    const entriesByStep = [
      [
        ['company', readValue('company')],
        ['first_name', readValue('first_name')],
        ['last_name', readValue('last_name')],
        ['email', readValue('email')],
        ['phone', readValue('phone')],
        ['business_fax', readValue('business_fax')],
        ['address', readValue('address')],
        ['city', readValue('city')],
        ['region', readValue('region')],
        ['postal_code', readValue('postal_code')],
        ['country', readValue('country')],
      ],
      [
        ['products_sold', readValue('products_sold')],
        ['tax_permit_number', readValue('tax_permit_number')],
        ['tax_permit_state', readValue('tax_permit_state')],
        ['business_type', readSelectedLabels('business_type')],
        ...(otherBusinessTypeSelected ? [['business_type_other', readValue('business_type_other')]] : []),
        ['purchased_before', readSelectedLabels('purchased_before')],
        ['department', readSelectedLabels('department')],
        ['location_type', readSelectedLabels('location_type')],
        ['business_structure', readSelectedLabels('business_structure')],
      ],
      [
        ['authorized_buyers', readValue('authorized_buyers')],
        ['owner_name', readValue('owner_name')],
        ['owner_home_address', readValue('owner_home_address')],
        ['owner_home_city', readValue('owner_home_city')],
        ['owner_home_state', readValue('owner_home_state')],
        ['owner_home_zip', readValue('owner_home_zip')],
        ['owner_home_phone', readValue('owner_home_phone')],
      ],
      [
        ['signature_name', readValue('signature_name')],
        ['signature_title', readValue('signature_title')],
        ['signature_date', readValue('signature_date')],
      ],
    ];

    if (selectedStructure instanceof HTMLInputElement) {
      if (selectedStructure.value === 'corporation') {
        entriesByStep[1].push(
          ['president', readValue('president')],
          ['vice_president', readValue('vice_president')],
          ['treasurer', readValue('treasurer')]
        );
      } else if (selectedStructure.value === 'partnership') {
        entriesByStep[1].push(['partner_names', readValue('partner_names')]);
      } else if (selectedStructure.value === 'sole_proprietorship') {
        entriesByStep[1].push(['sole_proprietor', readValue('sole_proprietor')]);
      }
    }

    for (let index = 0; index < entriesByStep.length; index += 1) {
      const list = summary.querySelector(`[data-summary-step="${index + 1}"]`);
      if (!(list instanceof HTMLDListElement)) {
        throw new Error(`Wholesale application review is missing the summary for step ${index + 1}.`);
      }

      list.replaceChildren();
      for (const [name, value] of entriesByStep[index]) {
        const input = fields.querySelector(`[name="${name}"]`);
        const label = input?.getAttribute('data-summary-label');
        if (!label) throw new Error(`Wholesale application preview is missing the "${name}" summary label.`);

        const term = document.createElement('dt');
        term.textContent = label;
        const description = document.createElement('dd');
        description.textContent = value;
        list.append(term, description);
      }
    }
  }
}

if (!customElements.get('wholesale-application-preview-component')) {
  customElements.define('wholesale-application-preview-component', WholesaleApplicationPreview);
}
