# Wholesale registration and access requirements

This document records confirmed business requirements, the current prototype
boundary, and a proposed Shopify access model. It is not an implementation or
an approval policy.

## Confirmed requirements

- Visitors may browse product names, photos, and categories.
- Only approved customers may see prices or place orders.
- Signing in alone does not constitute approval.
- Wholesale applications are emailed to the supervisor for manual research and
  approval.
- Supervisor approval is required before an applicant can see prices or place
  orders.
- Existing wholesale customers must be migrated into the approved access model.
- Credit-card authorization remains pending.

This document interprets “prices” strictly to include any visible or
machine-readable product, variant, compare-at, or quantity-break amount. If the
business only means wholesale prices (and permits public retail prices), confirm
that narrower requirement before choosing an architecture.

The current `page.wholesale-application-preview` template is preview-only. It
does not send applications or create accounts. The supervisor email workflow,
application handling, customer migration, and access enforcement are not
implemented by that prototype.

## Recommended access model

Use supervisor approval as the business decision and Shopify B2B
company-location assignment as the proposed access grant, not customer
sign-in alone:

1. Route application details to the supervisor for manual research.
2. Do not grant B2B access while an application is pending or declined.
3. After approval, add or migrate the eligible customer to the appropriate
   Shopify B2B company location.
4. Use B2B catalogs for approved customers' actual prices and product
   availability.
5. Keep the storefront publicly browseable. Do **not** enable Shopify's
   store-wide “Restrict access to B2B customers only” setting: Shopify says it
   prevents non-B2B visitors from browsing.
6. Keep the existing Order Portal intact and treat its access control as a
   separate integration unless the business confirms that it is in scope.

The smallest Shopify-native candidate is a public B2B storefront with customer
accounts, supervisor approval before assigning customers to company locations,
and B2B catalogs. Shopify documents that a B2B storefront can be publicly
browseable while B2B-specific pricing and products are available to logged-in
B2B customers. However, this theme currently emits price-bearing structured
data, and Shopify also documents public product/search APIs with price fields.
The official documentation does not establish that every such response omits
all prices for an anonymous or non-B2B visitor. Therefore, native B2B plus
theme changes is **not yet verified to satisfy the strict no-price-exposure
requirement**.

For ordering, add server-side cart and checkout validation that denies buyers
without the approved B2B company-location context. Shopify's Cart and Checkout
Validation Function API documents support for cart, checkout, B2B, and
accelerated checkout, including Shop Pay, PayPal, Google Pay, and Apple Pay.
This closes a purchase-path gap; it does not protect price data returned by
product pages or APIs.

**Recommendation:** First validate the public B2B storefront against the
unauthenticated price-exposure checks below and prove the approval context is
available to server-side checkout validation. Use a public app containing a
Cart and Checkout Validation Function if one meets the requirements (Functions
in public apps are available on any Shopify plan); a custom app containing
Functions requires Shopify Plus. If any unapproved visitor can retrieve any
price, do not treat that setup as compliant. The fallback is to keep
price-bearing Shopify products out of public product/search/API surfaces and
provide a separate public, non-price catalog plus authenticated B2B pricing
and ordering. That fallback requires custom app/backend or storefront work;
Shopify Functions alone cannot hide prices.

### 1. Theme visibility controls

The theme can conditionally omit visible prices and purchase controls for
visitors who are not in the approved B2B context. Apply that presentation
consistently to cards, search, predictive search, product pages, price-break
tables, Quick Add, quick order lists, cart, and checkout buttons.

This is a display control only. Liquid conditions, CSS hiding, disabled
buttons, and JavaScript do not secure price data or prevent a direct cart or
checkout request. They must not be described as secure price restriction.

### 2. Price exposure outside visible theme markup

Shopify's official API references document price-bearing public surfaces:

- The Ajax Product API `/{locale}/products/{handle}.js` response includes
  product and variant price fields.
- Predictive Search `/{locale}/search/suggest.json` product results include
  `price`, `price_min`, `price_max`, and variant prices.
- Shopify's Storefront API supports tokenless access to products and
  collections; its Product and ProductVariant types expose price fields such
  as `priceRange` and `price`.
- Shopify's Liquid `structured_data` filter outputs product schema.org data.
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

Shopify's Cart and Checkout Validation Function API is the documented
server-side mechanism for validating a cart and checkout. Configure the rule
to allow purchase only when the buyer has the approved B2B company-location
context; unauthenticated or unassigned buyers must be blocked. Verify that the
company/location assignment is changed only after supervisor approval and is
the authoritative access grant.

The current API documentation lists Cart, Checkout, B2B, Storefront, and
Storefront Accelerated Checkout as supported. It explicitly includes express
checkouts such as Shop Pay, PayPal, Google Pay, and Apple Pay. Public apps
containing Functions are available on any Shopify plan; custom apps containing
Functions require Plus. The API does not cover every Shopify surface: Shopify
lists POS, Admin Order Create API, order edits, and some purchase-option flows
as unsupported. This request targets online orders; any additional channel
must be assessed separately. Shopify's B2B account guidance also warns that
Shop app purchases might begin checkout without sign-in in some restricted
store configurations. Test Shop app and each enabled accelerated checkout
with an unapproved buyer; the server rule must reject the order if approved
company-location context is absent.

