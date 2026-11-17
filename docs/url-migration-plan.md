# URL migration plan

This is a planning document, not a configured redirect list. Keeping
`rjcarbone.com` does not preserve its existing paths when traffic moves to
Shopify. The [link and redirect audit](./storefront-link-and-redirect-audit.md)
records source and development-preview evidence; it did not test production
redirects or the external portal. No legacy-to-Shopify redirect is confirmed
as configured.

## Observed routes and proposed destinations

The following legacy department and category URLs are recorded in the source
review; the corresponding Shopify collections were checked in the development
preview. These are **proposals**, not confirmed production mappings:

| Observed legacy URL | Proposed Shopify destination |
| --- | --- |
| `/gallery?category=F` | `/collections/flowers` |
| `/gallery?category=R` | `/collections/roses` |
| `/gallery?category=G` | `/collections/greens` |
| `/gallery?category=P` | `/collections/plants` |
| `/gallery?category=F&productItem=FALS` | `/collections/alstroemeria` |
| `/gallery?category=S&productItem=SAD` | `/collections/adhesives` |

For other category URLs, review the exact `sourceUrl` and `handle` pairs in
[floral department records](../scripts/floral-departments-review.json) and
[supplies records](../scripts/supplies-collections.json), including flagged
ambiguities, and verify each final collection in the target store. These
`productItem` values identify categories in those records, not individual
products. The preview has `/collections/supplies`, but the audit did not
observe a standalone legacy `/gallery?category=S` root; do not invent one.

**Informational routes:** `/pages/contact` and `/pages/weekly-specials` are
Shopify destinations checked in the development preview, but the reviewed
evidence does not establish corresponding legacy page URLs. Find and verify
old links and content before proposing redirects. The current “Floral Event
Space” tile points to the legacy `/uploads/weeklyspecialpdf217.pdf`; its
content and intended destination are unverified, so no redirect is proposed.
See the [audit](./storefront-link-and-redirect-audit.md#unverified-destinations-and-launch-follow-up).

## Individual products: mapping unknown

Do not infer individual product redirects from category codes, names, SKUs, or
the preview sample product. The inventory integration must establish stable,
authoritative legacy product and sellable-variant identifiers and their
unambiguous Shopify product and variant ID mappings; SKUs are not established
as unique or immutable. Inventory the actual legacy product URLs, then verify
published target handles and any variant-specific behavior before proposing
redirects. See [inventory integration requirements](./inventory-integration-requirements.md#field-and-behavior-requirements).

## Retain the Order Portal and legacy dependencies

The existing links must continue to reach the legacy application after cutover:

- The header's `https://www.rjcarbone.com/orderportal` landing route.
- `/OrderPortal/Order?catalogId=8` and `/OrderPortal/Order?catalogId=7`,
  linked from the homepage carousel; retain the catalog query parameters.

The portal's external behavior was not tested in the audit. Identify and test
its authentication, sessions, ordering, and any dependent routes and resources
with the application owner; their implementation and access policy are not
established by this repository. Do not assume Shopify redirects can host or
proxy the portal, or that Shopify and portal eligibility are equivalent.

The storefront also depends on legacy `/uploads/` images and the Weekly
Specials `GET /api/weekly-specials.ashx` feed and returned flyer images. The
feed needs an approved HTTPS legacy origin and an exact storefront-origin CORS
allowlist; deployment and live behavior are unverified. The PDF above and the
third-party Dutch Fresh Direct login also require destination review. See the
[legacy hostname requirement](./legacy-hostname-launch-requirement.md) and
[feed deployment notes](../tools/weekly-specials-feed-companion/README.md#eventual-deployment-outline).

## Open hosting and routing decisions

- The existing launch requirement calls for a separate, TLS-enabled legacy
  hostname before cutover, but its name and configuration are not selected.
  The site/hosting team must confirm whether it will serve the portal and all
  dependent resources, and how existing apex and `www` links will reach it
  after those hostnames move to Shopify. A separate hostname alone does not
  preserve old links; approve and test an actual routing or redirect mechanism.
- The department proposals share `/gallery` and differ by query string. A
  path-only rule cannot distinguish them: select and verify a query-aware
  routing layer for the old hostnames, if feasible, or explicitly decide how
  those links will be handled. Do not assume Shopify redirects provide this
  behavior or proxy the legacy application.
- Decide how unknown paths, unmatched category IDs, and extra query parameters
  are handled without silently sending them to the homepage. Confirm the
  intended informational destinations, production collection availability,
  portal access policy, ownership, and rollout/rollback procedure before
  approving rules. The broader launch dependencies remain in the
  [readiness checklist](./launch-readiness-checklist.md).

## Cutover verification checklist

- [ ] In an authorized staging/cutover environment, follow representative
	  bookmarked and linked old department and informational URLs on both
	  relevant hostnames; record status, redirect chain, and final content.
- [ ] Test approved exact category mappings, query-parameter order and extra
	  parameters, unmatched IDs, and unknown paths; confirm no unintended
	  homepage fallback. Verify product mappings only after inventory approval.
- [ ] Follow the portal landing and both catalog links from old bookmarks and
	  storefront navigation; verify query strings, TLS, login/session and
	  authorized ordering flows, plus identified dependent resources.
- [ ] Verify legacy images, the event-space destination decision, Weekly
	  Specials feed and flyer URLs, and allowed/disallowed CORS origins. Record
	  results and retain a tested rollback path before completing cutover.
