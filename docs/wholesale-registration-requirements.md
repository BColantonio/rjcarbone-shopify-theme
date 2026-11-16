# Wholesale registration and access requirements

This document records confirmed business requirements, the current prototype
boundary, and a proposed Shopify access model. It is not an implementation or
an approval policy.

## Confirmed requirements

- Visitors and unapproved accounts may browse product names, photos, and
  categories, but must not see any prices or place orders.
- Signing in alone does not constitute approval.
- Price confidentiality covers HTML, structured data, JavaScript payloads,
  and publicly accessible APIs, including product, variant, compare-at, and
  quantity-break amounts.
- Brian or his supervisor reviews applications. Approval and revocation are
  manually decided case by case; pending, declined, and revoked buyers do not
  have price or ordering access.
- Existing customers automatically qualify for access, subject to securely
  matching their identities to existing customer records. A login or a claimed
  email alone is not proof of such a match.
- Credit-card authorization remains pending.

The current `page.wholesale-application-preview` template is preview-only. It
does not send applications or create accounts. The future application workflow,
application handling, customer migration, and access enforcement are not
implemented by that prototype. Brian or his supervisor's review is a future
workflow, not a feature of the preview.

## Wholesale application prototype fields

The preview reuses its existing business name, contact first and last names,
business email, business phone, business address, city, state, ZIP, country,
prior-purchase question, merchandise-interest options, and business-location
type. The merchandise options now describe the products the applicant intends
to purchase from Carbone.

The prototype adds fields for products the applicant's business sells, retail
or sales-tax permit number and issuing state, business type (including an
"Other" detail field), authorized buyers, business organization structure and
its applicable names, owner/principal officer home contact details, business
fax, and applicant name/title/date. Home contact fields are presented
separately from purchasing-firm details. Organization-specific fields appear
only for the selected corporation, partnership, or sole-proprietorship
structure. The typed-name acknowledgment and automatically displayed local date
are for the preview only; neither constitutes a legally valid electronic
signature or authoritative timestamp. The production backend must generate the
authoritative acknowledgment timestamp.
No fields reserved for Carbone staff completion are included.

Required-field rules for the newly added fields are pending team confirmation;
they are optional in this prototype. The existing required fields remain
unchanged. Identification and resale-certificate selections in the prototype
are optional pending team confirmation. They accept PDF, JPEG, and PNG sample
files up to 10 MB each, held in page memory only and never uploaded or saved.
The browser's file type and size checks do not replace production server
validation. Secure upload, storage, retention, and staff-access implementation
remain pending; production must define and enforce those controls before
collecting real documents.

## Recommended access model

### Architecture assessment

| Candidate | Price confidentiality | Server-side ordering | Assessment |
| --- | --- | --- | --- |
| Current public product theme plus Liquid/CSS/JavaScript hiding | Price-bearing product JSON, search, Storefront API, structured data, and payloads are separate surfaces. Hiding markup or buttons does not protect them. | Direct requests and checkout remain outside theme UI controls. | Not compliant by itself. |
| Public native B2B storefront with catalogs and a validation Function | Shopify documents B2B pricing and company/location context, not a guarantee that every public or unapproved response contains no price. A public retail amount also fails the requirement. | A supported validation Function can reject an unapproved checkout, subject to identity, input, failure behavior, and channel tests below. | Candidate only if all price and authorization tests pass; no proof that this store meets them. |
| Separate public, price-free browse catalog plus isolated authenticated commerce | A public catalog containing only names, images and categories avoids exposing prices through that catalog. Price-bearing Shopify products, search, cart and API channels must also be isolated from anonymous and unapproved access; this isolation is not established by Shopify docs or by a separate UI alone. | A trusted server checks the current approval on price/order requests; Shopify checkout also needs independent server-side enforcement. | Smallest architecture to investigate that does not depend on hiding public Shopify prices. Requires backend/app and a proof-of-concept; not yet demonstrated viable end to end. |
| Separate restricted Shopify store plus a public price-free catalog | Public browse and commerce are separated, but restrictions on Shopify product APIs, cart, checkout URLs and channel publication must be independently proven; a shared password or sign-in alone is not individual approval. | The commerce store still needs current per-buyer authorization and validated checkout restrictions. | Possible alternative, not a verified guarantee; added store and integration costs/configuration. |

