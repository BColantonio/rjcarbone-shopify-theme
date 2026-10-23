#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultConfigPath = path.join(scriptDirectory, 'supplies-collections.json');
const apiVersion = process.env.SHOPIFY_API_VERSION ?? '2026-10';
const clientCredentialsStoreDomain = '0igxkv-sp.myshopify.com';
const storeDomain = process.env.SHOPIFY_STORE_DOMAIN ?? clientCredentialsStoreDomain;
const clientId = process.env.SHOPIFY_CLIENT_ID;
const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
const useClientCredentials = Boolean(clientId && clientSecret);
let accessToken = useClientCredentials ? undefined : process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

const publicationsQuery = `#graphql
  query SuppliesPublications($after: String) {
    publications(first: 250, after: $after) {
      nodes {
        id
        name
        channels(first: 100) {
          nodes {
            name
          }
          pageInfo {
            hasNextPage
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const collectionByHandleQuery = `#graphql
  query SuppliesCollectionByHandle(
    $identifier: CollectionIdentifierInput!,
    $publicationId: ID!
  ) {
    collectionByIdentifier(identifier: $identifier) {
      id
      handle
      publishedOnPublication(publicationId: $publicationId)
    }
  }
`;

const publishCollectionMutation = `#graphql
  mutation PublishSuppliesCollection($collectionId: ID!, $publicationId: ID!) {
    publishablePublish(
      id: $collectionId
      input: { publicationId: $publicationId }
    ) {
      publishable {
        ... on Collection {
          id
          handle
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

function getArguments(args) {
  const options = { apply: false, configPath: defaultConfigPath };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === '--apply') {
      options.apply = true;
    } else if (argument === '--config') {
      const configPath = args[index + 1];
      if (!configPath || configPath.startsWith('--')) {
        throw new Error('--config requires a file path.');
      }
      options.configPath = path.resolve(configPath);
      index += 1;
    } else if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/publish-supplies-collections.mjs [--apply] [--config path]

Without --apply, the script reports which configured collections are unpublished
to Online Store. With --apply, it publishes only those collections to Online Store.
For the Supplies configuration, the collection with handle "zzz" is excluded.
Department configurations include only their configured confirmed categories.

Required environment variables:
  Either SHOPIFY_ADMIN_ACCESS_TOKEN or both SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET

Optional environment variable:
  SHOPIFY_STORE_DOMAIN (defaults to ${clientCredentialsStoreDomain})
  SHOPIFY_API_VERSION (defaults to ${apiVersion})
`);
}

function validateConfig(config) {
  let entries;
  let departmentConfiguration = false;

  if (Array.isArray(config)) {
    entries = config;
  } else if (Array.isArray(config?.departments) && config.departments.length > 0) {
    departmentConfiguration = true;
    const expectedDepartments = [
      { name: 'Flowers', id: 'F', count: 66 },
      { name: 'Roses', id: 'R', count: 9 },
      { name: 'Greens', id: 'G', count: 28 },
      { name: 'Plants', id: 'P', count: 50 },
    ];

    if (config.departments.length !== expectedDepartments.length) {
      throw new Error('Department configuration must contain Flowers, Roses, Greens, and Plants.');
    }

    entries = [];
    for (const [index, expected] of expectedDepartments.entries()) {
      const department = config.departments[index];
      if (
        department?.department !== expected.name ||
        department?.sourceCategoryId !== expected.id ||
        department?.sourceUrl !==
          `https://www.rjcarbone.com/gallery?category=${expected.id}` ||
        !Array.isArray(department.categories) ||
        department.categories.length !== expected.count ||
        department.categoryCount !== expected.count
      ) {
        throw new Error(`Department configuration for ${expected.name} is invalid.`);
      }

      for (const [categoryIndex, category] of department.categories.entries()) {
        if (
          category?.department !== expected.name ||
          typeof category?.originalCategoryId !== 'string' ||
          !/^[A-Za-z0-9.]+$/.test(category.originalCategoryId) ||
          category.originalCategoryId === 'P' ||
          category.originalCategoryId === 'PZZ' ||
          category.sourceUrl !==
            `${department.sourceUrl}&productItem=${category.originalCategoryId}`
        ) {
          throw new Error(
            `Category ${categoryIndex + 1} in ${expected.name} has invalid source metadata.`
          );
        }
        entries.push(category);
      }
    }
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('Configuration must be a non-empty JSON array or department configuration.');
  }

  if (departmentConfiguration) {
    if (entries.length !== 153) {
      throw new Error(`Department configuration must contain exactly 153 confirmed categories.`);
    }

    const tropicalFoliage = entries.filter((entry) => entry.originalCategoryId === 'GTRO');
    if (
      tropicalFoliage.length !== 2 ||
      !tropicalFoliage.some((entry) => entry.department === 'Greens' && entry.handle === 'greens-tropical-foliage') ||
      !tropicalFoliage.some((entry) => entry.department === 'Plants' && entry.handle === 'plants-tropical-foliage')
    ) {
      throw new Error('Department configuration must retain both Tropical Foliage collections.');
    }
  }

  const handles = new Set();

  for (const [index, entry] of entries.entries()) {
    if (
      typeof entry?.name !== 'string' ||
      entry.name.trim() === '' ||
      typeof entry?.handle !== 'string' ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.handle) ||
      (departmentConfiguration &&
        (typeof entry.department !== 'string' ||
          typeof entry.originalCategoryId !== 'string'))
    ) {
      const fields = departmentConfiguration
        ? 'name, department, originalCategoryId, and valid handle'
        : 'name and valid handle';
      throw new Error(`Configuration entry ${index + 1} must include ${fields}.`);
    }

    if (handles.has(entry.handle)) {
      throw new Error(`Duplicate handle in configuration: ${entry.handle}`);
    }

    handles.add(entry.handle);
  }

  return { entries, departmentConfiguration };
}

