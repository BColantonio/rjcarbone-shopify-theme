# Shopify 1.0 launch-readiness checklist

This is the central readiness tracker for the Shopify 1.0 launch. It records
what has been verified, the next action for open work, its dependency or owner,
and the evidence required to close it. It links to the detailed requirement
and audit documents instead of restating their full specifications.

**Status rule:** a theme template, a local-preview HTTP 200, source inspection,
or a passing Theme Check is not proof of a production workflow. “Verified”
below is limited to the exact source, fixture, or preview evidence named.
Prototype behavior is not production-ready behavior.

## Completed and verified

| Item | Verified evidence and boundary |
| --- | --- |
| Requirements and audit baseline | The [inventory integration requirements](./inventory-integration-requirements.md), [wholesale registration requirements](./wholesale-registration-requirements.md), [accessibility audit](./accessibility-audit.md), [performance audit](./performance-audit.md), [storefront link and redirect audit](./storefront-link-and-redirect-audit.md), and [legacy-hostname requirement](./legacy-hostname-launch-requirement.md) record the current findings and unresolved questions. They are planning evidence, not proof that integrations or launch configuration are complete. |
| Theme accessibility fixes | Source inspection confirmed the documented focus restoration fixes for application-document controls, return-photo removal, and requested-date clear/retry, plus reduced-motion overrides. Browser, keyboard, screen-reader, zoom, and final merchant-color checks remain open under [accessibility follow-up](./accessibility-audit.md#remaining-verification-and-decisions). |
| Route and link spot checks | The development preview returned 200 for the routes and collection URLs listed in the [link audit](./storefront-link-and-redirect-audit.md#development-preview-checks); the source audit found no confirmed broken internal theme link. This does not verify external services, production pages, redirects, checkout, or domain cutover. |
| Wholesale application UI | The preview-only, multi-step application has the documented fields and client-side validation. The checked preview rendered a prototype notice. It does not submit an application, create an account, upload documents, or grant access; see [wholesale requirements](./wholesale-registration-requirements.md#wholesale-application-prototype-fields). |
| Favorites, saved orders, and returns UI | The theme implements browser-local favorites and browser-only saved-order/reorder and returns prototypes. The saved-order and returns flows use sample data; they are not account-backed, real order history, or submitted staff workflows. See the [favorites section](../sections/favorites.liquid), [saved-orders section](../sections/saved-orders.liquid), and [returns section](../sections/returns-request.liquid). |
| Requested delivery-date UI | The cart date control persists an optional customer-selected date as a Shopify cart attribute and rejects past dates in the browser. The audit did not verify it interactively, and it does not enforce date availability or checkout eligibility. See [inventory requirements](./inventory-integration-requirements.md#field-and-behavior-requirements). |
| Weekly Specials storefront component | The page section and client fetch/render path exist; the preview route rendered. The feed setting is intentionally not production-configured until the approved legacy HTTPS hostname and origin are known. Feed deployment and live-feed behavior are not verified; see [feed companion deployment notes](../tools/weekly-specials-feed-companion/README.md#eventual-deployment-outline). |
| Performance investigation | A scoped promo-image deferral experiment was measured in the local preview and documented, including its limitations. The measured improvement is not production field evidence; no image replacement was deployed. See [performance results](./performance-audit.md#scoped-homepage-promo-image-loading-experiment). |

These items close only the stated development/source checks. None establishes
that a prototype or integration is ready for customer use.

## Work we can finish independently now

| Open item | Next concrete action | Dependency / owner | Evidence needed to close |
| --- | --- | --- | --- |
| Accessibility interaction and responsive verification | Restart the documented local fixtures, then manually check keyboard order/focus, Escape and focus return, form and cart-date interactions, screen-reader announcements, 200%/400% zoom, narrow reflow, and reduced motion in the preview. Recheck with final merchant colors. | **User** for the manual checks called out in the [accessibility audit](./accessibility-audit.md#remaining-verification-and-decisions). Fixture processes must be available. | Record the tested routes, viewport/settings, assistive technology where used, pass/fail results, and any fixes; confirm the fixtures respond before treating fixture checks as evidence. |
| Confirmed contrast choices | Apply the supervisor/team-approved choice for small white-on-teal header text and decide whether the gray footer divider conveys essential grouping; verify final configured combinations. | Decision owner: **supervisor/team**; implementation owner: **unassigned**. | Approved color/context decision and measured final text/control contrast, with rendered-page verification. Do not silently change the brand teal or gray. |
| Event-space tile destination | Verify the PDF contents and intended “Floral Event Space” destination before changing the tile. | Site/content owner: **unassigned**. | Owner-confirmed destination and evidence the destination content is the intended event-space information; then verify the rendered link. |
| Production content and policies | Review production-facing product/catalog content, contact information, and Shopify policy pages/links against approved business copy; confirm the actual configured pages rather than relying on theme defaults. | Content/policy approver: **unassigned**. | Approved content/policy checklist and rendered production-page links/content. |
| Non-inventory browser and purchase-path acceptance | On the configured Shopify store, exercise account sign-in, cart editing, discount entry/removal, standard checkout, and every enabled accelerated checkout using approved test accounts/payment methods. Include negative tests for unapproved wholesale buyers after enforcement is configured. Do not place live orders without authorization. | Store/account configuration and access enforcement must be ready; test coordinator: **unassigned**. | Dated test cases/results, test-order IDs where authorized, and proof that expected allowed and denied paths behave correctly. |
| Remaining accessibility checks on real configuration | Check image alternatives and product variants, focus visibility, error/status announcements, and color pairings using actual production content and settings. | Store configuration required; manual verifier: **user** for documented manual follow-up. | Completed test record for representative pages and settings, plus resolved defects or approved exceptions. |
| Reassess homepage image and shared-script opportunities | Keep the exact-verified image comparison copies and the script-loading investigation as optional optimization work; decide whether to test them after launch-critical paths are stable. | Image deployment needs site/hosting approval; optimization scope owner: **unassigned**. | If pursued, owner-approved changes and controlled before/after production-representative measurements with image/output parity. |

## Decisions needed from supervisor/team

| Open item | Next concrete action | Decision owner / dependency | Evidence needed to close |
| --- | --- | --- | --- |
| Confirm 1.0 feature scope | Explicitly mark wholesale application, account-backed favorites, saved orders, returns, Weekly Specials, and any existing Order Portal integration as launch-required or deferred. Keep the current sample/browser-only experiences labeled and withheld or replaced if their production workflows are not ready. | **Supervisor/team**. | Recorded 1.0 scope decision for each feature and approved production behavior; update this checklist when scope is settled. |
| Wholesale price visibility and store model | Choose normal storefront price hiding versus strict no-price exposure; choose a blended or dedicated wholesale store; verify the selected Shopify plan and Markets/catalog constraints. | **Supervisor/team**. Depends on store plan and business pricing intent. | Recorded architecture decision and security test plan covering visible pages plus price-bearing public product/search/API/structured-data surfaces. For strict confidentiality, evidence that anonymous and signed-in-but-unapproved sessions cannot retrieve any price. |
| Wholesale approval and ordering enforcement | Confirm the approval record/source of truth, who can grant/revoke approval, the exact approved state, online versus other-channel scope, and how the server-side cart/checkout rule will enforce it. Do not treat sign-in, customer tags supplied by the browser, hidden controls, or theme code as authorization. | **Supervisor/team** for policy; implementation owner **unassigned**. Depends on the approved B2B architecture. | Approved workflow and access-state definition; server-side validation evidence for unapproved, pending, approved, and revoked accounts across enabled checkout paths. |
| Wholesale customer migration | Define eligible existing customers, duplicate/shared-email and multi-location handling, order-history and tax-exemption migration choices, and approval before any migration. | **Supervisor** for eligibility research/approval; migration operator **unassigned**. | Approved customer cohort and migration rules; reconciliation of migrated companies/locations, access, and any selected history/tax data. |
| Registration submission and acknowledgment | Select the production submission/recordkeeping path, supervisor mailbox, fields allowed in email, pending/approved/declined tracking, confirmed required fields/document types, and an authoritative acknowledgment timestamp. | **Supervisor/team**; backend implementation owner **unassigned**. | End-to-end test submission received by the authorized workflow, auditable application status, confirmed field rules, and server-generated acknowledgment timestamp. |
| Secure registration documents and staff access | Approve secure upload/storage, validation, retention/deletion, permissions, and staff access before collecting real identification or resale documents. The prototype keeps selected files in page memory only. | **Supervisor/team** for data and retention policy; technical owner **unassigned**. | Security/privacy-approved design and tests for upload restrictions, private storage, authorized staff access, retention/deletion, and unauthorized access denial. |
| Registration address verification | Choose provider, cost/credential ownership, and production handling for verified addresses and manual-review fallbacks. Current checks are formatting only. | **Supervisor/team**; provider/backend owner **unassigned**. | Approved provider and tested full-address verification (street, city, region, postal code, country), correction suggestions, and flagged manual-review fallback. |
| Pricing and quantity discounts | Decide whether quantity breaks are informational or must alter the actual cart/checkout price, and whether native Shopify breaks or another approved mechanism will be authoritative. The custom `custom.quantity_price_breaks` table is display-only. | **Supervisor/team** for pricing policy; implementation owner **unassigned**. Inventory-provided rules remain deferred until alpha. | Approved price/tier rules and test carts/checkouts demonstrating the correct charged prices at each boundary, including quantity changes and discounts. |
| Payment setup and credit authorization | Select payment provider/methods and clarify whether card authorization is required, when authorization occurs, and what is in scope for the wholesale application versus checkout. Never collect card number or CVV in the application. | **Supervisor/team**; payment configuration owner **unassigned**. | Approved provider/account configuration and authorized test transactions demonstrating the intended authorize/capture/refund behavior. |
| Delivery schedules, cutoffs, and eligibility | Define delivery days, lead time, daily cutoffs, holidays, address/region eligibility, and the system of record. Decide whether the cart date is only a request or must be validated/enforced at checkout and how it is passed downstream. | **Supervisor/team** for policy; operational/integration owner **unassigned**. Some downstream integration specifics wait for inventory alpha. | Approved schedule/rules and boundary-case tests for cutoff, holidays, ineligible addresses, unavailable dates, and the value/order handling downstream. |
| Returns policy and staff workflow | Confirm eligibility/time window, reasons, photos/size limits, customer acknowledgment, case ownership, notifications, decision/refund/exchange flow, and staff records. The current wizard uses fictional orders and its submit action only shows a local confirmation. | **Supervisor/team**; production workflow owner **unassigned**. | Approved policy and staff procedure, plus an end-to-end test request tied to a real test order with securely stored photos and a visible staff action/status trail. |
| Redirect and link decisions | Approve the exact legacy-to-Shopify mappings and confirm the event-space destination and Dutch Fresh Direct login remain intended. Keep query-dependent `/gallery` mappings query-aware; no redirects are configured. | **Supervisor/site owner**; redirect operator **unassigned**. | Approved source/destination table and production redirect tests for each approved query, plus unmatched-route tests proving unknown IDs do not fall through to the homepage. |

Detailed field, plan, API, and migration questions are in the
[wholesale registration requirements](./wholesale-registration-requirements.md#decisions-still-needed)
and [storefront link audit](./storefront-link-and-redirect-audit.md#proposed-legacy-to-shopify-redirects).

## Work awaiting the inventory software alpha

**Do not resolve inventory integration specifics before the alpha is available.**
The existing [inventory integration requirements](./inventory-integration-requirements.md)
are a requirements/clarification document, not an API contract. Keep these
items blocked rather than inventing mappings, endpoints, or sync behavior.

| Open item | Next concrete action after alpha is available | Dependency / owner | Evidence needed to close |
| --- | --- | --- | --- |
| Catalog identity and field ownership | With the alpha interface/data model in hand, agree system-of-record and sync direction for stable source product and sellable-item/variant IDs, Shopify IDs, SKU, titles, descriptions, images, publication, and product/category assignments. Do not assume SKU is unique or immutable. | Inventory software alpha; inventory/integration team (specific owner **unassigned**). | Approved field-level mapping, stable identifiers, sync ownership/frequency/error handling, and reconciled representative products/variants. |
| SKU, UOM, and category mapping | Confirm whether UOM is product- or variant-level and map it to the theme’s product-level `custom.selling_unit` contract or an approved replacement. Preserve source department/category IDs; resolve ambiguous/shared/placeholder categories and product membership against the authoritative source. | Inventory alpha plus source-category decisions; integration team **unassigned**. | Approved mapping table for representative floral and supplies items, UOM validation, source-ID preservation, and collection/product assignment reconciliation. |
| Stock and availability | Confirm authoritative stock, inventory location/scope, update timing, backorders, availability/publication rules, and failure/stale-data behavior; then implement and test the agreed synchronization. | Inventory alpha; inventory/integration team **unassigned**. | Reconciled Shopify versus source stock/availability tests, including zero, changed, multi-location (if applicable), backorder, stale, and sync-failure cases. |
| Base and tier pricing | Confirm source of base and tier prices, currency, effective dates, and how agreed rules connect to the Shopify cart/checkout enforcement selected above. | Inventory alpha and supervisor/team pricing decision; implementation owner **unassigned**. | Reconciled source-to-Shopify prices and successful cart/checkout boundary tests for agreed tiers and effective dates. |
| Orders back to inventory | Define required order events/fields and treatment of edits, cancellations, refunds, and fulfillment; implement and reconcile order flow after the interface is known. | Inventory alpha; inventory/integration team **unassigned**. | End-to-end test orders and lifecycle changes reconciled in both systems, with retry/error visibility and agreed operational ownership. |

## Deployment and cutover tasks

| Open item | Next concrete action | Dependency / owner | Evidence needed to close |
| --- | --- | --- | --- |
| Separate legacy-server hostname | Select and approve the hostname before DNS or server changes. Provision HTTPS/TLS and verify the host still serves the required legacy resources. | **Site/hosting team**; hostname and cutover plan require approval. | Approved hostname, valid TLS, and successful checks for every path listed in the [legacy-hostname requirement](./legacy-hostname-launch-requirement.md). |
| Weekly Specials feed deployment | After hostname/origin approval, deploy only the companion handler and its assembly alongside the existing legacy application; configure the approved legacy base URL, exact Shopify HTTPS origin allowlist, and upload directory. Configure the Shopify feed URL only after endpoint verification. | Site/hosting team; Shopify page configuration owner **unassigned**. Depends on approved legacy hostname and production origin. | Live HTTPS endpoint returns the expected image-only payload; allowed origin succeeds, disallowed origin is rejected, image URLs/TLS work, cache/error behavior is checked, and the production page renders the live feed. Do not use wildcard CORS or guessed hostnames. |
| Legacy hostname references and remote media | Update or preserve the homepage’s 13 remotely hosted carousel/promo image paths and the header Order Portal landing route plus both `/OrderPortal/Order` catalog links so they resolve on the approved legacy host; preserve catalog query parameters. Include the event-space PDF only after its destination is confirmed. | Site/hosting team; approved hostname required. Theme/config operator **unassigned**. | All referenced image URLs and routes resolve over HTTPS after cutover, including both catalog IDs and query strings; rendered links point to the approved host and media loads without mixed-content/CORS failures. |
| Legacy-to-Shopify redirects | Implement only approved mappings in a query-aware layer; do not use a path-only `/gallery` redirect for destinations distinguished by query parameters. | Redirect/site operator **unassigned**; supervisor/site owner approval required. | Production tests for each approved query mapping, preserved intended destination, and unmatched/unknown query behavior. |
| Theme and Shopify production configuration | Verify the production theme version, page handles/templates, navigation, settings, app/account/catalog configuration, feed URL, policies, and external destinations in the actual target store. Do not infer this from repository templates or preview routes. | Shopify admin/configuration owner **unassigned**. | Dated production configuration checklist and rendered-route checks in the target store. |
| Launch test orders and approval | Run authorized end-to-end test orders covering applicable retail/approved-wholesale access, discounts, delivery, payment, taxes/shipping as configured, order notifications, inventory/order sync once available, and refund/cancel where required. Obtain explicit go/no-go approval. | Test/approval owner **unassigned**; business approval from **supervisor/team**. Depends on required integrations and policies being ready. | Test-order IDs/results, reconciliations, resolved launch-blocking defects, and recorded launch approval. |
| DNS/domain cutover and rollback | Execute the approved cutover only after the hostname, redirects, production checks, and rollback plan are tested. Do not make DNS/server changes before approval. | **Site/hosting team**; approver **unassigned**. | Approved runbook with exact change and rollback steps, responsible contacts, recovery criteria, and successful rehearsal or documented verification; timestamped cutover and post-change checks. |
| Post-launch checks | Immediately verify storefront, product/catalog access, cart/checkout, payment/order notifications, weekly feed, legacy media/Order Portal, redirects, and monitoring/error reporting. Continue the agreed follow-up review after launch. | Operations owner **unassigned**. | Recorded smoke-check results, order/feed/redirect observations, incident ownership, and follow-up review with issues assigned. |

## Optional enhancements — separate from launch blockers

These should not block Shopify 1.0 unless the supervisor/team explicitly
includes them in scope. If selected, track them with an owner and evidence.

- Replace only the exact-verified lossless legacy image copies or consider the
  reviewed 2x `NewArrivals.png` comparison after visual and responsive-crop
  approval. No comparison image has been deployed; retain the originals and
  paths unless the host operator approves replacement. See the
  [performance audit recommendations](./performance-audit.md#legacy-image-inspection-and-comparison-copies).
- Investigate reducing shared theme JavaScript only after tracing actual
  component dependencies and measuring controlled before/after behavior; the
  current request counts do not prove unused modules or production execution
  cost. See [performance follow-up](./performance-audit.md#unresolved-dependencies-and-follow-up).
- Treat broader modern-format/responsive image hosting, advanced performance
  optimization, and enhancements to browser-local favorites or saved-order
  UI as optional until they are explicitly selected for 1.0.

## Three highest-value next actions that do not depend on the inventory alpha

1. **Get a wholesale access decision:** have the supervisor/team choose the
   price-exposure and store model, confirm the approval state and ordering
   enforcement scope, and approve migration eligibility. This determines
   whether wholesale can safely launch at all.
2. **Approve the legacy hostname and cutover owner:** have the site/hosting
   team confirm the hostname, TLS and exact storefront origin, then schedule
   the feed, image, and Order Portal verification without changing DNS early.
3. **Settle customer-facing operational rules:** confirm payment/credit
   authorization and delivery schedules, cutoffs, and eligibility; separately
   approve the returns staff workflow and 1.0 inclusion so production flows
   can be implemented and tested rather than exposing prototypes.
