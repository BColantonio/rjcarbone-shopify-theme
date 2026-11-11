# Storefront link and redirect audit

Audit date: 2026-11-11

This audit records source findings separately from development-preview checks.
No Shopify pages, admin menus, redirects, DNS, or external destinations were
changed. No clear broken internal theme link was confirmed, so no theme-code
link change was needed.

## Confirmed issues and fixes

| Finding | Evidence | Action |
| --- | --- | --- |
| The legacy-host launch checklist listed the two homepage carousel Order Portal order links but omitted the separate header Order Portal landing route. | The development preview's desktop and mobile header menus render `https://www.rjcarbone.com/orderportal`; the carousel links use `/OrderPortal/Order?catalogId=8` and `?catalogId=7`. | Updated [legacy-hostname-launch-requirement.md](./legacy-hostname-launch-requirement.md) to include the landing route and require its verification on the separate legacy hostname. |
| The homepage promo tile labeled “Floral Event Space” links to `https://www.rjcarbone.com/uploads/weeklyspecialpdf217.pdf`. The link label and PDF filename do not establish that this is the intended destination. | Present in `templates/index.json` and rendered in the preview. The PDF content and the correct event-space destination were not verified. | No destination was substituted. Confirm the PDF contents and intended event-space URL with the site owner before launch; then update the theme setting only to a verified destination. |

No missing internal page, bad internal handle, placeholder target, or broken
collection-context link was confirmed in the development preview. Potentially
misspelled category handles (for example `astillbe` and `dalhias`) were left as
configured because their destinations resolve and no verified replacement
handles were found.

## Source inspection

- The homepage department tiles and active header menu point to the five
  department collections: `/collections/flowers`, `/collections/roses`,
  `/collections/greens`, `/collections/plants`, and `/collections/supplies`.
- Homepage destinations include the Shopify Weekly Specials page, Contact
  page, and the preview-only wholesale application route. Favorites links use
  `/pages/favorites?view=favorites`. The theme includes corresponding
  templates; their actual availability was checked separately below rather
  than inferred from template files.
- The mobile drawer uses the same Shopify menu URL helper as the desktop
  header. Contact menu entries are directed to the Shopify Contact page.
- `product-link-url` keeps a product URL scoped to a collection only when the
  product belongs to that collection. Product cards in the preview retain the
  collection path, and the checked product breadcrumb returns to that
  collection.
- The footer's customer-service and company menu blocks have no menu selected
  in the checked theme configuration. The rendered footer includes Shopify
  policy links and Favorites; no hidden footer menu destinations could be
  audited from source.
- The two homepage carousel Order Portal order links and the header Order
  Portal landing link remain on `rjcarbone.com` intentionally. Keep those
  destinations and the existing remote images unchanged until the separate
  legacy hostname is approved and tested. The Dutch Fresh Direct login remains
  on its third-party host.
- Source includes 13 homepage carousel/promo images hosted at
  `rjcarbone.com/uploads/`, the Weekly Specials feed and flyer-image dependency,
  and the homepage event-space PDF. Their successful delivery after a domain
  cutover was not tested. See
  [legacy-hostname-launch-requirement.md](./legacy-hostname-launch-requirement.md)
  for the hostname, TLS, CORS, feed, image, and Order Portal launch checks.
- The wholesale application remains a preview-only prototype. The separate
  [wholesale registration requirements](./wholesale-registration-requirements.md)
  describe its limitations. Keep preview labels visible if the prototype is
  exposed, or withhold the route and replace it with an approved production
  flow before launch.

## Development-preview checks

The storefront at `http://127.0.0.1:9292` returned Shopify-rendered pages. Link
destinations below were checked by requesting the live preview, not by
inferring availability from theme templates.

- The homepage returned 200. Its rendered header/mobile menu showed Home, the
  five departments, Order Portal, and Contact. The carousel's internal Contact
  destination, homepage promo destinations, Favorites link, and product-card
  links were also inspected.
