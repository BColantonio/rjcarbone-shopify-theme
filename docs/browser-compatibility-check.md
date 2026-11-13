# Focused browser compatibility check

## Availability and scope

This Windows workspace had Google Chrome `157.0.8103.39` and Microsoft Edge
`157.0.4341.46` registered and installed. Firefox and Safari were not found on
PATH, in standard installation locations, or in Windows App Paths. No local or
checked global Playwright/Puppeteer package or standard Playwright browser
cache was found. A nonstandard installation may exist outside the checked
locations. No browser or dependency was installed. WebKit automation was not
available; no result below is a WebKit or actual Safari test. The `Safari`
substring in Chromium user-agent strings does not identify Safari coverage.

Checks used separate newly created headless Chromium profiles and the Shopify
development preview at `http://127.0.0.1:9292`. Cart and Favorites changes
were confined to those profiles; the user's browser cart and saved data were
not accessed. A synthetic `sample.pdf` was held in the local wholesale preview;
no real document, application, order, checkout, or admin change was submitted.
The disposable profiles and small `browser-compat-*` helpers are retained.
Existing variant-audit artifacts were not removed.

## Observed results

These are sampled Chromium observations, not Firefox or Safari compatibility
claims. Controls were activated programmatically except for the noted native
Tab event.

### Chrome 157.0.8103.39, headless

- At 375 × 812, the mobile menu's details element opened and the home and
  sampled product document widths matched the viewport width. Menu links and
  submenus were not exercised in this Chrome run.
- On the single-variant Yarrow product, increasing quantity changed 1 to 2;
  the Add control was enabled. After reloading the product, a real Add of one
  item produced variant `67723176935737`, quantity 1 in the isolated cart and
  the cart page displayed the item. The changed quantity of 2 was not the
  quantity submitted because the product page had been reloaded.
- The isolated favorite toggle changed from unpressed to pressed, stayed
  pressed after product reload, and returned to unpressed on removal. Removal
  persistence after another reload was not checked.
- A requested delivery date was saved; the status and `/cart.js` attribute
  agreed, and the date remained after navigating back to the cart. Clear
  emptied the input; the follow-up cart response had no date attribute. Clear
  persistence after another reload was not checked.
- The wholesale preview blocked an empty first step, marked five fields
  invalid, and focused the company field. The sampled cart and wholesale
  pages had document width 375 at the 375-pixel viewport.

### Edge 157.0.4341.46, headless

- At 375 × 812 on the Flowers collection, `Browse Flower Types (67)` opened
  from a closed state and contained 67 links. The mobile menu opened and
  exposed 11 links, including Home, Flowers, Roses, Greens, and Plants. The
  document width was 375. Individual destinations and nested navigation were
  not activated.
- The wholesale preview blocked the empty first step with five invalid fields
  and focused company. Synthetic valid first-step data allowed navigation to
  Business profile, Buyers & owner, Documents, Applicant acknowledgment, and
  Review. A synthetic PDF selected through a browser `DataTransfer` was shown
  as `sample.pdf (6 B)`; the selection was made while the Documents panel was
  hidden, so this is not evidence for the visible file-picker interaction.
  Review displayed the sample business name; Edit returned to step 1 with the
  name retained. A native Tab event focused the company input, which matched
  `:focus-visible` and had a solid 1px computed outline. This is a sampled
  computed-style check, not a visual accessibility audit.
- A separate isolated Edge run clicked Add, but its cart-drawer observation
  failed with an uncaught probe evaluation exception. The drawer update was not
  verified and the later visible-step document-removal check did not run. The
  exception does not establish a theme defect.

## Findings and follow-up

No cross-browser compatibility defect was reproduced, and no theme files were
changed. The Chrome and Edge runs do not establish Firefox, Safari, or WebKit
behavior. With suitable browsers available, repeat department disclosures and
mobile navigation, quantity/Add and cart page/drawer updates, delivery-date
selection/clear/reload persistence, Favorites save/remove/reload, wholesale
validation and visible sample-document selection/removal and Review editing,
layout overflow, and visible keyboard focus in isolated Firefox and actual
Safari sessions. Test WebKit separately if available and label it as engine
coverage only. Include real keyboard and touch interactions and additional
viewports; these headless checks are not a full accessibility audit.

## Validation

No theme JavaScript or Liquid was changed, so changed-theme JavaScript syntax
checks and a post-theme-change Theme Check are not applicable. `git diff
--check` exited successfully; it does not include this untracked document.
The earlier audit's separate Git check had remained running without output.
