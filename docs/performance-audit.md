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
explicit dimensions. Before the scoped experiment below, the external promo-tile markup used
`loading="lazy"` and fixed 1200 × 600 dimension attributes, but had no
responsive `srcset`; its images are styled into fixed-height, cropped tiles.
Despite native lazy loading, the browser fetched all four promo-tile images
during the sampled homepage navigation. Their original bytes and delivery
are controlled by the legacy host.

### Other images

The product and collection image paths use Shopify image transforms,
responsive widths/sizes, and intrinsic dimensions. Product media gives the
main product image high fetch priority; subsequent gallery media and
non-initial card media are lazy. At sampling time, every rendered `<img>` on
the six pages had width and height attributes. The sample recorded near-zero
CLS on every route; it did not reveal a material image/font/dynamic-content
layout shift. This does not verify shifts after scrolling, interaction,
merchant content changes, or on production.

## Mobile throttling follow-up

Repeated the homepage test in headless Chrome 155.0.8059.80 through the
development preview at 390 × 844 CSS pixels and device scale factor 1. Chrome
DevTools Protocol emulation used 150 ms latency, 1,638.4 kbit/s download,
768 kbit/s upload, and 4× CPU slowdown. The browser cache was disabled and
cleared before each navigation. Metrics were sampled after the page load event
and a further 1.2 seconds.

Five attempts were made; four produced the expected storefront title and
carousel and are included below. The first attempt returned an incomplete
document (no carousel and no legacy image requests), so it is excluded from
the medians. These are emulated conditions in a local preview, not a physical
mobile device, Lighthouse scores, or production/field data. The local server,
remote legacy image host, and Shopify services were not throttled or otherwise
controlled.

| Metric | Median of 4 valid runs |
| --- | ---: |
| Navigation response start (TTFB) | 352 ms |
| First Contentful Paint | 8,660 ms |
| Largest Contentful Paint | 24,362 ms |
| LCP candidate | First carousel PNG (`sliderimg7.png`) |
| Cumulative Layout Shift | 0.0488 |
| DOMContentLoaded | 18,176 ms |
| Load event | 49,311 ms |
| Transferred legacy image bytes | 7,603,792 bytes (7.25 MiB) |
| Transferred image bytes, all hosts | 7,825,744 bytes (7.46 MiB) |

The initial unthrottled single-run mobile LCP of 664 ms above is not a
comparable baseline: the throttling, cold-cache conditions, and repeated-run
method differ. The high throttled LCP identifies a material image/preview
path to investigate, but it does not isolate the legacy image host from
browser scheduling, theme initialization, the local preview server, or
unthrottled third-party services.

## Scoped homepage promo-image loading experiment

The four promo requests in the baseline waterfall began 6.85–7.09 seconds
after navigation at low priority while the high-priority first carousel image
was still transferring. No later carousel image appeared in the initial
waterfall. This supports deferring the promo requests, not changing carousel
loading.

The preview-only code experiment keeps the first slide eager and high
priority, and leaves subsequent carousel slides and their controls unchanged.
In [sections/homepage-promo-tiles.liquid](../sections/homepage-promo-tiles.liquid),
promo image URLs are held in `data-src` until an `IntersectionObserver` with a
400 px vertical root margin sees the image near the viewport. The component
then assigns the unchanged URL and alt text. It preserves the 1200 × 600
intrinsic dimensions, native `loading="lazy"`, daily `v=` cache token, links,
and a `<noscript>` image fallback. It does not preload promo images or alter
the legacy host. The three promo images outside the initial threshold are
requested when scrolled into view; the large `NewArrivals.png` tile was
already within the threshold and still loaded before the first-slide LCP.

The baseline and changed tests used the same local preview, headless Chrome
155.0.8059.80, 390 × 844 CSS-pixel viewport, device scale factor 1, cold
browser cache, 150 ms latency, 1,638.4 kbit/s download, 768 kbit/s upload, and
4× CPU slowdown. Baseline values are medians from the four valid runs above;
the changed values are medians from three valid runs. Each run was sampled at
the load event plus 1.2 seconds. All three changed runs loaded all nine
carousel images and all four promo images after visiting every slide control
and scrolling each promo into view; none was excluded.

| Metric | Baseline median (n=4) | Scoped deferral median (n=3) | Difference |
| --- | ---: | ---: | ---: |
| FCP | 8,660 ms | 8,636 ms | −24 ms; not meaningful at this precision |
| LCP (first carousel image) | 24,362 ms | 18,608 ms | −5,754 ms (23.6%) |
| CLS | 0.04876 | 0.04876 | No change |
| Initial legacy image transfer | 7,603,792 bytes | 4,055,811 bytes | −3,547,981 bytes (46.7%) |
| Initial image transfer, all hosts | 7,825,744 bytes | 4,277,796 bytes | −3,547,948 bytes (45.3%) |
| Load event | 49,311 ms | 32,373 ms | −16,938 ms |