- `/pages/contact`, `/pages/favorites?view=favorites`,
  `/pages/weekly-specials`, and
  `/pages/wholesale-application?view=wholesale-application-preview` returned
  200 with matching page titles. The wholesale preview rendered preview/
  prototype notice text.
- All five department collection pages returned 200. Their rendered
  category-link destinations comprised 218 unique collection URLs; all
  returned 200. One initial request for `/collections/salal-tips` timed out
  and was retried successfully with a 200 response.
- A product linked from the Flowers collection returned 200 at
  `/collections/flowers/products/sample-yarass10`, and its rendered breadcrumb
  retained the Flowers collection context.
- The external Order Portal, Dutch Fresh Direct, and PDF destinations were
  inspected as rendered URLs only; their external pages and services were not
  tested. Remote image delivery, the Weekly Specials API/feed, footer menu
  configuration outside the theme, and redirect behavior were not tested.

## Proposed legacy-to-Shopify redirects

The existing public-department review in
`scripts/floral-departments-review.json` records these legacy routes and
department identities. The corresponding Shopify routes are present in the
theme and were checked in the preview:

| Observed legacy route | Proposed Shopify destination | Basis |
| --- | --- | --- |
| `/gallery?category=F` | `/collections/flowers` | Reviewed Flowers department record and current preview department link. |
| `/gallery?category=R` | `/collections/roses` | Reviewed Roses department record and current preview department link. |
| `/gallery?category=G` | `/collections/greens` | Reviewed Greens department record and current preview department link. |
| `/gallery?category=P` | `/collections/plants` | Reviewed Plants department record and current preview department link. |
| `/gallery?category=F&productItem=FALS` | `/collections/alstroemeria` | The reviewed legacy record pairs this exact source URL and item ID with `alstroemeria`; the preview destination resolves. |
| `/gallery?category=S&productItem=SAD` | `/collections/adhesives` | `scripts/supplies-collections.json` pairs this exact legacy URL with `adhesives`; the preview destination resolves. |

For other observed `productItem` routes, propose only exact per-record mappings
from the legacy `sourceUrl` and Shopify `handle` in
`scripts/floral-departments-review.json` and
`scripts/supplies-collections.json`, after checking each final destination in
the target store. Do not infer a mapping for an unlisted ID. A standalone
`/gallery?category=S` root mapping was not observed in the reviewed department
records and is not proposed here.

These are proposals only; no redirects were configured. Since distinct
destinations share the `/gallery` path and depend on query parameters, a
path-only redirect would not distinguish them. Use a query-aware legacy
redirect layer if these mappings are approved. Do not send unknown legacy
routes or unmatched item IDs to the homepage.

No redirect is proposed for Order Portal routes, remote images, the event-space
PDF, Weekly Specials API, or third-party login. Preserve their current
behavior pending the hostname and destination decisions below.

## Unverified destinations and launch follow-up

- Confirm the content and intended destination for the “Floral Event Space”
  PDF tile. Do not treat the Weekly Specials PDF URL as an approved
  event-space destination based on its label alone.
- Confirm that `https://www.rjcarbone.com/orderportal` and both
  `/OrderPortal/Order` catalog links continue to reach the intended Order
  Portal through the approved legacy hostname; preserve their query
  parameters.
- Confirm the legacy image paths, Weekly Specials endpoint
  `/api/weekly-specials.ashx`, and returned flyer-image URLs after the
  legacy-host move. The legacy hostname and exact storefront CORS origin are
  still pending; see the linked hostname launch requirement.
- Confirm the Dutch Fresh Direct login is still the intended external
  destination.
- Confirm wholesale-application launch readiness and labeling. The checked
  preview route is real, but the prototype is not a production application
  flow; withhold it if approved production behavior is not ready.
- Test all approved legacy redirect rules in their query-aware implementation
  and verify that unmatched paths do not fall through to the homepage.

No DNS changes, redirects, admin-menu changes, Shopify pages, or theme-code
destination changes were made as part of this audit.