**Recommended next step:** Prototype the separate price-free public catalog and
authenticated commerce boundary in a disposable, authorized environment. Keep
the public catalog free of price-bearing Shopify product resources and payloads;
do not assume that merely unpublishing a product or keeping a Storefront API
token secret protects every other sales channel or checkout URL. Before choosing
this candidate, prove that approved users can obtain correct prices and order
while anonymous, unapproved, pending, and revoked users cannot retrieve prices
or order through any enabled Shopify or application surface. If Shopify cannot
isolate the commerce surfaces, a different backend/commerce architecture is
needed; theme changes and a validation Function alone are not a fallback.

The candidate needs a protected backend/app, a current server-side eligibility
record, secure customer matching and review operations, price-free public data,
and a Shopify-supported validation app. B2B company/location and catalogs are
possible commerce inputs, not an already configured approval signal. Confirm
their semantics, plan requirements, and whether the Function can read the chosen
authoritative state. Keep the existing Order Portal unchanged; its eligibility
and inclusion in enforcement scope still require a decision.

### 1. Theme visibility controls

The theme can conditionally omit visible prices and purchase controls for
visitors who are not in the approved B2B context. Apply that presentation
consistently to cards, search, predictive search, product pages, price-break
tables, Quick Add, quick order lists, cart, and checkout buttons.

This is a display control only. Liquid conditions, CSS hiding, disabled
buttons, and JavaScript do not secure price data or prevent a direct cart or
checkout request. They must not be described as secure price restriction.

### 2. Price exposure outside visible theme markup

Shopify's official API references document price-bearing public surfaces;
these documented capabilities are verified, but their responses in this store
and each proposed publication/channel configuration have not been tested:

