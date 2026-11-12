# Browser-storage reliability audit

## Scope and findings

Favorites and Saved Orders use browser `localStorage`; neither uses account storage or a backend. The original Favorites parser dropped invalid entries, allowing a later write to erase them. Saved Orders rejected the entire list when one record or item was invalid. Saved Orders also lacked a storage-event listener, and an open editor could overwrite a newer version of the same order. Storage access and writes can throw, including when storage is blocked or full.

## Changes

Both features show valid records where possible, report storage errors in existing live regions, and prevent writes when malformed JSON or invalid records would otherwise be overwritten. They do not use an in-memory persistence fallback. Saved Orders listens for external storage changes, closes stale editors, and compares an open saved order with the current stored version before writing it. Favorites no longer writes asynchronously fetched images into storage. The existing product checks distinguish a 404 from a network or other lookup failure, and Favorites displays those states as well. Text is assigned through DOM text properties, and stored product URLs, handles, identifiers, and quantities are validated before use. Cart and wholesale rules remain in their existing browser-only paths.

The new storage messages are present in every runtime locale; like the existing Saved Orders messages in non-English runtime files, the new text is currently English and requires translation for localized experiences.

## Verification

- **Mocked fixture:** `node tests/browser-storage-reliability.cjs` passed with an isolated in-memory map and mocked responses. It covered blocked reads, quota write failures, malformed JSON, invalid/partially valid records, a simulated storage event and listener lifecycle, stale saved-order edits, invalid URLs and handles, HTTP 404, HTTP 503, and a network failure. The fixture replaces selected private methods in a VM to exercise them; it is not a browser integration test and does not touch a real cart or saved data.
- **Browser checks:** The user reports that normal browser checks passed; the specific checks were not independently observed or detailed in this audit. No assistant-run live theme preview, actual browser storage, real multi-tab interaction, or cart checkout was tested.
- **Syntax:** `node --check` passed for `assets/favorites.js`, `assets/saved-orders.js`, and `tests/browser-storage-reliability.cjs`.
- **Theme Check:** `shopify.cmd theme check --path .` passed with 6 warnings in 2 unrelated files, after the PowerShell shim was blocked by the system execution policy. The direct Windows command shim did not require changing that policy.
- **Diff:** `git diff --check` passed with LF-to-CRLF warnings for locale files. Untracked files are not included in that command's diff.
- **Type checks:** Visual Studio reported the baseline Favorites diagnostics and unresolved Node fixture diagnostics detailed below. The workspace build failed; no standalone TypeScript compiler was found in the checked installation locations, and no dependency was installed.

## Remaining limitations

`localStorage` provides no atomic compare-and-swap. Two tabs can read the same old value and write simultaneously before either receives a storage event, so the last write can still overwrite another tab's changes. The saved-order snapshot check detects a changed order when it is visible before a write, but is not a transaction. Cross-tab event behavior and race handling require real isolated-browser verification. Invalid data is retained in storage and writes are blocked rather than offering an automatic repair/export UI; users should back up stored data before attempting manual repair.

Favorites normalizes or omits unsafe image URLs when reading snapshots. The fixture does not establish that an invalid image field will be retained on a later write, nor does it test Favorites availability rendering, live-region announcements, cart actions, wholesale restrictions, or real product redirects. These remain unverified.

## Type-check baseline

Visual Studio's latest workspace build reported 71 errors, of which it returned the first 50. It included existing diagnostics in `assets/component-cart-items.js` and `assets/saved-orders.js`. The Favorites diagnostic check reported three baseline errors: `TS7008` at line 207 for `#imageLookupController`, and `TS2339` at lines 284 and 394 for the focused-button `dataset` and caught error `name`. The two newly introduced Favorites lookup-selector `dataset` errors no longer appear in that check.

The new Node fixture lives in untracked `tests/`, outside Shopify's deployed theme assets, with its own type-check configuration and Node declarations. A refreshed Visual Studio check reported 24 unresolved fixture diagnostics: 14 `TS7006` errors on lines 11, 16, 27, 35, 37, 56, 61, 67, and 77; nine `TS2322` errors on line 83; and one `TS2345` error on line 136. These reports persist despite JSDoc annotations. No standalone TypeScript compiler was found to verify the fixture independently, and no dependency was installed. Fixture type work remains a separate follow-up; the fixture type check is not reported as passed.
