# Wholesale access: launch architecture decision brief

**Decision:** Investigate a separate, price-free public catalog with isolated,
authenticated Shopify commerce first. This is a proof-of-concept direction, not
an approved launch architecture. **No option is proven to meet all confirmed
requirements.** Sources checked **2026-11-17**; configuration and responses in
this store have not been verified. This builds on the
[access audit](./customer-access-audit.md),
[wholesale requirements](./wholesale-registration-requirements.md), and
[launch checklist](./launch-readiness-checklist.md), rather than repeating their
surface-by-surface audit.

## Decision context and non-negotiables

Visitors and unapproved accounts may browse names, images, and categories but
must not receive prices or place orders. This includes product, variant,
compare-at, and quantity-break amounts in HTML, JSON-LD, scripts, APIs, carts,
and checkout. Signing in is not approval. Brian or his supervisor manually
reviews applications and decides approval and revocation. Existing customers
automatically qualify **after secure identity matching**, not merely after a
login or an email claim. The application and access-state pages remain previews;
they are not a submission or authorization system. Basic is the reported
current development plan; the launch plan and actual Admin configuration are
undecided or unverified. Inventory integration waits for the external team's
alpha.

### Why public Shopify endpoints matter

Shopify documents product JSON at `/{locale}/products/{handle}.js` with product
and variant prices and compare-at fields [1]. Predictive-search JSON can also
return product and variant amounts [2]. The Storefront API supports tokenless
product, collection, and search access [3]; its product and variant types
include price ranges, prices, compare-at prices, and quantity breaks [4]. The
Liquid `structured_data` product example includes an offer price [5]. The
audited Horizon theme already emits product structured data. These are documented
capabilities, **not evidence of this store's actual responses**. Published
products, publication channels, buyer context, and configuration must be tested.
A private API token must remain server-side, but keeping it secret does not
remove separately available tokenless or Ajax access [3, 6].

Liquid conditions, CSS, tags, hidden buttons, and checkout validation alone do
not establish confidentiality. Shopify's headless B2B example proposes omitting
price fields and Add controls for a buyer without a valid customer and company
location [7]; that describes a storefront query/UI pattern, not a guarantee
that independently accessible endpoints, cached responses, or checkout links
are protected. A login or company association is not automatically this
business's authoritative approval.

## Options

The approval, migration, and revocation workflow is needed in **every** option:
a protected authoritative eligibility record, Brian/supervisor permissions and
audit trail, secure matching and exception handling for duplicate/shared emails
and multiple locations, and synchronized, fail-closed revocation. Verified
existing customers must not require discretionary reapproval merely to migrate.
The current previews provide none of this. The policy must define propagation
and prevent new retrieval or orders after revocation, including with previously
issued sessions and links; it cannot erase prices already copied.

### A. Public Shopify theme with native B2B catalogs and validation

- **Browse and prices:** Reuse the public Horizon storefront; show only a
  price-free presentation to unapproved buyers and contextual B2B prices to
  eligible buyers. Shopify documents B2B catalog/buyer context [7, 8], but
  public Ajax, search, Storefront API, structured data, and cart/checkout may
  still expose base or other prices. Isolation is **unverified**; a retail
  price is also disallowed. Without proof on every enabled surface this option
  fails the requirement, regardless of theme conditions.
- **Approval and orders:** Implement the shared workflow and map its current
  state to trusted Shopify inputs. A Cart and Checkout Validation Function can
  reject unauthorized checkout, but does not hide price-bearing responses;
  direct cart and alternative order channels need separate testing and control.
- **Plan and operations:** Native B2B needs a B2B-capable plan [7, 8];
  Shopify's pricing page lists B2B catalogs under Plus [9]. Basic is not proof
  of native B2B eligibility. A public App Store Function can run on any plan,
  whereas a custom Function app requires Plus, with further feature limits
  [10, 11]. App suitability, backend hosting, workflow and synchronization,
  security monitoring, and operating costs are unknown. See pricing below.
- **Horizon:** Highest reuse of theme layouts, sections, and assets, but all
  price and purchase surfaces still need safe behavior; reuse does not secure
  Shopify's independent endpoints.
- **Inventory:** No alpha integration is needed to test access; catalog and
  price synchronization with inventory remains deferred.

### B. Price-free public catalog plus isolated authenticated commerce — investigate first