The Function must validate the actual authenticated buyer/company context,
not a client-supplied tag, form value, or theme state. A checkout Function
blocks an order; it does not make product prices confidential. Theme purchase
controls should still be hidden for usability, while the server rule remains
the enforcement boundary.

## Plan and account dependencies

Shopify B2B is available on Basic, Grow, Advanced, and Plus, but not Starter
or Retail. B2B customer access requires customer accounts; Shopify's B2B
guidance says legacy customer accounts aren't supported. In a blended store,
an ordinary customer can sign in and receive the D2C experience. Signing in
does not by itself mean the customer was researched or approved.

Catalog options vary by plan:

- Basic, Grow, and Advanced require new Shopify Markets for B2B catalogs and
  allow up to three active catalogs across B2B markets. Catalogs are assigned
  to B2B markets, not directly to a company or location.
- Plus supports unlimited B2B market catalogs and direct catalog assignment
  to companies or company locations.

No Shopify plan has been selected. Verify the current plan, Markets setup,
store type, catalog needs, and checkout/account configuration before selecting
an approach.

## Existing-customer migration

Migration is required for existing wholesale customers who are determined
eligible to retain wholesale access. Do not treat every customer profile or
historical purchaser as automatically eligible. The supervisor's research and
approval process should determine the eligible cohort before migration.

Shopify documents migrating existing D2C customers to B2B companies, with an
option to include their eligible order history. The documented process moves
full eligible D2C order history rather than selected orders; canceled or
deleted orders can't be migrated, and B2B orders remain with their original
company. Whether to migrate history, tax exemptions, and which customer
records meet the business's eligibility criteria need confirmation.

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

- **Price-access requirement (pending supervisor/team decision):** which
  interpretation is required?
  1. **Normal browsing restriction:** visitors can browse products, photos,
     and categories, and see “Sign in for pricing”; customers who are not
     approved cannot order.
  2. **Strict price confidentiality:** in addition to hiding prices in the
     storefront, prices must be inaccessible through public APIs, product-data
     URLs, search responses, and structured data.

  The confirmed requirement that only approved customers may order applies
  under either interpretation and is not pending. This choice may affect the
  Shopify plan, apps, and overall architecture; no option is selected. For the
  strict option, verify anonymous and signed-in-but-unapproved responses for
  product JSON, predictive search, structured data, and tokenless Storefront
  API. Any exposed price fails that requirement.
- **Store model:** dedicated wholesale-only store or blended B2B/D2C storefront?
  A blended store normally continues to serve the D2C experience to
  non-B2B customers, which fails the strict rule if that includes retail
  prices.
- **Shopify plan and Markets:** which plan is selected, and is new Shopify
  Markets enabled if using B2B catalogs on Basic, Grow, or Advanced?
- **Approval source of truth:** where is the supervisor's approval decision
  recorded, who can record/change it, and what exact state enables or revokes
  Shopify company/location access? Shopify company assignment is the proposed
  access state, but the business has not confirmed it as the formal approval
  record.
- **Migration eligibility:** which existing customer records qualify, how to
  handle duplicates/shared email addresses and multiple locations, and whether
  historical orders or tax exemptions should migrate?
- **Application email:** which supervisor mailbox receives applications, what
  form fields may be sent by email, and what record/retention process tracks
  pending, approved, and declined cases? The current prototype sends nothing.
- **Catalog/pricing:** one common wholesale catalog or differentiated customer
  or company-location pricing? Confirm whether Shopify native quantity breaks
  replace the custom display-only metafield table.
- **Enforcement scope:** confirm that only online orders are in scope, or
  whether POS, Admin-created orders, order edits, and the Order Portal also
  need restrictions.
- **Credit-card authorization:** requirements, timing, and an approved
  payment-provider workflow remain pending. Do not collect card numbers or CVV
  in this application.
- **Other application data:** document types, requiredness, approval criteria,
  secure storage, and staff access remain pending decisions.

## Official Shopify references

- [Shopify B2B features by plan](https://help.shopify.com/en/manual/b2b/getting-started/plan-features)
- [Choosing a blended or dedicated B2B store](https://help.shopify.com/en/manual/b2b/getting-started/store-type)
- [B2B sign-in, accounts, and store access restrictions](https://help.shopify.com/en/manual/b2b/customer-login-and-accounts)
- [Adding customers to B2B companies and locations](https://help.shopify.com/en/manual/b2b/companies-and-customers/adding-customers)
- [Migrating customer data to Shopify B2B](https://help.shopify.com/en/manual/b2b/getting-started/migrating-customers)
- [B2B catalogs and pricing](https://help.shopify.com/en/manual/b2b/catalogs/creating-catalogs)
- [Cart and Checkout Validation Function API](https://shopify.dev/docs/api/functions/latest/cart-and-checkout-validation)
- [Shopify Functions availability](https://shopify.dev/docs/apps/build/functions)
- [Shopify Ajax Product API](https://shopify.dev/docs/api/ajax/reference/product)
- [Shopify Predictive Search API](https://shopify.dev/docs/api/ajax/reference/predictive-search)
- [Storefront API authentication and tokenless access](https://shopify.dev/docs/api/storefront/latest#authentication)
- [Storefront API Product object](https://shopify.dev/docs/api/storefront/latest/objects/Product)
- [Storefront API ProductVariant object](https://shopify.dev/docs/api/storefront/latest/objects/ProductVariant)
- [Liquid `structured_data` filter](https://shopify.dev/docs/api/liquid/filters/structured_data)
