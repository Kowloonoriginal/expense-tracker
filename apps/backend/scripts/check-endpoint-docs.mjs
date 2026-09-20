#!/usr/bin/env node
/**
 * Keeps the API Endpoints table in apps/backend/CLAUDE.md honest.
 *
 * A stale table is worse than none: it tells a reader — human or Claude — that
 * a route exists when it does not, or hides one that does. This reads the
 * routes out of the controllers, reads the table out of the doc, and exits
 * non-zero when they disagree.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(BACKEND_ROOT, 'src');
const DOC_PATH = join(BACKEND_ROOT, 'CLAUDE.md');
const TABLE_HEADING = '### API Endpoints';

const HTTP_DECORATORS = [
  'Get',
  'Post',
  'Put',
  'Patch',
  'Delete',
  'Head',
  'All',
];

/** Every *.controller.ts under src, recursively. */
function findControllers(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return findControllers(full);
    return entry.endsWith('.controller.ts') ? [full] : [];
  });
}

/** `/a/` + `b` -> `/a/b`; empty segments collapse; root stays `/`. */
function joinRoute(prefix, path) {
  const segments = [prefix, path]
    .flatMap((part) => part.split('/'))
    .filter(Boolean);
  return segments.length ? `/${segments.join('/')}` : '/';
}

/**
 * Pull `METHOD /path` out of one controller. Deliberately regex-based rather
 * than a TS parse: the decorators this looks for are a fixed, simple shape,
 * and a dependency-free check is one that actually keeps running in CI.
 */
function routesFromController(file) {
  const source = readFileSync(file, 'utf8');

  const controllerMatch = source.match(/@Controller\(\s*(?:'([^']*)')?\s*\)/);
  if (!controllerMatch) return [];
  const prefix = controllerMatch[1] ?? '';

  const decorator = new RegExp(
    `@(${HTTP_DECORATORS.join('|')})\\(\\s*(?:'([^']*)')?\\s*\\)`,
    'g',
  );

  const routes = [];
  for (const match of source.matchAll(decorator)) {
    const method = match[1].toUpperCase();
    const route = joinRoute(prefix, match[2] ?? '');
    routes.push(`${method} ${route}`);
  }
  return routes;
}

/** The `| METHOD | `/path` |` rows under the API Endpoints heading. */
function routesFromDoc() {
  const doc = readFileSync(DOC_PATH, 'utf8');

  const start = doc.indexOf(TABLE_HEADING);
  if (start === -1) {
    fail(`"${TABLE_HEADING}" heading is missing from ${DOC_PATH}`);
  }

  // The table ends at the next heading of any level.
  const rest = doc.slice(start + TABLE_HEADING.length);
  const nextHeading = rest.search(/^#{1,6} /m);
  const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading);

  const routes = [];
  for (const line of section.split('\n')) {
    const row = line.match(/^\|\s*([A-Z]+)\s*\|\s*`([^`]+)`\s*\|/);
    if (row) routes.push(`${row[1]} ${row[2]}`);
  }

  if (routes.length === 0) {
    fail(`no endpoint rows found under "${TABLE_HEADING}" in ${DOC_PATH}`);
  }
  return routes;
}

function fail(message) {
  console.error(`check-endpoint-docs: ${message}`);
  process.exit(1);
}

function main() {
  const controllers = findControllers(SRC_DIR);
  if (controllers.length === 0)
    fail(`no *.controller.ts found under ${SRC_DIR}`);

  const inCode = new Set(controllers.flatMap(routesFromController));
  const inDoc = new Set(routesFromDoc());

  const undocumented = [...inCode].filter((route) => !inDoc.has(route)).sort();
  const stale = [...inDoc].filter((route) => !inCode.has(route)).sort();

  if (undocumented.length === 0 && stale.length === 0) {
    console.log(
      `check-endpoint-docs: ${inCode.size} routes, CLAUDE.md table matches.`,
    );
    return;
  }

  if (undocumented.length) {
    console.error('\nIn the controllers but missing from the table:');
    for (const route of undocumented) console.error(`  + ${route}`);
  }
  if (stale.length) {
    console.error('\nIn the table but not in any controller:');
    for (const route of stale) console.error(`  - ${route}`);
  }
  console.error(
    `\nUpdate the API Endpoints table in apps/backend/CLAUDE.md to match.`,
  );
  process.exit(1);
}

main();