function validateEnvironment() {
  if (!accessToken && (!clientId || !clientSecret)) {
    throw new Error(
      'Set SHOPIFY_ADMIN_ACCESS_TOKEN or both SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET.'
    );
  }

  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(storeDomain)) {
    throw new Error('SHOPIFY_STORE_DOMAIN must be a Shopify *.myshopify.com domain.');
  }

  if (!/^\d{4}-\d{2}$/.test(apiVersion)) {
    throw new Error('SHOPIFY_API_VERSION must use the YYYY-MM format.');
  }

  if (useClientCredentials && storeDomain !== clientCredentialsStoreDomain) {
    throw new Error(`Client credentials are restricted to ${clientCredentialsStoreDomain}.`);
  }
}

function redact(value) {
  const message = String(value);
  return [accessToken, clientId, clientSecret]
    .filter(Boolean)
    .reduce((sanitized, credential) => sanitized.split(credential).join('[redacted]'), message);
}

async function getClientCredentialsToken() {
  let response;
  try {
    response = await fetch(
      `https://${clientCredentialsStoreDomain}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      }
    );
  } catch {
    throw new Error('Shopify client credentials request failed before a response was received.');
  }

  if (!response.ok) {
    throw new Error(`Shopify client credentials request failed (HTTP ${response.status}).`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Shopify client credentials request returned an invalid response.');
  }

  if (typeof payload?.access_token !== 'string' || payload.access_token.length === 0) {
    throw new Error('Shopify client credentials response did not contain an access token.');
  }

  const grantedScopes = new Set(
    typeof payload.scope === 'string' ? payload.scope.split(/[,\s]+/).filter(Boolean) : []
  );
  const effectiveScopes = new Set(grantedScopes);
  if (grantedScopes.has('write_publications')) {
    effectiveScopes.add('read_publications');
  }
  if (grantedScopes.has('write_products')) {
    effectiveScopes.add('read_products');
  }

  const requiredScopes = ['read_publications', 'write_publications', 'read_products'];
  const missingScopes = requiredScopes.filter((scope) => !effectiveScopes.has(scope));
  if (missingScopes.length > 0) {
    const grantedScopeNames = [...grantedScopes].sort();
    throw new Error(
      `Granted scopes: ${grantedScopeNames.length ? grantedScopeNames.join(', ') : 'none'}\n` +
      `Missing scopes: ${missingScopes.join(', ')}`
    );
  }

  return payload.access_token;
}

async function shopifyGraphql(query, variables) {
  let response;
  try {
    response = await fetch(
      `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({ query, variables }),
      }
    );
  } catch {
    throw new Error('Shopify Admin API request failed before a response was received.');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Shopify returned a non-JSON response (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const messages = payload.errors?.map(({ message }) => redact(message)).join('; ');
    throw new Error(`Shopify API request failed (HTTP ${response.status})${messages ? `: ${messages}` : '.'}`);
  }

  if (payload.errors?.length) {
    throw new Error(payload.errors.map(({ message }) => redact(message)).join('; '));
  }

  return payload.data;
}

