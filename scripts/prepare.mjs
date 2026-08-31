/**
 * Fetch the application under review, and add to it only what an adopter adds.
 *
 * The shop is somebody else's repository. Nothing of it is copied in here: it is
 * cloned at a pinned commit into `app/`, which is ignored, so what this
 * repository holds is the integration and never the subject. A verification that
 * vendored the source would be a verification against a copy that stopped
 * tracking the thing it claims to be about.
 *
 * Five things happen to the checkout, and each is a decision:
 *
 * 1. **The product images are pinned.** The catalogue points every picture at a
 *    CDN. A subject whose bytes arrive over somebody else's network is a subject
 *    that reads differently on a bad afternoon, and the run would report it as a
 *    change. They are downloaded once, into the app's own `public/`, and the
 *    catalogue is rewritten to name them. This is the one edit made to the
 *    application's data, and it is made so the comparison is about the code.
 * 2. **A Storybook is added**, over the components the shop already has. It is
 *    an overlay because it is what an adopter would commit — stories are not a
 *    thing this repository invented for the shop, they are the second surface
 *    the same components are read through.
 * 3. **`next` moves from `14.0.4` to `^14.2.0`.** Storybook's Next framework
 *    requires `>=14.1`, so this is the price of the second surface and it is
 *    paid in the open. A patch-pinned framework moved to its own minor range is
 *    the smallest edit that buys it; the alternative was shimming `next/image`,
 *    `next/link` and `next/navigation`, which would mean the stories render
 *    something the application does not.
 * 4. **`next.config.js` is replaced** by a copy carrying two settings the
 *    reading needs: the image endpoint is bypassed, because it deadlocks under
 *    the concurrency `/sneakers` produces, and the client bundle keeps its
 *    identifiers, because a docket grouped by component cannot be grouped by
 *    `d`. Both are argued at the settings, in `overlay/next.config.js`.
 * 5. **The Storybook toolchain is installed into the app**, not here. Stories
 *    import `next/image` and `@/components/...`; they resolve where the
 *    application resolves — and so the app gets a copy of this repository's
 *    `.npmrc`, which is how `@variance-authority/*` is found at all.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const app = join(root, 'app');

/** The commit this verification was written against. A moving target proves nothing. */
const REMOTE = 'https://github.com/argos-ci/snkr-shop.git';
const COMMIT = 'd5a6ff260bc2c4337fcc5078d93d978494b858d8';

/** Products the routes and the stories actually render. Only these need bytes. */
const PINNED = 20;

const run = (command, args, cwd) =>
  execFileSync(command, args, { cwd, stdio: 'inherit', env: process.env });

if (!existsSync(app)) {
  mkdirSync(app, { recursive: true });
  run('git', ['init', '--quiet'], app);
  run('git', ['remote', 'add', 'origin', REMOTE], app);
  run('git', ['fetch', '--quiet', '--depth', '1', 'origin', COMMIT], app);
  run('git', ['checkout', '--quiet', COMMIT], app);
  console.log(`snkr-shop @ ${COMMIT.slice(0, 12)}`);
}

cpSync(join(root, '.npmrc'), join(app, '.npmrc'));

const manifest = join(app, 'package.json');
const shop = JSON.parse(readFileSync(manifest, 'utf8'));
shop.dependencies['next'] = '^14.2.0';
// esbuild builds Storybook here, and npm will not run its postinstall unbidden.
// Declared rather than approved by hand, so a fresh checkout needs no second command.
shop.allowScripts = { ...shop.allowScripts, esbuild: true };
shop.scripts = {
  ...shop.scripts,
  storybook: 'storybook dev -p 6199 --no-open --quiet',
  'build-storybook': 'storybook build -o storybook-static --quiet',
  // The port `variance/collector.mjs` names. A run reads what the shop deploys,
  // so this is `next start` over a production build and never the dev server.
  'start:variance': 'next start -p 3100',
};
writeFileSync(manifest, `${JSON.stringify(shop, null, 2)}\n`);

run('npm', ['install', '--no-audit', '--no-fund'], app);
run(
  'npm',
  [
    'install',
    '--no-audit',
    '--no-fund',
    '--save-dev',
    'storybook@^9.1.13',
    '@storybook/nextjs-vite@^9.1.13',
    'vite@^6.0.0',
    '@variance-authority/jsx-source@^0.0.0-beta.1',
    '@variance-authority/sense@^0.0.0-beta.1',
  ],
  app,
);

