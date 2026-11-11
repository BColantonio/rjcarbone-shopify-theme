# Storefront performance audit

Audit date: 2026-11-11

## Scope and test conditions

Measured the development preview routes below at desktop and mobile viewport
sizes. The representative product was Achillea Yarrow Assorted
(`sample-yarass10`).

| Page | Preview URL |
| --- | --- |
| Homepage | `http://127.0.0.1:9292/` |
| Supplies collection | `http://127.0.0.1:9292/collections/supplies` |
| Product | `http://127.0.0.1:9292/products/sample-yarass10` |

Measurements used headless Google Chrome 155.0.8059.80 with Chrome DevTools
Protocol performance APIs, not Lighthouse. Desktop was 1365 × 900 CSS pixels;
mobile was 390 × 844 CSS pixels; device scale factor was 1. Browser cache was
disabled before each navigation. Network and CPU were not throttled. Each page
was sampled once, after its load event and a further 1.8 seconds. The preview
server, OS cache, Shopify services, and external hosts were not controlled.

TTFB below is navigation `responseStart`; FCP and LCP are browser performance
entries; CLS is the maximum session-window value observed by a
`PerformanceObserver`. Times are milliseconds. These are development-preview
lab samples, not production field data or Lighthouse scores. The measured
document and its Shopify-injected frames, pixels, and services contribute to
request totals, so those totals are not equivalent to production page requests.

## Baseline browser measurements

| Page | Viewport | TTFB | FCP | LCP | LCP element | CLS | Load |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: |
| Homepage | Desktop | 425 | 544 | 848 | First carousel PNG (`sliderimg7.png`) | 0.00013 | 1,295 |
| Homepage | Mobile | 342 | 436 | 664 | First carousel PNG (`sliderimg7.png`) | 0 | 1,328 |
| Supplies | Desktop | 437 | 532 | 724 | Product image (`SWDCW422.png`) | 0.0006 | 876 |
| Supplies | Mobile | 456 | 540 | 780 | Product image (`SWDCW422.png`) | 0 | 873 |
| Product | Desktop | 319 | 404 | 468 | Product image (`YARASS10.jpg`) | 0.0007 | 709 |
| Product | Mobile | 982 | 1,096 | 1,112 | Product image (`YARASS10.jpg`) | 0 | 1,384 |

The local-preview pages rendered successfully during measurement. These
single-run timings are sensitive to local server load and external services;
in particular, the mobile product response was slower than the other samples.
There is not enough repeated or production data to attribute that difference
to theme code.

## Images and layout stability

### Homepage carousel and promotional images

The first carousel image was the homepage LCP candidate on both viewports. It
is correctly marked `loading="eager"` and `fetchpriority="high"` with configured
intrinsic dimensions. Other carousel slides are lazy and low priority. The
first-slide priority should not be reduced or lazy-loaded.

The carousel and promo-tile images still depend on direct PNG URLs at
`www.rjcarbone.com`. In this browser run, five such images were fetched:

| Asset | Response size | Format |
| --- | ---: | --- |
| `/uploads/sliderimg7.png` | 1,090,902 bytes | PNG |
| `/uploads/NewArrivals.png` | 2,965,194 bytes | PNG |
| `/uploads/hptoprightimage.png` | 3,208,898 bytes | PNG |
| `/uploads/vendorimg12.png` | 65,018 bytes | PNG |
| `/uploads/hpbottomrightimage.png` | 274,085 bytes | PNG |
| **Total** | **7,604,097 bytes (7.25 MiB)** | |

The carousel appends its existing hourly `v=` cache-refresh query and uses
explicit dimensions. The external promo-tile markup uses `loading="lazy"` and
fixed 1200 × 600 dimension attributes, but has no responsive `srcset`; its
images are styled into fixed-height, cropped tiles. Despite native lazy
loading, the browser fetched all four promo-tile PNGs in the sampled homepage
navigation. Their original bytes and delivery are controlled by the legacy
host. Their dimensions, URLs, cache-refresh behavior, design, and carousel
behavior were left unchanged.

### Other images