async function getOnlineStorePublication() {
  const matches = [];
  let after = null;

  do {
    const data = await shopifyGraphql(publicationsQuery, { after });
    const result = data?.publications;

    if (!result?.pageInfo || !Array.isArray(result.nodes)) {
      throw new Error('Shopify did not return publication and pagination data.');
    }

    for (const publication of result.nodes) {
      const channels = publication.channels;
      if (channels?.pageInfo?.hasNextPage) {
        throw new Error('Shopify returned too many channels to identify Online Store safely.');
      }

      const channelNames = channels?.nodes?.map((channel) => channel.name) ?? [];
      if (channelNames.includes('Online Store')) {
        matches.push(publication);
      }
    }

    after = result.pageInfo.hasNextPage ? result.pageInfo.endCursor : null;
  } while (after);

  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one Online Store publication, but Shopify returned ${matches.length} matches.`
    );
  }

  return matches[0];
}

async function main() {
  const options = getArguments(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const config = JSON.parse(await readFile(options.configPath, 'utf8'));
  const { entries, departmentConfiguration } = validateConfig(config);
  validateEnvironment();

  if (useClientCredentials) {
    accessToken = await getClientCredentialsToken();
  }

  const publication = await getOnlineStorePublication();
  const entriesToPublish = departmentConfiguration
    ? entries
    : entries.filter((entry) => entry.handle !== 'zzz');

  console.log(`Mode: ${options.apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Store: ${storeDomain}`);
  console.log(`Online Store publication identified: ${publication.name} (${publication.id})`);
  console.log(
    departmentConfiguration
      ? `Configured collections: ${entriesToPublish.length}`
      : `Configured collections: ${entriesToPublish.length} (zzz excluded)`
  );

  let published = 0;
  let skipped = 0;
  let missing = 0;
  let failed = 0;

  for (const entry of entriesToPublish) {
    try {
      const data = await shopifyGraphql(collectionByHandleQuery, {
        identifier: { handle: entry.handle },
        publicationId: publication.id,
      });
      const collection = data?.collectionByIdentifier;

      if (!collection) {
        console.error(`[MISSING] ${entry.name} (${entry.handle}) was not found.`);
        missing += 1;
        continue;
      }

      if (collection.handle !== entry.handle) {
        console.error(
          `[API ERROR] Requested handle ${entry.handle}, but Shopify returned ${collection.handle}.`
        );
        failed += 1;
        continue;
      }

      if (collection.publishedOnPublication) {
        console.log(`[SKIP] ${entry.name} (${entry.handle}) is already published to Online Store.`);
        skipped += 1;
        continue;
      }

      if (!options.apply) {
        console.log(`[DRY RUN] Would publish ${entry.name} (${entry.handle}) to Online Store.`);
        continue;
      }

      const publishData = await shopifyGraphql(publishCollectionMutation, {
        collectionId: collection.id,
        publicationId: publication.id,
      });
      const result = publishData?.publishablePublish;

      if (result?.userErrors?.length) {
        for (const error of result.userErrors) {
          const field = error.field?.join('.') ?? 'publication';
          console.error(
            `[API ERROR] ${entry.name} (${entry.handle}) [${field}]: ${redact(error.message)}`
          );
        }
        failed += 1;
        continue;
      }

      if (!result?.publishable) {
        console.error(`[API ERROR] ${entry.name} (${entry.handle}): Shopify returned no publishable.`);
        failed += 1;
        continue;
      }

      console.log(`[PUBLISHED] ${entry.name} (${entry.handle}) to Online Store.`);
      published += 1;
    } catch (error) {
      console.error(`[API ERROR] ${entry.name} (${entry.handle}): ${redact(error.message)}`);
      failed += 1;
    }
  }

  if (options.apply) {
    console.log(`Summary: ${published} published, ${skipped} skipped, ${missing} missing, ${failed} failed.`);
  } else {
    const planned = entriesToPublish.length - skipped - missing - failed;
    console.log(
      `Summary: ${planned} would be published, ${skipped} skipped, ${missing} missing, ${failed} errors, 0 written.`
    );
  }

  if (missing > 0 || failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(redact(error.message));
  process.exitCode = 1;
});
