# Weekly Specials feed companion

This source builds a small ASP.NET `IHttpHandler` assembly separately from the precompiled legacy application. Its source and project are outside the legacy web root. The build references the existing `MvcApplication1.dll` and does not rebuild or replace it.

The deployment artifact maps the single endpoint path `/api/weekly-specials.ashx`. The Shopify page uses this exact path in its configurable feed URL.

## Required host configuration

The handler requires these existing-site app settings at runtime:

- `WeeklySpecialsFeed.LegacyPublicBaseUrl`: the approved HTTPS origin for the separate legacy server hostname; leave unset until that hostname has been selected and tested.
- `WeeklySpecialsFeed.AllowedOrigins`: comma- or semicolon-separated exact HTTPS Shopify storefront origins. An explicitly configured HTTP loopback origin is accepted for local development only.
- `uploadDirectory`: the existing relative web upload directory setting used by the legacy application.

There are no production-host defaults. If a required value is absent or invalid, the endpoint responds with a generic service-unavailable error. The endpoint does not read or return credentials, PDFs, database details, physical file paths, or other `WebPdfLink` fields.

## Local fixture tests

Run from the repository root in PowerShell, supplying the local application `bin` folder:

```powershell
$legacyBin = 'C:\Users\RJC Office 1\Desktop\website\bin'
$build = Join-Path $env:TEMP 'weekly-specials-feed-build'
dotnet run --project tools\weekly-specials-feed-companion\tests\WeeklySpecialsFeed.Companion.Tests.csproj "-p:LegacyBinPath=$legacyBin" "-p:BaseOutputPath=$build\bin\"
node tools\weekly-specials-feed-companion\tests\WeeklySpecialsAsset.Tests.cjs
```

The C# tests use in-memory `WebPdfLink` fixtures and temporary test images. The JavaScript tests use a small in-memory DOM fixture. Neither suite instantiates `SMARTEntities` or accesses any database.

## IIS Express integration test

Run the isolated, fixture-only IIS Express site from PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File tools\weekly-specials-feed-companion\tests\Run-IisFixture.ps1
```

The script creates a temporary IIS Express configuration and web root, builds a fixture handler which injects in-memory records into the real feed handler, and removes the temporary site when tests finish. The site listens on an available loopback port and allows only the exact development-preview origin passed with `-ShopifyPreviewOrigin` (default: `http://127.0.0.1:9292`). Its app settings use a reserved `.invalid` fixture image host, not a production hostname. It does not read the deployed app configuration, use the production repository, or alter full IIS sites/bindings.

## Local storefront page

Create a Shopify page with handle `weekly-specials`, assign the `page.weekly-specials` template, and set its section's Feed URL to the local fixture endpoint or the eventual approved HTTPS feed URL. The template's feed URL is intentionally blank until explicitly configured. The homepage Weekly Specials tile links to `/pages/weekly-specials`.

The browser fetch uses CORS with no credentials. Configure the exact local storefront origin in the handler's local test host when running a real local HTTP integration test; do not use a wildcard.

## Eventual deployment outline

1. Select the separate legacy hostname and verify its TLS certificate and `/uploads/` flyer URLs.
2. Deploy only the handler mapping and `WeeklySpecialsFeed.Companion.dll` alongside the existing application. Do not replace `MvcApplication1.dll`.
3. Configure the three settings above through the approved server configuration process, with the confirmed hostname and exact storefront origins.
4. Verify the endpoint response, allowed/disallowed origins, cache headers, fixture/live image replacement behavior, and error responses before assigning the Shopify page configuration or moving production links.
