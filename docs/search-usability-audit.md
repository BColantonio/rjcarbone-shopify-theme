# Storefront search usability audit

Audit date: 2026-11-11

## Scope and evidence

This audit covers the Shopify theme's existing full-search page and predictive
search modal. It preserves Shopify search, the theme's configured fallback
collection, product-card composition, and the existing predictive-search
section request. No product data, catalog, search configuration, checkout, or
dependencies were changed.

The sample SKU was read from the actual development storefront preview at
`http://127.0.0.1:9292/products/sample-yarass10`, not invented as a fixture:
**YARASS10**, for **Achillea Yarrow Assorted #10**. Query checks below used
read-only requests to the running Shopify preview routes. They are storefront
preview observations, not production-catalog or interactive-browser tests.

## Preview search observations

| Test | Full search preview | Predictive-search preview |
| --- | --- | --- |
| Exact SKU `YARASS10` | One result, `/products/sample-yarass10`. | One result, same product path. Shopify adds predictive-search tracking query parameters to the URL. |
| Partial SKU prefix `YARASS` | One result, `/products/sample-yarass10`. | One result, `/products/sample-yarass10`. |
| Partial SKU suffix `ASS10` | No Shopify match. The theme then displayed fallback-collection cards, which could be mistaken for matches. | No product match; the predictive response displayed its no-results message. |
| Product name | Exact `Achillea Yarrow Assorted #10` and partial `Yarrow` each returned the sample product. | `Achillea Yarrow Assorted #10` returned the sample product. |
| Partial product name | `Achillea` matched the sample product. | `Achillea` returned three products in the preview. |
| Leading/trailing spaces and mixed case | `  yArAsS10  ` returned the sample product. | The same query returned the sample product; the theme trims the input before requesting predictive results. |
| No match | A unique no-match query produced Shopify's no-results message and 11 fallback-collection cards. After the change these cards are labeled “Search suggestions.” | A unique no-match query produced the no-results message and no product cards. |

Product destinations for the matching SKU were consistent by product path.
Predictive product cards are intentionally compact resource cards; full-search
cards use the search template's product-card composition. The full-search
template includes SKU, selling unit, price, and quantity-price-table blocks;
the shared product card retains its favorite control and configured cart
controls. Predictive resource cards continue to show their existing image,
title, and price without adding favorite or cart controls. This audit did not
replace either card type.

Shopify's result behavior is authoritative: the `YARASS` prefix works in both
search modes, while the partial suffix `ASS10` did not match in the preview.
Do not promise arbitrary substring matching. Confirm the intended
SKU search behavior and Shopify search/index settings with the store team
after the inventory integration supplies the representative production
catalog; do not address this limitation with a custom backend or whole-catalog
fetch.

## Confirmed theme issue and change

On a full-search no-match response, the theme showed “No results found” but
then rendered cards from the configured empty-state collection without
labeling them as suggestions. Those cards retained functional product links
and cart forms, so the page could be read as showing query matches.

The full-search no-results message now:

- Announces the no-results state once through a status region and safely
  escapes the submitted query.
- Keeps Shopify's existing translated spelling/alternative-query advice.
- Provides a translated “Continue shopping” link to Shopify's all-products
  collection route.
- Labels fallback-collection cards as search suggestions unless the merchant
  has supplied a custom empty-state collection title.

Predictive search still uses Shopify's predictive-search endpoint and section
rendering. Query text passed to result-count, suggestion, and no-results
announcements is escaped. Shopify-generated query suggestion labels and URLs
are escaped in their HTML attributes; Shopify's highlighted suggestion markup
is retained.

Relevant implementation: [search input block](../blocks/_search-input.liquid),
[search results section](../sections/search-results.liquid),
[predictive-search section](../sections/predictive-search.liquid),
[search template](../templates/search.json).

## Keyboard, focus, and responsive verification

Interactive browser checks could not be completed. The attached browser/CDP
connection timed out, opening a new integrated browser page also timed out,
and no local Chrome/Edge/Playwright runner was available without installing
dependencies. No dependency was installed.

Source inspection confirms that the predictive search input is a combobox,
the component handles arrow-key and Tab selection, Enter activation and
Escape, and the native search dialog closes on Escape. The native dialog
close path is intended to restore focus to its opener. The full-search input
and predictive modal include mobile/desktop CSS breakpoints. These are source
findings only: keyboard selection, Escape and focus return, and desktop/mobile
layouts still need manual verification in an available browser.

## Verification record

| Check | Result |
| --- | --- |
| Actual Shopify preview full/predictive query requests | Completed read-only GET checks at `http://127.0.0.1:9292` for exact and partial SKU, product names, mixed-case/space-padded terms, and no-match queries. Matching full and predictive results use `/products/sample-yarass10`; predictive URLs include Shopify tracking parameters. |
| Post-change no-results view | Full-search preview returned one status message, spelling/alternate-query advice, the “Search suggestions” fallback heading, 11 configured fallback cards, and a “Continue shopping” link to `/collections/all`. |
| Product-card preservation | The exact-SKU full-search card retained the visible SKU, favorite markup, cart form, and `/products/sample-yarass10` destination. Predictive cards retain their existing compact image/title/price content. |
| Browser keyboard/focus interaction | Not verified; browser connection unavailable as described above. |
| Desktop/mobile visual layout | Not verified interactively; source breakpoints were inspected. |
| Query-output safety | A literal-markup query produced no raw injected `<img>` in either full or predictive preview response; the full-search response contained escaped query text. Explicit Liquid escaping was added to query text and query-suggestion attributes. |
| JavaScript syntax checks | `node --check assets\\predictive-search.js` and `node --check assets\\search-page-input.js` passed. |
| Theme Check | `shopify.cmd theme check --path .` passed: 398 files inspected, six existing warnings in unchanged `sections/header.liquid` and `snippets/divider.liquid`; no findings in changed files. |
| Whitespace | `git diff --check` passed for tracked changes; `git diff --no-index --check -- /dev/null docs\\search-usability-audit.md` passed for the new audit. |

### Post-change checks

Post-change query and markup checks passed against the local Shopify preview.
The browser interaction and visual checks remain open and must not be treated
as verified.

## Follow-up after inventory integration

Test relevance and response performance against the complete synchronized
catalog, including exact SKU, SKU prefixes and suffixes, product names,
variants, leading/trailing whitespace, mixed case, and representative no-match
queries. Confirm Shopify search configuration/indexing behavior and
representative catalog size before making any search behavior commitments.
The current sample catalog is not sufficient evidence for complete-catalog
relevance or performance.