Initial transfer bytes count completed image requests through load plus 1.2
seconds. In the changed runs, the first carousel image transferred about
1.091 MB at high priority; `NewArrivals.png` transferred about 2.966 MB at
low priority; the other three promo images were not requested in that
measurement window. In a separate changed-condition waterfall sample, the
first slide started at 2,188 ms and completed at 18,535 ms; `NewArrivals.png`
started at 15,379 ms and completed at 32,270 ms. The LCP entry at 18,548 ms
was the first carousel `<img>` (`sliderimg7.png`). Its request priority
remained high (`u=1, i`); the promo request was low (`i`). The remaining promo
images were fetched after scrolling.

After visiting all nine slides and scrolling all four promo tiles, the
changed-condition median was 16,204,090 legacy-image bytes (16,426,063 image
bytes across all hosts), covering the same 13 unique legacy image URLs. This
full-tour byte total is not reduced by deferral. A separate three-run
baseline full-tour measurement was not captured; the baseline initially
loaded the same five URLs and the changed runs eventually loaded the same
source files, so an exact baseline interaction-window median is not claimed.
The reduced initial bytes are delayed requests, not removed payload.

All three runs reached every carousel slide through its slide-selection
controls, and a rapid sequence of four “Next slide” activations reached slide
5. Desktop preview geometry at 1440 × 900 showed four promo tiles at 668 ×
235 CSS pixels; the 390 × 844 preview retained the existing 358 × 235 tile
geometry. Both internal promo destinations returned HTTP 200 in the local
preview: `/collections/supplies` and `/pages/weekly-specials`. The FlowerWeb
login and legacy weekly-special PDF links remained external; only their
rendered `href` values were inspected. Disabling JavaScript left all four
`<noscript>` images and all four promo links present.

CDP touch events were dispatched against the 390 px preview viewport, but
headless Chrome did not move the carousel scroller (`scrollLeft` remained 0).
Thus the carousel’s mobile swipe path was not verified on a physical device;
the experiment does not modify that path or `assets/slideshow.js`. Treat the
LCP and byte reductions as supportive local-preview evidence, not proof of an
equivalent production gain: in the changed waterfall sample the first-slide
request also began later (2.19 seconds versus 0.33–0.47 seconds in baseline),
and local preview scheduling is variable.

`node --check assets/homepage-promo-image-loader.js` and `git diff --check`
passed. `shopify.cmd theme check --path .` inspected 398 files and reported
six pre-existing warnings in `sections/header.liquid` and
`snippets/divider.liquid`; it reported no findings in the changed files.

## Legacy image inspection and comparison copies

The five source URLs returned 200 from the legacy host during inspection. The
downloaded source-file sizes below are on-disk bytes; Chrome's network
transferred-byte totals include protocol overhead. Notably, three of the five
`.png` URLs contain GIF or JPEG data rather than PNG data.

| Existing filename and URL path | Actual format and dimensions | Frames | Source bytes | Lossless same-format copy bytes | Savings |
| --- | --- | ---: | ---: | ---: | ---: |
| `sliderimg7.png` (`/uploads/sliderimg7.png`) | PNG, 1920 × 300 | 1 | 1,090,022 | 1,008,788 | 81,234 (7.45%) |
| `NewArrivals.png` (`/uploads/NewArrivals.png`) | PNG, 2172 × 724 | 1 | 2,963,340 | 2,436,600 | 526,740 (17.78%) |
| `hptoprightimage.png` (`/uploads/hptoprightimage.png`) | Animated GIF, 700 × 300 | 123; 80 ms/frame | 3,206,882 | 3,091,761 | 115,121 (3.59%) |
| `vendorimg12.png` (`/uploads/vendorimg12.png`) | JPEG, 700 × 300 | 1 | 64,911 | 64,911 | 0 |
| `hpbottomrightimage.png` (`/uploads/hpbottomrightimage.png`) | Animated GIF, 736 × 316 | 63; 80 ms/frame | 273,861 | 273,861 | 0 |
| **Total** | | | **7,599,016** | **6,875,921** | **723,095 (9.52%)** |

The lossless copies are in [performance-image-comparisons/lossless](./performance-image-comparisons/lossless).
The two PNG copies were pixel-verified at their original dimensions and retain
the applicable source metadata (DPI for both, XMP for `NewArrivals.png`). The
`hptoprightimage.png` copy is still GIF data under the existing `.png`
filename; all 123 decoded frames, frame durations, loop count, and pixel
values were verified. The JPEG has no lossless savings in the available
tools. An attempted optimization of the 63-frame bottom GIF did not pass
exact-frame verification, so no optimized copy was retained.

Rendered CSS image boxes were measured in Chrome: the carousel banner is
1275 × 199 on desktop and 358 × 56 on mobile; each promo tile is 630 × 235
on desktop and 358 × 235 on mobile. The source images are rendered with
`object-fit: contain` for the carousel and `object-fit: cover` for the tiles.
Non-served, same-filename resize comparisons are in
[performance-image-comparisons/display-1x](./performance-image-comparisons/display-1x)
and [performance-image-comparisons/display-2x](./performance-image-comparisons/display-2x):