- The [Ajax Product API](https://shopify.dev/docs/api/ajax/reference/product)
  `/{locale}/products/{handle}.js` response includes
  product and variant price fields.
- [Predictive Search](https://shopify.dev/docs/api/ajax/reference/predictive-search)
  `/{locale}/search/suggest.json` product results include
  `price`, `price_min`, `price_max`, and variant prices.
- Shopify's [Storefront API](https://shopify.dev/docs/api/storefront/latest#authentication)
  supports tokenless access to products and collections; its
  [Product](https://shopify.dev/docs/api/storefront/latest/objects/Product) and
  [ProductVariant](https://shopify.dev/docs/api/storefront/latest/objects/ProductVariant)
  types expose price fields such as `priceRange` and `price`.
- Shopify's Liquid [`structured_data` filter](https://shopify.dev/docs/api/liquid/filters/structured_data)
  outputs product schema.org data.
  Its documented example includes `Offer.price` and `priceCurrency`. This
  theme renders `structured_data` on product pages and featured-product pages
  in `sections/product-information.liquid`,
  `sections/featured-product-information.liquid`, and
  `sections/featured-product.liquid`.

These interfaces can expose amounts even when a theme hides its visual price
element. Shopify's B2B guidance describes B2B-specific pricing access but does
not promise that all public API responses, search results, or structured data
omit every price for unapproved visitors. Test anonymous and signed-in but
unapproved sessions directly against product `.js`, predictive-search JSON,
product-page source/JSON-LD, and tokenless Storefront API responses. Test
approved sessions separately to confirm the correct catalog price. Any amount
returned to an unapproved visitor fails the strict requirement.

Do not rely on `noindex`, removing a price from visible HTML, or search-engine
cache refreshes to protect a price. Search engines and other clients can read
the underlying response data.

### 3. Server-enforced purchasing restrictions

Shopify's [Cart and Checkout Validation Function API](https://shopify.dev/docs/api/functions/latest/cart-and-checkout-validation) is the documented
server-side mechanism for validating cart and checkout. A candidate rule must
reject absent, unapproved, pending, declined, and revoked buyers using a
trusted current state, not just customer sign-in. Its documented input includes
`cart.buyerIdentity.purchasingCompany` and company location, but company
assignment alone is an approval signal only if the team explicitly makes it
authoritative and proves the correct assignment and revocation behavior.

The current API documentation lists Cart, Checkout, B2B, Storefront, and
Storefront Accelerated Checkout as supported. It explicitly includes express
checkouts such as Shop Pay, PayPal, Google Pay, and Apple Pay. Public apps
containing Functions distributed through the Shopify App Store can be used on
any plan; custom apps containing Functions require Plus, with some capabilities
subject to further restrictions ([Functions availability](https://shopify.dev/docs/apps/build/functions)). Shopify lists POS, Admin Order Create API,
order edits, and some purchase-option flows as unsupported. Test Shop app and
each enabled accelerated checkout with an unapproved buyer, and separately
assess every other enabled order channel. Function input does not identify the
originating channel, and theme cart attributes are not reliable in accelerated
checkout; assess unintended effects on other supported channels.

Shopify documents that a failed Function run permits checkout by default;
configure and test `blockOnFailure: true` when creating the validation, along
with monitoring and failure recovery. The validation fetch target is limited
to custom apps on Enterprise stores and requires approved network access
([validation API](https://shopify.dev/docs/api/functions/latest/cart-and-checkout-validation)); do
not assume it can query an external approval database on other plans. Prove a
supported, timely Shopify-side state synchronization and fail-closed revocation
path instead, or choose another architecture. Client-supplied values are not
authority. A Function can block checkout; it does not hide product or cart
prices or prove a direct cart request cannot expose them.

## Plan and account dependencies

The user reports that the current development plan is **Basic**. The launch
plan will be reevaluated before launch; this report is not an independent Admin
verification or proof of a particular enforcement capability. The inspected
repository does not establish the customer-account type or enabled state,
Markets, publication channels, installed apps, or validation configuration.
`snippets/header-actions.liquid`
branches on `shop.customer_accounts_enabled` at render time and `customer` for
presentation; neither reveals the Admin values or grants approval. The theme's
account-menu setting is not evidence of an account configuration or plan.

Shopify's accessible [B2B developer documentation](https://shopify.dev/docs/apps/build/b2b)
states that the plan must support B2B capabilities. Its
[Functions documentation](https://shopify.dev/docs/apps/build/functions) states
the public-app versus custom-app plan distinction above. The
[B2B plan-features](https://help.shopify.com/en/manual/b2b/getting-started/plan-features)
and [customer-account](https://help.shopify.com/en/manual/b2b/customer-login-and-accounts)
Help pages could not be verified in this environment (Help returned HTTP 403
for the plan page). Do not rely on an exact B2B tier, catalog limit, or account
mode until Shopify documentation and this store's Admin are confirmed. Confirm
the actual plan, account mode, Markets/catalog capabilities, channels, checkout
settings, installed Functions, and B2B eligibility in Admin before design or
deployment. No Admin access or settings changes were performed for this audit.

## Existing-customer migration

Existing customers automatically qualify once their identity is securely
matched to an existing customer record; do not require a separate discretionary
approval simply because an existing customer is migrating. Define the record
scope and authoritative legacy sources, proof of identity, and an exception
process for resolving unverified, duplicate, shared-email, or multi-location
matches. This process establishes the match, not discretionary reapproval of
an existing customer. Do not grant access on an unverified claim or mere sign-in.

Record the match and grant in an auditable authoritative system; synchronize
any required Shopify eligibility context. Manual case-by-case revocation by an
authorized operator must remove effective access across the backend, Shopify
checkout, sessions, carts, cached responses, and enabled channels, with a
defined propagation window and fail-closed behavior while state is uncertain.
Test previously issued cart/checkout links after revocation. Revocation cannot
erase prices a previously approved user already copied; it must prevent future
unauthorized retrieval and orders.

The previously cited Shopify migration guidance describes migrating existing
D2C customers to B2B companies and may support migrating order history. Its
current details could not be verified in this environment; confirm the
available migration operations, their effects on history and tax exemptions,
and the secure matching procedure before migrating anything.

## Theme pricing and order surfaces

The current theme renders prices and purchase controls without an
approved-customer condition. These are presentation and interaction surfaces;
changing them can improve the UI but cannot enforce price confidentiality or
authorization on Shopify's cart or checkout.

| Surface | Existing theme source | What it currently renders |
| --- | --- | --- |
| Collection/product cards, featured products, recommendations, and other product resource cards | `snippets/product-card.liquid`, `snippets/resource-card.liquid`, `snippets/price.liquid`, `sections/section-rendering-product-card.liquid` | Product links, prices, and in some contexts Quick Add. Price output is not conditioned on approval. |
| Search results | `templates/search.json`, `snippets/resource-card.liquid`, `snippets/price.liquid` | Product result cards and prices use the same shared card/price rendering. |
| Predictive search and recently viewed results | `sections/predictive-search.liquid`, `snippets/predictive-search-products-list.liquid`, `snippets/resource-card.liquid` | Product result cards, links, and prices. Hiding only the full search page would miss this dropdown. |
| Product detail pages | `sections/product-information.liquid`, `blocks/price.liquid`, `snippets/price.liquid` | Selected-variant price, variant-dependent content, and purchase controls. The sticky add-to-cart path also renders a price and button in `sections/product-information.liquid`. |
| Native quantity/volume price breaks | `blocks/buy-buttons.liquid`, `snippets/quantity-selector.liquid`, `snippets/volume-pricing-info.liquid` | Shopify variant quantity price breaks and quantity guidance. The theme displays the break data available to it. |
| Custom quantity-price table | `blocks/quantity-price-table.liquid`, `snippets/quantity-price-table.liquid` | A display-only table from `custom.quantity_price_breaks`. Its own documentation states these values do not alter cart or checkout prices. |
| Quick Add | `snippets/quick-add.liquid`, `assets/quick-add.js`, `assets/product-form.js` | Product forms can add available variants to cart; choose-options buttons open the Quick Add flow. Hiding card buttons alone does not prevent cart requests. |
| Quick order list | `sections/quick-order-list.liquid` | Variant quantities and computed prices with direct add/update controls. It is an additional purchasing surface to include in access testing. |
| Cart and cart drawer | `sections/main-cart.liquid`, `sections/cart-drawer-section.liquid`, `snippets/cart-products.liquid`, `snippets/cart-summary.liquid` | Cart line prices, quantities, totals, and checkout buttons. These display Shopify cart data and are not an authorization boundary. |
| Checkout and accelerated checkout | Cart checkout button in `snippets/cart-summary.liquid`, product purchase flow in `blocks/buy-buttons.liquid`, accelerated checkout in `blocks/accelerated-checkout.liquid` | Shopify-hosted checkout and accelerated checkout. Theme visibility can suppress rendered buttons, but cannot by itself stop direct cart/checkout routes or enforce server-side eligibility. |

The shared price snippet is a useful location for consistent theme visibility
rules, and shared card/search/Quick Add rendering is where related presentation
changes can be kept coherent. The public browsing requirement means product
names, photos, and categories remain available, but prices must not. The
public price-bearing endpoints and `structured_data` output above need
independent verification; hiding shared Liquid markup alone is not sufficient.

## Decisions still needed

- **Store model and proof:** which isolated commerce architecture can keep
  every unapproved response price-free while supporting approved buyers and
  public browsing? Test API, cart, checkout and enabled channel exposure.
- **Shopify plan and accounts:** what plan, account mode, Markets, catalog,
  app and publication settings actually exist, and what capabilities and
	costs apply to the selected candidate? Development is reported as Basic;
  reevaluate and confirm the launch plan before launch.
- **Approval source of truth:** where are manual decisions recorded, which
  operators can grant or revoke access, and how do a trusted
  backend and Shopify validation receive and revoke the current state?
  Company/location assignment is a candidate, not an agreed approval record.
- **Migration matching:** which records constitute existing customers, what
  proof securely links a person to a record, how are ambiguous or shared
  identities handled, and should history or tax exemptions migrate? Eligibility
  after a secure match is already confirmed, not a new approval decision.
- **Application email:** which mailbox receives applications for Brian or his
  supervisor, what
  form fields may be sent by email, and what record/retention process tracks
  pending, approved, and declined cases? The current prototype sends nothing.
- **Catalog/pricing:** one common wholesale catalog or differentiated customer
  or company-location pricing? Confirm whether Shopify native quantity breaks
  replace the custom display-only metafield table.
- **Other order channels:** inventory POS, Admin-created orders, order edits,
  the Order Portal, and other enabled paths; determine and prove appropriate
  controls for each, since a checkout Function does not cover all of them.
- **Credit-card authorization:** requirements, timing, and an approved
  payment-provider workflow remain pending. Do not collect card numbers or CVV
  in this application.
- **Address autocomplete and full-address verification (pending pre-launch):**
  check street, city, state/region, postal code, and country together; suggest
  corrections when the address cannot be verified as entered; and allow manual
  entry flagged for supervisor review when verification is unavailable or
  unsuccessful. Provider, costs, credentials, and backend integration remain
  undecided. The current form checks address-field formats only and does not
  verify addresses.
- **Other application data:** document types, requiredness, approval criteria,
  secure storage, and staff access remain pending decisions.

## Official Shopify references

The developer documentation below was retrieved for this assessment. The
Shopify Help Center plan page returned HTTP 403 here; Help Center links remain
for follow-up and their current details require verification.

- [Shopify B2B features by plan](https://help.shopify.com/en/manual/b2b/getting-started/plan-features)
- [Choosing a blended or dedicated B2B store](https://help.shopify.com/en/manual/b2b/getting-started/store-type)
- [B2B sign-in, accounts, and store access restrictions](https://help.shopify.com/en/manual/b2b/customer-login-and-accounts)
- [Adding customers to B2B companies and locations](https://help.shopify.com/en/manual/b2b/companies-and-customers/adding-customers)
- [Migrating customer data to Shopify B2B](https://help.shopify.com/en/manual/b2b/getting-started/migrating-customers)
- [B2B catalogs and pricing](https://help.shopify.com/en/manual/b2b/catalogs/creating-catalogs)
- [Cart and Checkout Validation Function API](https://shopify.dev/docs/api/functions/latest/cart-and-checkout-validation)
- [Shopify Functions availability](https://shopify.dev/docs/apps/build/functions)
- [Shopify Functions network access](https://shopify.dev/docs/apps/build/functions/network-access)
- [Shopify B2B developer overview](https://shopify.dev/docs/apps/build/b2b)
- [Shopify Ajax Product API](https://shopify.dev/docs/api/ajax/reference/product)
- [Shopify Predictive Search API](https://shopify.dev/docs/api/ajax/reference/predictive-search)
- [Storefront API authentication and tokenless access](https://shopify.dev/docs/api/storefront/latest#authentication)
- [Storefront API Product object](https://shopify.dev/docs/api/storefront/latest/objects/Product)
- [Storefront API ProductVariant object](https://shopify.dev/docs/api/storefront/latest/objects/ProductVariant)
- [Liquid `structured_data` filter](https://shopify.dev/docs/api/liquid/filters/structured_data)