- **Browse and prices:** Serve a separate catalog containing only approved
  public fields, with no price-bearing HTML, structured data, JavaScript, or
  API payloads. A protected backend checks current eligibility before returning
  prices or initiating commerce. Shopify supports headless storefronts and
  contextual B2B queries [6, 7, 12]. However, independent Shopify endpoints,
  sales-channel publication, public tokens, cart/checkout responses, and
  caches must also be isolated from anonymous and unapproved buyers. A separate
  UI, an unpublished Online Store product, or a secret token is not proof of
  isolation across all channels.
- **Approval and orders:** Implement the shared review/matching workflow; check
  current server-side authorization on every price and order request. Add a
  supported Shopify-side checkout validation with a trusted, current state;
  revoke access to backend responses and Shopify checkout, including old links.
  A backend-only gate is insufficient if Shopify URLs bypass it.
- **Plan and operations:** A headless storefront alone does not establish a
  specific required tier. Native B2B requires a B2B-capable plan [7]; a custom
  validation Function requires Plus [10]. On Basic, an appropriate public App
  Store Function is only a possible alternative if it supports the required
  trusted state, failure behavior, and channels. Build or procure a backend,
  approval app, catalog publishing/sync, secure hosting, operations, and
  monitoring; costs and suitability are unknown. Shopify documents self-hosted
  headless and Hydrogen on Shopify's Oxygen hosting [12]; hosting capability,
  limits, and cost for the chosen plan must be confirmed.
- **Horizon:** Reuse design, copy, images, and possibly adapted assets; Liquid
  sections and theme runtime do not run unchanged in a headless frontend, so
  expect substantial rebuild. If an independently proven restricted Shopify
  storefront is used for commerce, more Horizon could be reused there.
- **Inventory:** No integration is required for the access proof; use
  authorized test catalog data. Production inventory/pricing synchronization is
  deferred until the alpha and is not assumed to be available.

### C. Separate restricted Shopify commerce store plus public price-free catalog

- **Browse and prices:** The public catalog is price-free; a second Shopify store
  holds commerce. A separate store or shared storefront password is not proof
  of per-buyer approval or isolation of product, search, API, cart, checkout,
  other channels, or previously issued URLs. Prove these boundaries before
  relying on them.
- **Approval and orders:** The shared workflow must grant individual access and
  revoke it promptly. Shopify-side checkout validation and restrictions for
  unsupported order channels are still required; direct endpoints and old
  checkout links may bypass the public catalog.
- **Plan and operations:** The second store needs its own Shopify subscription
  or explicitly confirmed contractual entitlement; B2B and Function plan rules
  above still apply. Add a public catalog host, application/backend, data and
  eligibility synchronization, monitoring, and potentially app subscriptions.
  Store entitlement, setup, hosting, app, and maintenance costs are unknown.
- **Horizon:** The restricted store may reuse/adapt much of the theme if the
  required boundary works; the separate catalog needs its own implementation.
  Confirm theme licensing and transfer rights for the actual stores [13].
- **Inventory:** No alpha is needed for an isolation proof. Eventual multi-store
  catalog, inventory, and order synchronization remains deferred and potentially
  adds complexity.

### Published costs and unknowns

On Shopify's US pricing page as checked, Basic is **$39 USD/month monthly** or
**$29 USD/month billed yearly**; Plus is advertised **from $2,300 USD/month**
with the yearly pricing selection [9]. These are published starting prices, not
a quote, total cost, or proof of the plan required by a candidate. Terms,
region, billing commitment, taxes, transaction/payment fees, and promotions
can change. Shopify lists Horizon as free [13]. No app, additional-store,
hosting, implementation, security, migration, or ongoing support price has been
verified; obtain quotes rather than treating estimates as published costs.

## Requirements status

**Met** means proven for the proposed launch configuration, not merely described
in documentation. **Unmet** means known not to be implemented by the current
source/previews. **Unverified** means the candidate or configured store has not
been shown to satisfy it.