| Comparison | Dimensions | Bytes | Reduction from source | Inspection |
| --- | ---: | ---: | ---: | --- |
| [`sliderimg7.png` display-1x](./performance-image-comparisons/display-1x/sliderimg7.png) | 1275 × 199 | 498,863 | 591,159 (54.23%) | Headline remains legible at 1×; fine image/text detail is softer. Not recommended for a shared high-DPI URL. |
| [`NewArrivals.png` display-1x](./performance-image-comparisons/display-1x/NewArrivals.png) | 705 × 235 | 330,247 | 2,633,093 (88.86%) | Promotional wording remains readable in the comparison, but small text and edges are softer than the 2× copy. |
| [`NewArrivals.png` display-2x](./performance-image-comparisons/display-2x/NewArrivals.png) | 1410 × 470 | 1,169,069 | 1,794,271 (60.55%) | “CHRISTMAS COLLECTION,” “Holiday Décor & Florals,” and “SHOP NOW” remain legible on visual inspection at the measured tile scale. Check the actual responsive crop before any upload. |

Resizing the carousel to its 1× desktop box would undersupply pixels on
high-density screens; the original 1920 × 300 source is already below the
2550 × 398 desktop 2× box. The two GIFs are already smaller than their
2× tile-cover pixel requirements. Resizing all GIF frames to 1× increased
their encoded sizes substantially (to 9,249,316 and 1,017,229 bytes), while
resizing the JPEG to quality 95 increased it to 106,550 bytes. These
format-specific resize tests were not retained as comparison copies or
recommended for deployment.

All source images remain unchanged at their original remote URLs. The
comparison files live under `docs/`, not a theme asset or served image
directory, and were never loaded by the preview. Their measured byte savings
are file-level comparisons, not storefront performance improvements.

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
  multi-megabyte originals without responsive source variants. Three `.png`
  URLs contain animated GIF or JPEG data. Under emulated mobile throttling,
  the median LCP candidate remained the first carousel image at 24,362 ms.
  The top carousel image is already requested eagerly at high priority.
- **Measured scheduling experiment:** deferring promo requests reduced the
  three-run median initial legacy image transfer from 7,603,792 to 4,055,811
  bytes and median LCP from 24,362 to 18,608 ms. The complete image payload
  after browsing all slides and promos remained 16,204,090 bytes; only its
  timing changed. The baseline full-tour total was not separately measured.
- **Confirmed shared-loading surface:** all three routes request roughly
  527–589 KiB of theme asset scripts in this preview. The source has broad
  shared module loading, but component dependencies and execution cost were
  not isolated.
- **No layout-shift defect confirmed:** measured CLS was 0–0.0007; the highest
  recorded value was 0.0007 on desktop product.
- **Theme/server and deployment boundary:** the local theme now delays
  offscreen promo image requests; the first carousel image, later carousel
  behavior, image URLs, cache tokens, remote assets, server settings, and
  production behavior are unchanged. No source image was replaced and no
  deployment was performed. The non-served lossless and resize copies above
  do not establish image-optimization gains.

## Recommendation

1. Keep all existing `https://www.rjcarbone.com/uploads/<filename>` paths,
   basenames, and actual media formats. First consider replacing only the
   exact-verified lossless copies of `sliderimg7.png`, `NewArrivals.png`, and
   `hptoprightimage.png`; together they reduce these five files' raw bytes by
   723,095 (9.52%) if the same-name files are actually replaced. Do not
   replace the bottom GIF or JPEG with the unsuccessful resize/optimization
   trials.
2. Separately consider the 1410 × 470 `NewArrivals.png` 2× comparison if
   owner review confirms its text and responsive crop remain acceptable. It
   saves 60.55% versus that original but is a resample, not a lossless
   optimization. Do not use the 1× carousel resize for a shared desktop and
   mobile URL.
3. If an operator approves deployment, overwrite the existing files at the
   same `/uploads/` paths using the established legacy-host replacement
   process; do not rename, move, or repoint the theme URLs. Keep the existing
   automatic version-query logic unchanged: carousel images get an hourly
   `v=` token in [`blocks/_slide.liquid`](../blocks/_slide.liquid), and promo
   tiles get a daily token in
   [`sections/homepage-promo-tiles.liquid`](../sections/homepage-promo-tiles.liquid).
   Replacing a file may therefore remain hidden behind the current cache key
   until the next token interval; confirm CDN behavior and purge policy with
   the host operator.
4. The repository documents the query-based refresh behavior but not an
   upload/overwrite procedure. Confirm the actual same-name replacement
   process before any change. After an approved replacement, rerun the same
   throttled mobile protocol against the preview/production host and compare
   multiple valid runs. No image copy has been deployed or measured as a
   storefront after-result.

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
