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

const collectionListQuery = `#graphql
  query SuppliesCollections($after: String) {
    collections(first: 250, after: $after) {
      nodes {
        handle
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const collectionCreateMutation = `#graphql
  mutation CreateSuppliesCollection($collection: CollectionCreateInput!) {
    collectionCreate(collection: $collection) {
      collection {
        id
        title
        handle
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
  console.log(`Usage: node scripts/create-supplies-collections.mjs [--apply] [--config path]

Without --apply, the script checks the configured handles and only reports what
it would create. With --apply, it creates missing manual collections.

Required environment variables:
  SHOPIFY_STORE_DOMAIN
  Either SHOPIFY_ADMIN_ACCESS_TOKEN or both SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET

Optional environment variable:
  SHOPIFY_API_VERSION (defaults to ${apiVersion})
`);
}

function validateConfig(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('Configuration must be a non-empty JSON array.');
  }

  const handles = new Set();

  for (const [index, entry] of entries.entries()) {
    if (
      typeof entry?.name !== 'string' ||
      entry.name.trim() === '' ||
      typeof entry?.sourceUrl !== 'string' ||
      typeof entry?.handle !== 'string'
    ) {
      throw new Error(`Configuration entry ${index + 1} must include name, sourceUrl, and handle.`);
    }

    if (!/^https:\/\/www\.rjcarbone\.com\/gallery\?category=S&productItem=[A-Z0-9.]+$/.test(entry.sourceUrl)) {
      throw new Error(`Configuration entry ${index + 1} has an invalid sourceUrl.`);
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.handle)) {
      throw new Error(`Configuration entry ${index + 1} has an invalid handle: ${entry.handle}`);
    }

    if (handles.has(entry.handle)) {
      throw new Error(`Duplicate handle in configuration: ${entry.handle}`);
    }

    handles.add(entry.handle);
  }
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
  if (!grantedScopes.has('write_products')) {
    throw new Error('The installed app must have the write_products scope.');
  }

  return payload.access_token;
}

async function shopifyGraphql(query, variables) {
  const response = await fetch(
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

async function getExistingHandles() {
  const handles = new Set();
  let after = null;

  do {
    const data = await shopifyGraphql(collectionListQuery, { after });
    const result = data?.collections;

    if (!result?.pageInfo || !Array.isArray(result.nodes)) {
      throw new Error('Shopify did not return the collection list and pagination data.');
    }

    for (const collection of result.nodes) {
      handles.add(collection.handle);
    }

    after = result.pageInfo.hasNextPage ? result.pageInfo.endCursor : null;
  } while (after);

  return handles;
}

async function main() {
  const options = getArguments(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const entries = JSON.parse(await readFile(options.configPath, 'utf8'));
  validateConfig(entries);
  validateEnvironment();

  if (useClientCredentials) {
    accessToken = await getClientCredentialsToken();
  }

  console.log(`Mode: ${options.apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Store: ${storeDomain}`);
  console.log(`Configuration entries: ${entries.length}`);

  const existingHandles = await getExistingHandles();
  let skipped = 0;
  let created = 0;
  let failed = 0;

  for (const entry of entries) {
    if (existingHandles.has(entry.handle)) {
      console.log(`[SKIP] ${entry.name} (${entry.handle}) already exists`);
      skipped += 1;
      continue;
    }

    if (!options.apply) {
      console.log(`[DRY RUN] Would create manual collection: ${entry.name} (${entry.handle})`);
      continue;
    }

    try {
      const data = await shopifyGraphql(collectionCreateMutation, {
        collection: {
          title: entry.name,
          handle: entry.handle,
        },
      });
      const result = data?.collectionCreate;

      if (result?.userErrors?.length) {
        for (const error of result.userErrors) {
          const field = error.field?.join('.') ?? 'collection';
          console.error(
            `[API ERROR] ${entry.name} (${entry.handle}) [${field}]: ${redact(error.message)}`
          );
        }
        failed += 1;
        continue;
      }

      if (!result?.collection) {
        console.error(`[API ERROR] ${entry.name} (${entry.handle}): Shopify returned no collection.`);
        failed += 1;
        continue;
      }

      existingHandles.add(result.collection.handle);
      console.log(
        `[CREATED] ${result.collection.title} (${result.collection.handle}) ${result.collection.id}`
      );
      created += 1;
    } catch (error) {
      console.error(`[API ERROR] ${entry.name} (${entry.handle}): ${redact(error.message)}`);
      failed += 1;
    }
  }

  if (options.apply) {
    console.log(`Summary: ${created} created, ${skipped} skipped, ${failed} failed.`);
  } else {
    const planned = entries.length - skipped;
    console.log(`Summary: ${planned} would be created, ${skipped} skipped, 0 written.`);
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(redact(error.message));
  process.exitCode = 1;
});
