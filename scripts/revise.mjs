/**
 * One commit, three files, and the difference between a docket and a slideshow.
 *
 * This is the change under review. It is written as a patch rather than as a
 * copy of the shop's files for the same reason the shop is cloned rather than
 * vendored: what this repository holds is the integration, and a checked-in copy
 * of somebody else's component is a copy that stops tracking it. Every swap
 * below asserts its `from` appears exactly once, so a shop that moved out from
 * under this script fails loudly instead of silently reviewing two edits.
 *
 * The three edits are chosen for their *shapes*, not for their size. A visual
 * comparison that ranks by changed area orders them almost exactly backwards,
 * and that is the claim this example exists to put a number on.
 *
 * 1. **`ui/button.tsx` — small edit, enormous collateral.** A colour on the
 *    `default` variant and two millimetres of height on `sm`. The colour is a
 *    handful of pixels per button. The height is not: `ProductCard` grows, so
 *    every card in the `/sneakers` grid grows, so every row below the first is
 *    pushed down and *every card on the page* is a rectangle of changed pixels.
 *    Ranked by area, the reviewer is shown the grid; the grid did not change.
 * 2. **`ProductCard.tsx` — local, and about itself.** The price gains cents and
 *    a size. It reaches the two routes that list products and the four
 *    `product-card` stories, and nothing it does not touch moves.
 * 3. **`MainNav.tsx` — a few hundred pixels, everywhere.** The cart badge is in
 *    the layout, so it is in all four routes at both widths and in both
 *    `main-nav` stories: ten subjects, ranked last by area, and the one edit
 *    here that a reviewer skimming a list of thumbnails would never find.
 *
 * The Button edit is also the A/B lattice's business. `product-card--sale` and
 * `product-card--control` differ in the `offer` axis, which is carried by a
 * `Button`; a run that reports both arms moving reports the same cause twice
 * unless it knows the two are one subject at two coordinates.
 *
 *     node scripts/revise.mjs          # apply
 *     node scripts/revise.mjs --undo   # put the shop back
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '../app');

const EDITS = [
  {
    file: 'src/components/ui/button.tsx',
    swaps: [
      [
        "default: 'bg-primary text-primary-foreground hover:bg-primary/90',",
        "default: 'bg-indigo-600 text-white hover:bg-indigo-500',",
      ],
      ["sm: 'h-9 rounded-md px-3',", "sm: 'h-11 rounded-lg px-5',"],
    ],
  },
  {
    file: 'src/components/ProductCard.tsx',
    swaps: [
      [
        '<div className="text-xl font-semibold">${price}</div>',
        '<div className="text-2xl font-semibold tabular-nums">${price}.00</div>',
      ],
    ],
  },
  {
    file: 'src/components/MainNav.tsx',
    swaps: [
      [
        'flex size-5 items-center justify-center rounded-full bg-slate-500',
        'flex size-6 items-center justify-center rounded-full bg-rose-600',
      ],
    ],
  },
];

const undo = process.argv.includes('--undo');

for (const edit of EDITS) {
  const path = join(app, edit.file);
  let source = readFileSync(path, 'utf8');

  for (const [before, after] of edit.swaps) {
    const [from, to] = undo ? [after, before] : [before, after];
    const found = source.split(from).length - 1;

    if (found !== 1) {
      throw new Error(
        `${edit.file} contains ${found} occurrence(s) of \`${from}\`, and this script ` +
          `expects exactly one. The shop has moved, or the revision is already ` +
          `${undo ? 'undone' : 'applied'}.`,
      );
    }

    source = source.replace(from, to);
  }

  writeFileSync(path, source);
  console.log(`${undo ? 'reverted' : 'revised'}: ${edit.file} (${edit.swaps.length} swap(s))`);
}

/**
 * And the same three files, as a commit.
 *
 * This is what `variance run --against HEAD~1` reads. Without it the edit exists
 * only as a dirty working tree, git has no two states to compare, and the run can
 * say which subjects moved but not which files could have moved them — which is
 * the entire question this example was built to ask.
 *
 * Undoing is a mixed reset rather than a second commit. The files on disk have
 * already been put back by the loop above; moving HEAD and the index back to the
 * integration leaves the checkout exactly as `prepare.mjs` left it, and a history
 * that recorded the revision and its retraction would offer `HEAD~1` as a ref
 * meaning something different each time it was asked.
 */
const MESSAGE = 'Restyle the primary button, price and cart badge';
const git = (...args) => execFileSync('git', args, { cwd: app, encoding: 'utf8' });

if (undo) {
  if (git('log', '-1', '--format=%s').trim() === MESSAGE) {
    git('reset', '--quiet', 'HEAD~1');
    console.log('uncommitted the revision; HEAD is the integration again');
  }
} else {
  git('add', '--', ...EDITS.map((edit) => edit.file));
  git('-c', 'user.email=variance@example.test', '-c', 'user.name=Variance',
    'commit', '--quiet', '-m', MESSAGE);
  console.log(`committed: ${MESSAGE}`);
}
