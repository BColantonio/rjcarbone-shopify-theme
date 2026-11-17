# Horizon wholesale price-protection proof

**Status: not proven.** This is a proposed experiment, not an instruction to
change the current store. No supported configuration has yet been established
that both preserves public Horizon product browsing and prevents all
unauthorized price retrieval. The [access audit](./customer-access-audit.md),
[requirements](./wholesale-registration-requirements.md), and
[decision brief](./wholesale-access-decision-brief.md) provide the background.
Basic is the reported development plan; the launch plan and actual store
configuration are unverified. Login alone is not approval.

## Baseline evidence

The new baseline requests were canceled before returning results. No result
below should be inferred from a failed, redirected, password-protected, or
unavailable request. The `127.0.0.1:9292` development proxy can use Shopify
preview authorization independently of the requesting browser; it is not the
same security boundary as the direct Shopify storefront. The direct host below
is the default in a repository script, not independently verified as the
active storefront.

| Surface and access | Evidence | Conclusion |
| --- | --- | --- |
| Local proxy product HTML, `sample-yarass10` | Earlier [variant audit](./product-variant-audit.md) observed the sample product, variant `67723176935737`, and a displayed `$9.99` in a disposable browser profile. The [search audit](./search-usability-audit.md) identifies the product handle. Browser customer login, password authorization, and proxy preview authorization were not established in that audit. | Historical preview evidence of a displayed price, not a fresh anonymous direct-store result or proof of the current configuration. |
| Local proxy product HTML and `.js` | The newly requested bounded checks returned no result because tooling was canceled. | **Blocked**; response, redirects, authorization, price fields, and JSON-LD unverified. |
| Direct `0igxkv-sp.myshopify.com` product HTML and `.js` | The newly requested bounded checks returned no result because tooling was canceled; no cookies or credentials were intentionally supplied. | **Blocked**; host identity, response, redirects, password wall, authorization, price fields, and JSON-LD unverified. |
| Predictive-search JSON and tokenless Storefront API | Not checked in this phase; no request result was collected. | **Unverified**, not protected. |
| Cart and checkout | No cart or checkout request was made in this phase. The audit identifies theme cart paths, but no current server-side authorization result. | **Unverified**. Do not create a cart or initiate checkout during this baseline. |

Shopify documents that product `.js` includes product and variant price fields
[1], predictive search can include prices [2], and the Storefront API supports
tokenless product access [3] with product and variant price fields [4].
Shopify's product `structured_data` example includes an offer price [5].
These describe possible exposure, not responses observed during this baseline.

## One decisive experiment for review

**Question:** Can a Shopify-supported B2B catalog and customer/company context,
with Horizon retained, make the actual public product endpoints price-free for
unapproved buyers while returning the correct price to an approved buyer?
Shopify documents B2B catalogs and buyer context [6, 7], but does **not**
establish that this arrangement removes all base prices from public endpoints.
The following experiment tests that gap; it is not a claim that a suitable
setting exists.

Use a disposable, authorized Shopify environment with B2B capability and a
copy of Horizon. Obtain permission and record the original settings first.
Use fictional, non-sensitive prices and test accounts only. **Do not execute
these changes in the current phase.**

1. Configure one test product with a known handle, a nonzero fictional base
   price and compare-at price, and one variant. Publish it to the Online Store
   so guests can browse its product page. Record every other enabled publication
   and channel; do not assume an unpublished channel is protected. If a password
   wall prevents public browsing, arrange a genuinely public disposable test
   environment with the owner's explicit approval; do not bypass the wall.
2. In that B2B-capable environment, create one test company and location, one
   catalog containing the product with a distinct fictional B2B price, and a
   test buyer associated with that location. Create a separate signed-in test
   customer with no approved association. Record catalog assignment, customer
   association, product publication, actual account mode, and plan. For this
   experiment only, the authorized reviewer controls the association as the
   test approval signal; a production manual approval and secure identity match
   remain to be designed.
3. First test the direct public product `.js` and tokenless Storefront API using
   a fresh session without cookies or tokens. Inspect every price, compare-at,
   and quantity-break field, including zero and base prices. If any amount is
   returned, **stop: this configuration fails**; hiding it in Horizon cannot
   repair that endpoint. A password page, 404, missing product, or request
   failure is inconclusive, not a pass. Confirm the same product can be browsed
   anonymously before interpreting the result.
4. Only if step 3 passes, use an unpublished copy of Horizon to omit
   unauthorized price/purchase markup and price-bearing structured data and
   scripts while preserving public product names, images, and navigation. This
   presentation change is part of the proposed experiment, not evidence that
   Shopify APIs are secure. Recheck product HTML/JSON-LD, scripts, `.js`,
   predictive-search JSON, tokenless API and all enabled product channels in
   each acceptance case below. Inspect raw responses, not just visible UI.
