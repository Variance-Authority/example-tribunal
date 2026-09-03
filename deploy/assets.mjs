import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Put the review bundle where the `assets` binding will find it.
 *
 * The bundle is built by the repository that publishes
 * `@variance-authority/tribunal` and shipped inside the tarball — a bundler is
 * not something an adopter of a visual-regression tool should have to install.
 * So this is a copy, not a build, and `deploy/public` is a build artefact of a
 * dependency: generated before every deploy and never committed.
 *
 * Resolved through `require.resolve` rather than a path into `node_modules`,
 * because the package manager decides where a package lands and a hardcoded
 * path is a guess that breaks the first time somebody hoists differently. The
 * package's own entry is what is asked for — it does not export
 * `./package.json` — and the bundle sits beside it in `dist`.
 */
const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

const from = join(dirname(require.resolve('@variance-authority/tribunal')), 'ui/review.bundle.js');
const to = join(here, 'public/ui/review.js');

mkdirSync(dirname(to), { recursive: true });
try {
  copyFileSync(from, to);
} catch (error) {
  // Said rather than swallowed: without this file the page renders an empty div
  // and a 404 in a console nobody opened, which is the failure mode the package
  // itself goes out of its way to avoid.
  console.error(
    `the review bundle is not in this install: ${from} — ` +
      `reinstall @variance-authority/tribunal from the registry (${error.message})`,
  );
  process.exit(1);
}

console.log(`review bundle -> ${to}`);
