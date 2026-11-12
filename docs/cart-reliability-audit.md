# Cart reliability audit

## Scope and safety

This audit covers the existing cart page and drawer, product-card Add controls,
quantity updates, and requested delivery date. Inventory integration and
server-side wholesale and checkout enforcement are explicitly out of scope.
No dependencies, product or admin data, orders, checkout, or published theme
were changed.

Tests used the development preview at `http://127.0.0.1:9292` in a separate
headless Chrome profile. The isolated session initially had an empty cart,
zero items, a null note, and no attributes. The existing user's browser cart
was not accessed or changed; no restoration of that cart was attempted. The
isolated session used the preview sample product Achillea Yarrow Assorted #10
and an isolated test note, attribute, and requested delivery date. Temporary
browser data is disposable and was not copied into the user's session.

## Findings and fixes

| Finding | Evidence and change |
| --- | --- |
| Repeated Add submissions | With Add requests held by a mock, two clicks sent two requests. The shared product form now guards submissions while the request or queued variant resolution is pending. A later intentional click is accepted after settlement. |
| False Add feedback and unknown result | An intercepted offline Add showed the success animation without a visible or announced error. Success feedback now waits for the Add and cart refresh; uncertain outcomes show an accessible message to check the cart before retrying. The theme does not automatically retry an Add. Drawer auto-open waits for a successful cart event. |
| Quantity race | Two concurrent mocked changes returned out of order, leaving quantity 2 instead of the latest 3. Cart-line changes are serialized and use the captured line key rather than a potentially shifted line index. |
| Failed last-item removal | A mocked offline removal displayed an empty heading while the isolated Shopify cart still contained the item. Removal now waits for the response and shows the existing line alert on failure. Confirmed removal restores focus when the removed control loses focus. |
| Adjusted quantity | A mocked successful response returned quantity 2 for a request of 3; the page showed 2 without explanation. The theme now announces that the requested quantity was adjusted after rendering the returned cart. The check applies when the response retains the same line key. |

## Preview and fixture evidence

The following are **actual Shopify development-preview interactions**, except
where explicitly marked as mocked:

- A single real Add in the initially empty isolated cart created one sample
  item. Two later intentional sequential Adds succeeded, and the drawer's
  quantity and header count matched the cart response.
- Two rapid quantity increases were sent with the first real request delayed
  by a browser fetch wrapper. Requests reached Shopify in order 2 then 3; the
  cart and displayed quantity ended at 3.
- The isolated cart note and unrelated `Audit field` attribute were saved;
  the delivery-date component saved `2026-11-26`. The note and both attributes
  survived item changes, confirmed last-item removal, and a later Add.
- Confirmed last-item removal on the page showed the empty state, changed the
  header count to zero, and focused Continue shopping. The same check in the
  open drawer kept the drawer open, showed its empty heading, set the count to
  zero, and focused Continue shopping.
- With drawer auto-open enabled temporarily in the isolated DOM, a real
  successful Add opened the drawer and synchronized its item quantity and
  header count. This did not change merchant settings.

The following are **mocked browser responses**, not observations of Shopify's
inventory or quantity-limit policy:

- Two Add clicks while a request was held produced one request; a rejected
  request produced visible live-region feedback and no success state. A later
  click produced a new request.
- Offline removal retained the row and focus and displayed an alert on both
  page and drawer. A mocked HTTP 422 quantity-limit message was displayed.
- A mocked HTTP 200 response returning quantity 2 for requested quantity 3
  rendered 2 and displayed the adjusted-quantity alert.
- A mocked HTTP 422 unavailable-item Add displayed the server description,
  did not show success, and did not auto-open the drawer.
- A mocked offline delivery-date save displayed its retry control and error;
  an explicit retry against Shopify then saved `2026-11-27` without changing
  the isolated note or unrelated attribute.

## Open checks and limitations

- These are isolated headless Chrome checks, not a full manual accessibility,
  mobile, keyboard, screen-reader, or cross-browser audit. The quick-add modal
  focus handoff and every merchant auto-open configuration remain to be tested.
- No real unavailable product or real Shopify quantity-limit adjustment was
  exercised. Confirm those against representative store data without changing
  product or inventory settings.
- Cross-tab or app-originated simultaneous cart mutations, line-key changes
  caused by discounts, missing section HTML and failed section rendering,
  and note edits concurrent with rerendering remain open checks. A failed
  network request can have reached Shopify; the
  recovery message deliberately directs the shopper to check the cart first.
- Page and drawer were checked across navigation and drawer rerenders, not as
  simultaneously visible cart components. Initial cart state of the user's
  existing browser session is unknown because that session was not accessed.
- The three new cart recovery messages use English fallback text in all 33
  non-default locales, following the existing delivery-date message convention.
  They need translation and review before relying on localized messaging.

## Verification

- `node --check` passed for `assets/cart-drawer.js`,
  `assets/component-cart-items.js`, and `assets/product-form.js` after the
  final JavaScript edits.
- `shopify.cmd theme check --path .` passed after the locale fixes: 398 files
  inspected, with six existing warnings in two unchanged files.
- `git diff --check` passed. Git reported LF-to-CRLF conversion warnings;
  these were not whitespace errors.
