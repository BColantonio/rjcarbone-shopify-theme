# UI conventions

Build custom surfaces on the Horizon theme rather than a separate design
system. Preserve the configured Inter typography, Carbone colors `#0E9CA4` and
`#B5BABD`, catalog density, approved layouts, and payment-provider branding.
Contrast choices awaiting team review should not be changed as part of routine
visual cleanup.

## Spacing and shape

Use the existing `--gap-*`, `--margin-*`, and `--padding-*` scales in
`snippets/theme-styles-variables.liquid`. Keep related labels, help, and status
messages close to their controls; use larger gaps between groups. Empty status
regions should not reserve visual space but must remain available for dynamic
announcements. Preserve the `hidden` behavior of conditional controls.

Use the merchant-configurable `--style-border-radius-inputs` for input-like
surfaces and `--style-border-radius-buttons-primary` or
`--style-border-radius-buttons-secondary` for buttons. Use existing small
radius tokens such as `--style-border-radius-xs` for small focus treatments;
do not force unrelated cards, controls, or images into a single radius. Keep
visible focus styles and minimum touch targets.

## Icons, copy, and branding

Use existing theme SVG assets and `snippets/icon.liquid` for interface icons,
with accessible control labels and decorative icons hidden from assistive
technology. Do not substitute icons for meaningful imagery or change payment
marks. No rendered interface emoji was found in the inspected Liquid and
JavaScript files.

Keep actions and states concise and specific. Preserve prototype, privacy,
pricing-preview, unsaved-data, and error-recovery notices; do not imply a
backend capability exists. Update matching keys in all runtime locale files
when changing fallback copy. Existing English fallbacks in non-English locales
still need translation review.

`snippets/meta-tags.liquid` keeps the page title, tags, pagination, and shop
name while avoiding an exact duplicate shop-name suffix. Preserve product and
search context. The theme and password layouts render a favicon only when
`settings.favicon` is configured. The saved settings contain a Carbone logo
but no favicon; choose and configure an approved favicon in the theme editor
rather than assuming the logo is suitable at icon size. No admin setting or
favicon asset was changed in this pass.

## Verification limits

Isolated headless Edge checks at 1365 × 812 and 375 × 812 found document scroll
width equal to viewport width on Favorites, Saved Orders, Returns, the wholesale
preview, Flowers, and the empty cart. A native Tab on each page focused the
skip link with `:focus-visible` and a computed solid outline. A prior 375-pixel
sample also found a focus outline on a wholesale input. These measurements do
not establish visual appearance, component-level overflow, full tab order, or
focus visibility on every control. The isolated cart was empty, so delivery-date
controls were not present in the width check. Manual desktop and mobile visual
review and complete keyboard checks, including a nonempty cart, remain open.
