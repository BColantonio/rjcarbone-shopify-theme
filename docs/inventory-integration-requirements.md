# Inventory integration requirements

This document describes the Shopify data the inventory integration needs to
coordinate and separates what the current theme renders from capabilities that
are not established by the theme source. It is a requirements and clarification
document, not an API contract.

## Field and behavior requirements

| Area | Current Shopify/theme behavior | Integration requirement or unknown |
| --- | --- | --- |
| Product and variant identity | Shopify products and variants have distinct native IDs. The theme's SKU block displays the selected variant's SKU and updates it when a variant changes. | Keep a stable source-system product identifier and, where inventory is tracked per sellable option, a stable variant/item identifier. Maintain an unambiguous mapping to Shopify product and variant IDs. SKU is useful as a business identifier but should not be assumed unique or immutable without confirmation. The theme does not show a source-ID mapping. |
| Titles, descriptions, and images | Product content is rendered from Shopify product data. | Confirm which system owns and synchronizes each field, including image ordering, image changes/removals, and any variant-specific content. The theme does not establish a content-sync process. |
| Departments and categories | Storefront category navigation links to Shopify collections. Floral department/category names, source URLs, original IDs, and proposed handles are documented in `scripts/floral-departments-review.json`. Supplies category names, source URLs, and handles are in `scripts/supplies-collections.json`; the storefront's supplies list is maintained separately in `snippets/supplies-category-data.liquid`. Floral storefront links are also maintained by collection handle in `snippets/floral-department-category-links.liquid`. | Preserve the source department and category IDs as identifiers in the integration mapping; Shopify collection handles are storefront routing values, not replacements for original IDs. In the supplies configuration the source category/item codes are embedded in `sourceUrl` query parameters rather than exposed as a separate `originalCategoryId` field. Confirm the authoritative category source and how products can belong to multiple departments/categories. |
| Selling unit (UOM) | The theme reads the product metafield `custom.selling_unit` and displays it when present. The block reads it from the product, not the selected variant. | Populate the value using the `custom.selling_unit` metafield expected by the theme. Confirm whether UOM is product-level or variant-level in the inventory model before deciding how it is represented in Shopify. The theme currently implements only product-level display. |
| Base price and quantity-price breaks | Shopify variant pricing is used by product and cart UI. The custom quantity-price table reads `custom.quantity_price_breaks`, a product JSON metafield with rows containing `minimum_quantity` and `price`, and renders a display table. | Confirm whether the inventory system supplies base prices and tier prices, their currency and effective-date rules, and the authoritative pricing source. The custom metafield table is display-only: it does not apply its displayed breaks to cart or checkout prices. Integration-driven cart/checkout tier pricing is not implemented. |
| Stock and availability | The inventory block bases its status on the selected variant's Shopify inventory management, quantity, and policy. Variant availability is also used by storefront purchase controls. | Confirm stock ownership, update timing, inventory location/scope, backorder behavior, and how availability should be represented. The theme consumes Shopify inventory state; it does not establish an inventory-system sync. |
| Product publication | Products and collections are rendered through Shopify storefront data. | Confirm how the integration should handle active/inactive items and Shopify publication to the Online Store (including unpublishing and republishing). The theme does not establish publication synchronization or rules. |
| Orders back to inventory | The storefront supports Shopify cart and checkout. | Shopify orders need to flow back to the inventory system, but no order-export or order-sync implementation is evident in the theme. Confirm which order lifecycle changes must be sent and how cancellations, edits, refunds, and fulfillment affect inventory. |

## Category configuration references

- `scripts/floral-departments-review.json` retains `sourceCategoryId` for department roots and `originalCategoryId` for category entries, along with source URLs and proposed collection handles. It also flags ambiguous, placeholder, and shared-source entries for review. Treat those review notes as unresolved source data, not finalized mapping decisions.
- `scripts/supplies-collections.json` records supplies names, source URLs, and collection handles. Its source URLs carry the original values such as `category=S` and `productItem=...`; the JSON does not currently store those codes in separate ID fields.
- `snippets/supplies-category-data.liquid` and `snippets/floral-department-category-links.liquid` render links using names and collection handles. They do not preserve or expose the source category IDs in the storefront.

The two configuration lists serve storefront navigation and do not by themselves prove the product-to-category assignments or define an inventory integration contract. Keep the source IDs available in the integration's mapping even if Shopify collections use different handles.

## Questions for the integration team

1. What are the authoritative, stable source product and sellable-variant/item IDs, and how should they map to Shopify IDs and SKU?
2. Which system owns titles, descriptions, images, category membership, base price, stock, and publication state? What are the expected update directions and timing?
3. Are the floral and supplies category configurations authoritative? Should the original department/category IDs be added to product or collection data, and how should ambiguous, placeholder, or shared categories be handled?
4. Is selling unit defined per product or per variant in the inventory system?
5. Are quantity breaks informational only, or must they change the actual Shopify cart and checkout price? If pricing enforcement is required, what Shopify pricing mechanism and rules are intended?
6. What inventory scope and availability/backorder rules should Shopify reflect?
7. Which Shopify order events and fields must return to inventory, and how should updates, cancellations, refunds, and fulfillment be handled?
