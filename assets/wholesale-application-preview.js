import { Component } from '@theme/component';

/**
 * Provides local-only validation and a review summary for the wholesale application preview.
 */
class WholesaleApplicationPreview extends Component {
  constructor() {
    super();
    this.requiredRefs = ['applicationFields', 'status', 'review', 'summary'];
  }

  clearPreview() {
    const review = this.refs.review;
    const summary = this.refs.summary;
    const status = this.refs.status;

    if (!(review instanceof HTMLElement) || !(summary instanceof HTMLElement) || !(status instanceof HTMLElement)) {
      throw new Error('Wholesale application preview is missing required output elements.');
    }

    for (const input of this.querySelectorAll('input[aria-invalid="true"]')) {
      if (input instanceof HTMLInputElement && input.checkValidity()) {
        input.removeAttribute('aria-invalid');
      }
    }

    review.hidden = true;
    summary.replaceChildren();
    status.textContent = '';
  }

  previewApplication() {
    const fields = this.refs.applicationFields;
    const status = this.refs.status;
    const review = this.refs.review;
    const summary = this.refs.summary;

    if (
      !(fields instanceof HTMLElement) ||
      !(status instanceof HTMLElement) ||
      !(review instanceof HTMLElement) ||
      !(summary instanceof HTMLElement)
    ) {
      throw new Error('Wholesale application preview is missing required fields.');
    }

    const inputs = Array.from(fields.querySelectorAll('input'));
    const invalidInputs = inputs.filter((input) => !input.checkValidity());
    for (const input of inputs) {
      if (input.validity.valid) {
        input.removeAttribute('aria-invalid');
      } else {
        input.setAttribute('aria-invalid', 'true');
      }
    }

    if (invalidInputs.length > 0) {
      status.textContent = this.dataset.validationError ?? '';
      invalidInputs[0].reportValidity();
      return;
    }

    const notProvided = this.dataset.notProvided ?? '';
    const readValue = (name) => {
      const input = fields.querySelector(`[name="${name}"]`);
      return input instanceof HTMLInputElement && input.value.trim() ? input.value.trim() : notProvided;
    };
    const readSelectedLabels = (name) => {
      const selected = fields.querySelectorAll(`input[name="${name}"]:checked`);
      const labels = Array.from(selected, (input) =>
        input instanceof HTMLInputElement ? input.labels?.[0]?.textContent?.trim() : ''
      ).filter(Boolean);

      return labels.length ? labels.join(', ') : notProvided;
    };
    const entries = [
      ['company', readValue('company')],
      ['first_name', readValue('first_name')],
      ['last_name', readValue('last_name')],
      ['email', readValue('email')],
      ['phone', readValue('phone')],
      ['address', readValue('address')],
      ['city', readValue('city')],
      ['region', readValue('region')],
      ['postal_code', readValue('postal_code')],
      ['country', readValue('country')],
      ['purchased_before', readSelectedLabels('purchased_before')],
      ['department', readSelectedLabels('department')],
      ['location_type', readSelectedLabels('location_type')],
    ];

    summary.replaceChildren();
    for (const [name, value] of entries) {
      const input = fields.querySelector(`[name="${name}"]`);
      const label = input?.getAttribute('data-summary-label');
      if (!label) throw new Error(`Wholesale application preview is missing the "${name}" summary label.`);

      const term = document.createElement('dt');
      term.textContent = label;
      const description = document.createElement('dd');
      description.textContent = value;
      summary.append(term, description);
    }

    review.hidden = false;
    status.textContent = this.dataset.previewSuccess ?? '';
  }
}

if (!customElements.get('wholesale-application-preview-component')) {
  customElements.define('wholesale-application-preview-component', WholesaleApplicationPreview);
}