// ---------------------------------------------------------------- pinned bytes

const catalogue = join(app, 'src/assets/data.json');
const products = JSON.parse(readFileSync(catalogue, 'utf8'));
const pictures = join(app, 'public/images/products');
mkdirSync(pictures, { recursive: true });

for (const product of products.slice(0, PINNED)) {
  const local = `/images/products/${product.id}.png`;
  const file = join(app, 'public', local);

  if (!existsSync(file)) {
    const response = await fetch(product.original_picture_url);
    if (!response.ok) {
      throw new Error(`${product.original_picture_url} answered ${response.status}`);
    }
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  }

  product.original_picture_url = local;
}

writeFileSync(catalogue, `${JSON.stringify(products, null, 2)}\n`);
console.log(`${PINNED} product image(s) pinned under public/images/products`);

// -------------------------------------------------------------------- overlay

for (const [entry, target] of [
  ['.storybook', '.storybook'],
  ['stories', 'src/stories'],
  ['next.config.js', 'next.config.js'],
]) {
  rmSync(join(app, target), { recursive: true, force: true });
  cpSync(join(root, 'overlay', entry), join(app, target), { recursive: true });
}

console.log('overlay applied: .storybook, src/stories, next.config.js');

// -------------------------------------------------------- a behaviour to edit

/**
 * One effect, added to the cart row, so the shop has two behaviours in one file.
 *
 * `CartCard` already has a click handler. It gets an impression effect here, and
 * the pair is what `scripts/effect.mjs` and `scripts/handler.mjs` each change one
 * line of. Same component, same file, same import graph, and no pixel moves
 * either way — so a selector that reads only source relations must answer the
 * same for both, and only a run that recorded which regions the shot entered can
 * tell them apart.
 *
 * Applied as a patch rather than shipped in `overlay/` because it belongs to a
 * component the shop wrote. An overlay copy would replace the file, and then the
 * component under review would be this repository's rather than snkr-shop's.
 */
const IMPRESSION = [
  [
    "import products from '@/assets/data.json';",
    "'use client';\n\nimport products from '@/assets/data.json';",
  ],
  [
    "import Link from 'next/link';",
    "import Link from 'next/link';\nimport { useEffect } from 'react';",
  ],
  [
    '  if (!product) return null;',
    [
      '  useEffect(() => {',
      "    const shown = new CustomEvent('cart:row-shown', { detail: item.id });",
      '    window.dispatchEvent(shown);',
      '  }, [item.id]);',
      '',
      '  if (!product) return null;',
    ].join('\n'),
  ],
];

const card = join(app, 'src/components/CartCard.tsx');
let source = readFileSync(card, 'utf8');

for (const [before, after] of IMPRESSION) {
  const found = source.split(before).length - 1;
  if (found !== 1) {
    throw new Error(
      `CartCard.tsx contains ${found} occurrence(s) of ${JSON.stringify(before)} and the ` +
        'impression patch expects exactly one. The shop has moved.',
    );
  }
  source = source.replace(before, after);
}

writeFileSync(card, source);
console.log('patched: CartCard reports an impression');

// ------------------------------------------------------------------- a history

/**
 * The integration, committed into the checkout it was applied to.
 *
 * Not tidiness. `variance run --against` reads the diff from the repository that
 * holds the scanned source, and here that is `app/` — the outer repository was
 * told to ignore it. Left uncommitted, the shop and the integration and the
 * change under review are one undifferentiated working tree, and there is no ref
 * to ask a question against. With this commit there is: the integration is the
 * baseline, and `scripts/revise.mjs` lands the revision on top of it.
 */
if (
  execFileSync('git', ['status', '--porcelain'], { cwd: app, encoding: 'utf8' }).trim() !== ''
) {
  run('git', ['add', '-A'], app);
  run('git', ['-c', 'user.email=variance@example.test', '-c', 'user.name=Variance',
    'commit', '--quiet', '-m',
    'Prepare snkr-shop for variance: pinned images, Storybook overlay, next.config'], app);
  console.log('committed the integration, so the revision has something to be against');
}
