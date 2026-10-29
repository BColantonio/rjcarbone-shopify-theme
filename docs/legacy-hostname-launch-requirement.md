# Legacy-server hostname launch requirement

Before `rjcarbone.com` moves to Shopify, provision and verify a separate
hostname that continues to serve the legacy server. The hostname is not yet
selected and must be confirmed by the site/hosting team.

The current homepage still depends on the legacy host for 13 remotely hosted
carousel and promotional images, as well as two Order Portal links. Once the
apex domain points to Shopify, those URLs must be updated to the confirmed
legacy-server hostname, or equivalent redirects must be in place, to avoid
broken images and Order Portal links.

Before launch, confirm that the hostname has working TLS and that all referenced
image paths, both `/OrderPortal/Order` routes (including their catalog query
parameters), and any dependent legacy resources resolve correctly through it.
Do not change DNS or server configuration until the hostname and cutover plan
are approved and tested.