The product and collection image paths use Shopify image transforms,
responsive widths/sizes, and intrinsic dimensions. Product media gives the
main product image high fetch priority; subsequent gallery media and
non-initial card media are lazy. At sampling time, every rendered `<img>` on
the six pages had width and height attributes. The sample recorded near-zero
CLS on every route; it did not reveal a material image/font/dynamic-content
layout shift. This does not verify shifts after scrolling, interaction,
merchant content changes, or on production.

## JavaScript, requests, and blocking work

Chrome’s page-level request counts and theme asset script requests were:

| Page | Viewport | Requests* | Theme asset script requests* | Theme script bytes* | Image bytes* | DOM script elements |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Homepage | Desktop | 206 | 57 | 527 KiB | 7,534 KiB | 85 |
| Homepage | Mobile | 221 | 57 | 529 KiB | 8,062 KiB | 86 |
| Supplies | Desktop | 226 | 62 | 587 KiB | 228 KiB | 90 |
| Supplies | Mobile | 222 | 62 | 589 KiB | 351 KiB | 91 |
| Product | Desktop | 237 | 61 | 574 KiB | 72 KiB | 95 |
| Product | Mobile | 225 | 61 | 574 KiB | 492 KiB | 95 |

\*CDP page-target observations for this preview run; requests include
Shopify-generated frames and services. Theme script byte totals count requests
whose asset URL contains `/assets/`, and are not an execution-time or production
bundle-size measurement.

`snippets/scripts.liquid` loads a shared set of theme modules on all three
routes, including product/card, dialog, media, slideshow, and pricing
components. Some modules and preloads are already gated by template or theme
settings. Rendered HTML also repeats a few identical module script tags
(`dialog.js`, cart-item/quantity components, and `volume-pricing-info.js`).
Repeated tags do not establish repeated downloads or initialization: the
browser module map/cache can reuse module URLs. The measurements do not
isolate JavaScript parse/execute cost or prove which shared modules are unused
after considering header, footer, cart drawer, and Quick Add markup. No
template gating or script-tag removal was made without that dependency and
behavior evidence.

The layout preloads the base stylesheet and `overflow-list.css`; the theme’s
feature modules are module/deferred scripts. The sampled navigation timings do
not identify a theme-owned render-blocking script. Repeated Shopify telemetry
and service requests were visible in the preview; their behavior is outside
the theme and should not be treated as duplicate theme asset downloads.

## Confirmed causes, changes, and after-results

- **Confirmed payload dependency:** the homepage fetched 7.25 MiB of external
  PNGs from the legacy host in the measured run. Several promo images are
  multi-megabyte originals without responsive source variants. The top
  carousel image is also the measured LCP element and is already requested
  eagerly at high priority.
- **Confirmed shared-loading surface:** all three routes request roughly
  527–589 KiB of theme asset scripts in this preview. The source has broad
  shared module loading, but component dependencies and execution cost were
  not isolated.
- **No layout-shift defect confirmed:** measured CLS was 0–0.0007; the highest
  recorded value was 0.0007 on desktop product.
- **Code changes:** none. Changing external image sources or transformation
  URLs would violate the preservation requirement; changing image delivery or
  shared module loading without a verified dependency/performance comparison
  would be speculative. No design, brand color, shopping behavior, or
  prototype boundary was changed.
- **After-results:** not applicable because no performance code was changed.
  No improvement is claimed and no redundant second measurement was run.

## Unresolved dependencies and follow-up

- Production performance remains unverified. Run Lighthouse on the production
  or representative authenticated storefront with a documented device/network
  profile, cold and warm cache runs, and representative merchant settings.
- The legacy image host controls image compression, modern formats, responsive
  variants, and cache headers. The current theme preserves direct URLs and
  cache-busting behavior; changing delivery needs an approved image-hosting
  plan and verified output parity.
- To reduce shared JavaScript safely, trace actual component use and module
  imports across the header, cart drawer, collection quick add, product form,
  product gallery, and dynamic section rendering, then compare controlled
  before/after traces and exercise the affected shopping interactions.
- The local preview includes Shopify platform scripts, telemetry, frames, and
  external services. Their requests, failures, and timings are not production
  theme findings.
