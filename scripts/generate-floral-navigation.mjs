#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const themeDirectory = path.dirname(scriptDirectory);
const configPath = path.join(scriptDirectory, 'floral-departments-review.json');
const departments = [
  { name: 'Flowers', handle: 'flowers', sourceId: 'F', count: 66 },
  { name: 'Roses', handle: 'roses', sourceId: 'R', count: 9 },
  { name: 'Greens', handle: 'greens', sourceId: 'G', count: 28 },
  { name: 'Plants', handle: 'plants', sourceId: 'P', count: 50 },
];
const categoryNameCollator = new Intl.Collator('en', { sensitivity: 'base' });

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function compareCategoryNames(first, second) {
  const firstParts = first.match(/\d+(?:\.\d+)?|\D+/g) ?? [];
  const secondParts = second.match(/\d+(?:\.\d+)?|\D+/g) ?? [];

  for (let index = 0; index < Math.min(firstParts.length, secondParts.length); index += 1) {
    const firstPart = firstParts[index];
    const secondPart = secondParts[index];
    const bothNumeric =
      /^\d+(?:\.\d+)?$/.test(firstPart) && /^\d+(?:\.\d+)?$/.test(secondPart);
    const difference = bothNumeric
      ? Number(firstPart) - Number(secondPart)
      : categoryNameCollator.compare(firstPart, secondPart);
    if (difference !== 0) return difference;
  }

  return firstParts.length - secondParts.length;
}

function validateConfiguration(config) {
  if (!Array.isArray(config?.departments) || config.departments.length !== departments.length) {
    throw new Error('The review configuration must contain all four floral departments.');
  }

  const handles = new Set();
  const entriesByDepartment = new Map();

  for (const [index, expected] of departments.entries()) {
    const department = config.departments[index];
    if (
      department?.department !== expected.name ||
      department?.sourceCategoryId !== expected.sourceId ||
      department?.sourceUrl !==
        `https://www.rjcarbone.com/gallery?category=${expected.sourceId}` ||
      department.categoryCount !== expected.count ||
      !Array.isArray(department.categories) ||
      department.categories.length !== expected.count
    ) {
      throw new Error(`The ${expected.name} configuration must contain exactly ${expected.count} entries.`);
    }

    for (const entry of department.categories) {
      if (
        entry?.department !== expected.name ||
        typeof entry.name !== 'string' ||
        typeof entry.handle !== 'string' ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.handle) ||
        typeof entry.originalCategoryId !== 'string' ||
        !/^[A-Za-z0-9.]+$/.test(entry.originalCategoryId) ||
        entry.originalCategoryId === 'P' ||
        entry.originalCategoryId === 'PZZ' ||
        entry.sourceUrl !==
          `${department.sourceUrl}&productItem=${entry.originalCategoryId}`
      ) {
        throw new Error(`The ${expected.name} configuration contains an invalid category entry.`);
      }

      if (handles.has(entry.handle)) {
        throw new Error(`Duplicate floral collection handle: ${entry.handle}`);
      }
      handles.add(entry.handle);
    }

    entriesByDepartment.set(expected.name, department.categories);
  }

  const tropicalEntries = [...entriesByDepartment.values()]
    .flat()
    .filter((entry) => entry.originalCategoryId === 'GTRO');
  if (
    tropicalEntries.length !== 2 ||
    !tropicalEntries.some(
      (entry) => entry.department === 'Greens' && entry.handle === 'greens-tropical-foliage'
    ) ||
    !tropicalEntries.some(
      (entry) => entry.department === 'Plants' && entry.handle === 'plants-tropical-foliage'
    )
  ) {
    throw new Error('Both separate Tropical Foliage collections must be present.');
  }

  if ([...entriesByDepartment.values()].flat().length !== 153) {
    throw new Error('The review configuration must contain exactly 153 confirmed collections.');
  }

  return entriesByDepartment;
}

function generateCategoryLinks(entriesByDepartment) {
  const lines = [
    '{%- doc -%}',
    '  Renders the complete category link list for a floral department collection.',
    '  @param {string} collection_handle - The department collection handle.',
    '  @example',
    "  {% render 'floral-department-category-links', collection_handle: collection.handle %}",
    '{%- enddoc -%}',
    '{%- case collection_handle -%}',
  ];

  for (const department of departments) {
    lines.push(`  {%- when '${department.handle}' -%}`);
    lines.push('    <ul class="supplies-category-links__list" role="list">');
    const entries = [...entriesByDepartment.get(department.name)].sort((first, second) =>
      compareCategoryNames(first.name, second.name)
    );
    for (const entry of entries) {
      lines.push(
        `      <li class="supplies-category-links__item"><a class="supplies-category-links__link" href="{{ routes.collections_url }}/${entry.handle}">${escapeHtml(entry.name)}</a></li>`
      );
    }
    lines.push('    </ul>');
  }

  lines.push('{%- endcase -%}');
  return `${lines.join('\n')}\n`;
}

function generateBackLinks(department, entries) {
  const lines = [
    '{%- doc -%}',
    `  Renders the Back to ${department.name} link for one of its confirmed category collections.`,
    '  @param {string} collection_handle - The category collection handle.',
    '  @example',
    `  {% render 'floral-department-back-link-${department.handle}', collection_handle: collection.handle %}`,
    '{%- enddoc -%}',
    '{%- case collection_handle -%}',
  ];

  for (const entry of entries) {
    lines.push(`  {%- when '${entry.handle}' -%}`);
    lines.push(
      `    <a href="{{ routes.collections_url }}/${department.handle}">{{ 'actions.back_to' | t: title: '${department.name}' }}</a>`
    );
  }

  lines.push('{%- endcase -%}');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const entriesByDepartment = validateConfiguration(config);
  const outputs = [
    {
      path: path.join(themeDirectory, 'snippets', 'floral-department-category-links.liquid'),
      content: generateCategoryLinks(entriesByDepartment),
    },
    ...departments.map((department) => ({
      path: path.join(
        themeDirectory,
        'snippets',
        `floral-department-back-link-${department.handle}.liquid`
      ),
      content: generateBackLinks(department, entriesByDepartment.get(department.name)),
    })),
  ];

  await Promise.all(outputs.map(({ path: outputPath, content }) => writeFile(outputPath, content)));
  console.log(
    `Generated floral navigation for ${[...entriesByDepartment.values()].flat().length} categories across ${departments.length} departments.`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