| Requirement | Current evidence | A | B | C |
| --- | --- | --- | --- | --- |
| Public browsing without any price in HTML, structured data, JS, APIs, cart, or checkout | Current theme renders prices without an approval check; live endpoint responses unknown. | Unverified | Unverified | Unverified |
| No orders for anonymous, pending, declined, or revoked buyers; approved buyer can order | No server-side approval enforcement was identified in source; enabled channels unknown. | Unverified | Unverified | Unverified |
| Manual review, approval, revocation, and secure existing-customer matching | Preview does not submit or grant access; real workflow and matching are not implemented. | Unmet | Unmet | Unmet |
| Timely revocation across sessions, cached data, carts, and old links | No verified authoritative state or propagation. | Unverified | Unverified | Unverified |
| Inventory integration | Deferred until external alpha; not a prerequisite for the access proof. | Unverified | Unverified | Unverified |

## Smallest technical proof before commitment

In a disposable, authorized environment with test products and no live orders:

1. Establish one price-free public catalog and one proposed Shopify commerce
   boundary. Record the plan, sales channels, publication, customer-account and
   app settings actually used. Create anonymous, pending/unapproved, securely
   matched existing, approved, declined, and revoked test identities. Use a
   minimal trusted eligibility record with a manual grant and revoke; do not
   treat a claimed email, customer login, or client-supplied tag as authority.
2. For anonymous and every unapproved state, inspect raw HTML/JSON-LD, scripts,
   public catalog/API, Shopify product `.js`, predictive-search JSON, tokenless
   Storefront API, enabled channel APIs, cart responses, and direct/previously
   issued checkout links. Test known product handles and IDs, not just UI links.
   Verify zero price amounts and no order completion. Check caches and cross-user
   leakage. Test every enabled accelerated checkout and other order channel.
3. For an approved and a securely matched existing buyer, demonstrate correct
   contextual prices and an authorized test checkout. Revoke approval and
   immediately repeat price, cart, checkout, and old-link tests; document
   propagation and fail-closed behavior when the state or validation fails.
   Obtain explicit authorization before any test order.

For supported surfaces, Shopify documents validation for cart, checkout, B2B,
Storefront, and accelerated checkout; Create Order API, POS, order edits, and
some purchase-option flows are unsupported [11]. Inventory and control every
enabled order path, including any existing Order Portal, instead of assuming
Function coverage. A failed Function run permits checkout by default: configure
and test `blockOnFailure: true` [11]. The validation fetch target is limited to
custom apps on Enterprise stores with approved network access [11]; on other
plans, prove a supported, timely Shopify-side state sync rather than assuming
the Function can call an external approval database. If any unapproved price or
order path remains open, this candidate fails; investigate a different commerce
architecture rather than substituting theme hiding or a plan upgrade.

## Decisions for Brian or supervisor

1. Authorize the isolated-catalog proof and choose its owner and test budget;
   decide the launch plan only after plan capabilities and a quote are confirmed.
2. Define acceptable identity evidence and exception handling for existing
   customers, and who can approve, revoke, and audit access.
3. Decide the required revocation propagation window, enabled sales/order
   channels, and whether the existing Order Portal is in launch scope.
4. Approve application data handling, staff access, and retention before real
   submissions; keep the current pages preview-only until a real workflow exists.

## Official sources

Checked **2026-11-17**. Shopify documentation describes platform capabilities;
none of these links verifies this store's Admin settings or deployed behavior.

1. [Ajax Product API](https://shopify.dev/docs/api/ajax/reference/product).
2. [Predictive Search API](https://shopify.dev/docs/api/ajax/reference/predictive-search).
3. [Storefront API authentication and tokenless access](https://shopify.dev/docs/api/storefront/latest#authentication).
4. [Storefront Product](https://shopify.dev/docs/api/storefront/latest/objects/Product) and [ProductVariant](https://shopify.dev/docs/api/storefront/latest/objects/ProductVariant).
5. [Liquid structured_data filter](https://shopify.dev/docs/api/liquid/filters/structured_data).
6. [Building with the Storefront API](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api).
7. [Headless with B2B](https://shopify.dev/docs/storefronts/headless/bring-your-own-stack/b2b).
8. [Build apps for B2B](https://shopify.dev/docs/apps/build/b2b).
9. [Shopify pricing](https://www.shopify.com/pricing).
10. [Shopify Functions availability](https://shopify.dev/docs/apps/build/functions).
11. [Cart and Checkout Validation Function API](https://shopify.dev/docs/api/functions/latest/cart-and-checkout-validation).
12. [Headless storefronts and hosting](https://shopify.dev/docs/storefronts/headless).
13. [Horizon theme listing](https://themes.shopify.com/themes/horizon/styles/horizon); confirm actual theme license and store-transfer terms with Shopify before reuse.