5. With separate authorization for a later order-path test, inspect direct cart,
   existing checkout links and every enabled accelerated/other order channel;
   demonstrate server-side denial for unapproved buyers and successful approved
   test checkout without placing a live order. The present phase makes no such
   requests. A checkout validation Function can block supported checkout paths,
   but cannot hide product or cart prices [8].

### Acceptance cases

| Buyer state | Required result |
| --- | --- |
| Anonymous, fresh session | Public product browsing works; no price amount in UI, HTML, structured data, scripts, product `.js`, search JSON, tokenless API, cart, checkout, or other enabled channels; ordering denied server-side. |
| Signed in but unapproved | Same as anonymous, even with a valid login. |
| Approved test buyer | Correct contextual price and intended product access; authorized test order path works. A customer session alone does not grant approval. |
| Revoked test buyer | After the reviewer removes the test association, no further unauthorized price retrieval or ordering, including from cached responses, existing sessions, carts, and previously issued links. Record and approve the propagation window; fail closed when state is uncertain. |

Treat pending and declined buyers as unapproved. Production migration must
automatically qualify existing customers only after secure identity matching;
this experiment does not establish that workflow. Record actual status, response
and buyer context without storing credentials or customer secrets.

## Resources, constraints, and rollback

- **Basic:** The reported development plan can support read-only baseline
  requests and theme-preview work, subject to access and an available preview.
  Shopify documents public App Store Functions on any plan [9], but no suitable
  app, trusted approval input, channel coverage, or fail-closed behavior has
  been established. A Function is not a confidentiality control.
- **B2B experiment:** Shopify requires a plan supporting B2B [6, 7]; its
  pricing page lists B2B catalogs under Plus [10]. The capability being tested
  is company/location catalog pricing, **not** a documented guarantee of
  endpoint confidentiality. A custom Function requires Plus [9]; its fetch
  target has further Enterprise and network-access restrictions [8]. Do not
  upgrade without a confirmed test entitlement, capability, and cost.
- **People and data:** An authorized store operator, reviewer, disposable B2B
  test environment, two test identities, a non-sensitive product and catalog,
  and a tester able to inspect raw network responses are needed. No inventory
  integration is needed; production integration awaits the external alpha.
- **Unknowns:** Whether B2B catalog context changes every anonymous endpoint;
  whether public browsing remains possible; direct-host identity and password
  status; enabled channels; current approval authority and revocation latency;
  cache behavior; and enforcement of unsupported order channels. These need
  evidence, not assumed Admin settings. Existing application/access-state
  pages remain previews.
- **Rollback after an approved experiment:** Restore recorded publication and
  channel assignments, account/company/catalog associations, and original
  theme selection; remove or archive only explicitly created test objects per
  the owner's retention policy. Verify the prior state and invalidate test
  sessions/caches where supported. Do not alter production data or publish a
  theme merely to run the test.

## Go / no-go

**Go for retaining Horizon only** when the same documented, repeatable
configuration passes every acceptance case on all enabled price and order
surfaces, including direct Shopify endpoints and revocation, with public
browsing intact. A sampled pass is not proof of untested channels. **No-go for
this configuration** if an unapproved response contains any price, an
unapproved order can proceed, approved access fails, or public browsing is
lost. Blocked requests, password walls, missing products, and untested channels
are **inconclusive** and prevent a launch decision. A failed configuration does
not prove all possible Horizon architectures impossible.

## Official sources

Reviewed **2026-11-17** in the preceding decision-brief research; no new
network checks were completed in this phase.

1. [Ajax Product API](https://shopify.dev/docs/api/ajax/reference/product).
2. [Predictive Search API](https://shopify.dev/docs/api/ajax/reference/predictive-search).
3. [Storefront API authentication and tokenless access](https://shopify.dev/docs/api/storefront/latest#authentication).
4. [Storefront Product](https://shopify.dev/docs/api/storefront/latest/objects/Product) and [ProductVariant](https://shopify.dev/docs/api/storefront/latest/objects/ProductVariant).
5. [Liquid structured_data filter](https://shopify.dev/docs/api/liquid/filters/structured_data).
6. [Headless with B2B](https://shopify.dev/docs/storefronts/headless/bring-your-own-stack/b2b) — documented B2B context; this proposal does not require headless.
7. [Build apps for B2B](https://shopify.dev/docs/apps/build/b2b).
8. [Cart and Checkout Validation Function API](https://shopify.dev/docs/api/functions/latest/cart-and-checkout-validation).
9. [Shopify Functions availability](https://shopify.dev/docs/apps/build/functions).
10. [Shopify pricing](https://www.shopify.com/pricing).
