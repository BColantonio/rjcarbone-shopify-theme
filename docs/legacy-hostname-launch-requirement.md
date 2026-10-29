# Legacy-server hostname launch requirement

Before `rjcarbone.com` moves to Shopify, provision and verify a separate
hostname that continues to serve the legacy server. The hostname is not yet
selected and must be confirmed by the site/hosting team.

The current homepage still depends on the legacy host for 13 remotely hosted
carousel and promotional images, as well as two Order Portal links. Once the
apex domain points to Shopify, those URLs must be updated to the confirmed
legacy-server hostname, or equivalent redirects must be in place, to avoid
broken images and Order Portal links.

The Shopify Weekly Specials page also depends on the legacy server. Its
read-only feed is `GET /api/weekly-specials.ashx`, and the feed's flyer image
URLs must resolve through the confirmed HTTPS hostname. Configure the feed's
exact storefront-origin CORS allowlist only after the hostname and storefront
origin are confirmed; do not use a guessed hostname or wildcard origin.

Before launch, confirm that the hostname has working TLS and that all referenced
image paths, both `/OrderPortal/Order` routes (including their catalog query
parameters), `/api/weekly-specials.ashx`, and any dependent legacy resources
resolve correctly through it.
Do not change DNS or server configuration until the hostname and cutover plan
are approved and tested.
