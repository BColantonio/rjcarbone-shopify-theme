# Customized storefront accessibility audit

Audit date: 2026-11-11

## Confirmed issues and fixes

These issues were confirmed by source inspection. The fixes preserve the current
form/cart values, business rules, page layouts, and prototype boundaries.

| Area | Confirmed issue | Fix |
| --- | --- | --- |
| Wholesale application documents | A successful selection hides the focused file input, and removing a selected document hides the focused Remove button. Focus could fall back to the document or page rather than remain at the edited field. | After selection, move focus to that document's visible Replace button. After removal, move focus to its visible file input. Invalid selections continue to expose the existing described alert without hiding the input. |
| Returns prototype photos | Removing a photo rebuilds the preview list, detaching the focused Remove button without restoring focus. | Restore focus to the next photo's Remove button (or the previous last item); when no photos remain, focus the file input. |
| Requested delivery date | Clear hides the focused Clear button; Retry hides itself while saving. Both actions could leave focus without a visible control. | Return focus to the date input when Clear or Retry is activated. Existing save behavior and status messages are unchanged. |
| Reduced motion | The custom header drawer/menu, shared dialog animations, search-modal animations, and theme drawer animations had no explicit `prefers-reduced-motion` override. | Added component-scoped reduced-motion rules to disable these transitions and animations. No theme-wide override or accessibility overlay was added. |

## Contrast and brand-color decisions

Ratios below use WCAG relative luminance calculations on the exact supplied
hexadecimal colors. No brand colors were changed.

| Foreground | Background | Ratio | Finding |
| --- | --- | ---: | --- |
| `#FFFFFF` | Carbone teal `#0E9CA4` | 3.33:1 | Insufficient for normal text (4.5:1); sufficient for large text and non-text indicators (3:1). |
| `#15191B` | Carbone teal `#0E9CA4` | 5.32:1 | Passes normal-text contrast (4.5:1). |
| Secondary gray `#B5BABD` | White `#FFFFFF` | 1.96:1 | Below 3:1 if used for an essential boundary or state indicator. |
| Secondary gray `#B5BABD` | Carbone teal `#0E9CA4` | 1.70:1 | Below 3:1 if used for an essential boundary or state indicator. |

The header sets its lower-row text to white on teal and configures localization
text at `0.875rem`. That small text fails 4.5:1 if those localization controls
are rendered. The 19px bold primary menu text and large promotional headings
may use the 3:1 large-text threshold; their white/teal pair measures 3.33:1.
Before launch, choose one of these approaches for small lower-row text: use the
existing dark ink `#15191B` on the unchanged teal (5.32:1), place the small
controls on a contrasting surface, or approve another accessible foreground.
Do not silently darken or replace the exact Carbone teal.

The footer utilities configure `#B5BABD` as a divider on teal. If that line is
only decorative, the low ratio does not by itself require a change. If it is
needed to identify content grouping or a control boundary, decide whether to
retain the gray and add non-color separation (such as spacing or a labeled
heading), or choose a separate contrast-qualified divider token. Preserve the
brand gray itself.

## Source-only findings

- The custom mobile navigation uses native `details`/`summary`, visible
  navigation labels, an Escape handler, a focus trap while open, and focus
  restoration to its summary. Desktop menu disclosures are buttons with
  `aria-expanded`, `aria-controls`, hidden/inert submenu content, and Escape
  handling. Search uses a labeled native dialog and a labeled combobox input.
- Breadcrumbs render a labeled navigation landmark with an ordered list.
- Product and cart quantity controls use labeled inputs and visually hidden
  names for increment/decrement buttons. Favorite toggles expose product-aware
  names and `aria-pressed`; favorite-list removal restores focus after rerender.
- The product image, product form, variant, and media-gallery paths have
  semantic component markup. Specific image alternatives and all product
  combinations were not manually reviewed in a browser.
- The cart drawer is a native dialog managed by the theme drawer component.
  Source implements modal focus containment on narrow viewports, Escape close,
  and focus return to the opener. The cart delivery-date control has a label,
  help/error description references, and a polite status region.
- Wholesale fields use explicit labels; validation errors are linked through
  `aria-describedby` and `aria-invalid`. Step changes focus the new step
  heading, progress/status is announced, document inputs have help/error
  descriptions, and review Edit actions return to the selected step without
  clearing entered form values or the in-memory file selections.
- The Returns prototype uses explicit labels, grouped checkboxes, error
  descriptions, a current-step marker, focusable step headings, and live
  status/error regions. The Saved Orders prototype generates labels for
  dynamic controls, describes quantity errors, announces status, and restores
  focus for its existing edit/remove actions.
- Prototype pages remain local/browser-only demonstrations. The returns and
  saved-order pages use sample orders; the wholesale application does not
  submit an application or upload documents.
- Theme base CSS defines visible `:focus-visible` outlines. The inspected
  customized prototype styles use logical properties and responsive
  single-column layouts at narrow widths. No browser zoom, mobile reflow,
  forced-colors, or actual visible-focus checks could be made in this audit.

## Actual storefront HTTP checks

The development preview at `http://127.0.0.1:9292` was reachable for read-only
HTTP GET requests. It returned 200 with matching page titles for the homepage,
`/cart`, `/products/sample-yarass10`,
`/pages/favorites?view=favorites`, `/pages/saved-orders`,
`/pages/returns-request`, and
`/pages/wholesale-application?view=wholesale-application-preview`.

These responses establish that the routes render in this preview; they do not
establish keyboard or assistive-technology behavior. No checkout, order, form
submission, document upload, or cart mutation was performed. The cart's
requested-date control could not be verified interactively.

## Fixture and interactive-browser checks

The attached browser/CDP connection timed out, so browser-driven keyboard
checks, screenshots, accessible-tree inspection, viewport resizing, zoom, and
reduced-motion emulation were unavailable. The shared wholesale fixtures on
ports 8765 and 8766 and cart-delivery-date fixtures on port 8767 refused
connections; their behavior was not verified. These fixtures must not be
treated as passing or failing based on source inspection alone.

## Remaining verification and decisions

- Resolve the header small-text/teal contrast choice and decide whether the
  footer divider communicates essential grouping.
- In an available browser, manually verify Tab and Shift+Tab order, focus
  visibility, submenu/disclosure state, Escape close and focus return for
  mobile navigation, search dialog, cart drawer, and all prototype actions.
- Verify document selection/replacement/removal, return-photo removal,
  cart-date clearing/retry, and wholesale review editing keep focus and retain
  values in the actual preview.
- Check screen-reader announcements and error associations, text alternatives,
  200%/400% zoom, narrow mobile layout, and reduced-motion behavior. Recheck
  teal/gray pairings in the final merchant-configured storefront.
- Restart the local fixtures before testing. The failed HTTP probes were:
  `http://127.0.0.1:8765/wholesale-step-test.html`,
  `http://127.0.0.1:8766/wholesale-validation-test.html`, and
  `http://127.0.0.1:8767/cart-delivery-date-fixture.html`.

No theme pages, admin menus, checkout, orders, or external services were
changed or used.
