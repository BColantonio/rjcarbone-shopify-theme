# Product variant audit

## Scope and safety

This audit used the Shopify development preview at `http://127.0.0.1:9292`
with a disposable headless Chrome profile and an initially empty isolated cart.
The user's browser cart was not accessed or changed. No product or admin data,
checkout, orders, or published theme were changed. No theme defect was
reproduced, and no speculative theme fix was made.

The preview product feed contained 11 visible products, all with one variant.
Consequently, real multi-variant selection could not be exercised with the
available data. The checks below are a targeted sample, not a complete
storefront or accessibility audit.

## Actual Shopify preview evidence: single-variant products

- The available Achillea Yarrow Assorted #10 product displayed variant
  `67723176935737`, SKU `YARASS10`, price `$9.99`, and an image. Its quantity
  input had minimum 1 and step 1. Its `?variant=67723176935737` URL selected
  that single variant; this does not establish multi-variant URL behavior.
- A real Add of quantity 2 in the isolated cart submitted that variant ID.
  `/cart.js`, the cart page, and the drawer matched the item and quantity;
  its `variant_title` was null for this single-variant product.
- Sold-out Boxwood American Pre-bunched 2 lb. Bunches displayed variant
  `67765035172153`, SKU `CGBBO`, and price `$82.95`. Its button said
  `Sold out` and was disabled. A programmatic click, with cart-add requests
  intercepted as a safety guard, produced zero requests; the disabled button
  could not be focused. This is not a real Shopify rejection response.
- Sampled collection and search cards exposed quantity and Add controls for
  available single-variant products, but not for sold-out Boxwood. On the
  Yarrow search card, native Space on the focused increase button changed its
  quantity from 1 to 2 without an Add.
- At a 375 × 812 emulated viewport, the search page had a document scroll
  width of 375 and the sampled card controls were visible. On the Boxwood
  product page at the same viewport, scroll width was 375; the quantity
  increase button measured 44 × 44 CSS pixels. It accepted focus and native
  Space changed quantity from 1 to 2, while the sold-out submit remained
  disabled. These checks did not submit another cart item.

## Mocked variant-resolution and quantity coverage

A small temporary Node fixture ran the existing product-form queued-resolution
logic with mocked resources and quantity-rule HTML, alongside the real
`resolveVariantId` function. These are unit-level mocks, not Shopify
multi-variant storefront interactions:

- An available server-resolved variant `222` took precedence over stale
  intended variant `111`, preserving requested quantity 5.
- An unavailable resource and a null resource each resolved to no queued item.
- After a mocked aborted pending resolution, a stubbed URL recovery resolved
  variant `333`; quantity 6 normalized to 5 for mocked minimum 2, maximum 10,
  and step 3.

The fixture passed and was temporary; it did not test a real network response,
variant picker, rendered option changes, or an actual Add submission.

## Remaining limitations

- Verify real products with multiple available and unavailable combinations:
  option changes, variant IDs and URLs, SKU, price, media, inventory, quantity
  rules, selected-variant submissions, cart page and drawer, and unavailable
  transitions. Also verify collection/search quick-add flows for those products.
- The checks above cover only sampled keyboard actions and a single emulated
  mobile size in headless Chrome. Tab order, focus visibility, screen readers,
  touch, other viewport sizes and browsers, and complete keyboard navigation
  remain open.
- Wholesale selling units, quantity-price breaks, discounts, and unit-of-measure
  assumptions were not validated against representative multi-variant data.
  The mock quantity case does not establish Shopify inventory or pricing policy.

## Verification

- `node --check` passed for the seven temporary `variant-preview-*` JavaScript
  helpers and for `assets/product-form.js`, `assets/variant-picker.js`, and
  `assets/variant-resolution.js`.
- The focused mocked resolution and quantity fixture passed.
- `shopify.cmd theme check --path .` exited successfully: 399 files inspected,
  with six warnings in `sections/header.liquid` and `snippets/divider.liquid`,
  matching the warnings documented in the earlier cart audit.
- The final `git diff --check` was interrupted before its result was recorded;
  its result must be confirmed separately. It does not include this untracked
  audit document.
- The audit's temporary helpers and disposable browser profile remain in place;
  cleanup was deferred. No further browser or process checks were performed.
