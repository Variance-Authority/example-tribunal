/**
 * One line, inside a `useEffect`, that every shot in the cart runs.
 *
 * The half of the pair the run **must not** skip. Three stories mount
 * `CartCard`, three stories run its impression effect, and a change to the
 * effect's body is a change to code all three of them executed — so a selector
 * with a recorded journey has to keep all three, and one that skipped any of
 * them would be wrong in the direction that loses a regression.
 *
 * Read against [`handler.mjs`](./handler.mjs), which edits the same file by the
 * same amount and is safe to skip almost entirely. Nothing in the diff, the
 * import graph or the baselines separates them. What separates them is the
 * question this project answers and a file-relations selector cannot ask:
 * **which of these lines did the last run go through?**
 *
 *     node scripts/effect.mjs          # apply
 *     node scripts/effect.mjs --undo   # put the shop back
 */
import { behaviour } from './behaviour.mjs';

behaviour({
  file: 'src/components/CartCard.tsx',
  before: "    const shown = new CustomEvent('cart:row-shown', { detail: item.id });\n",
  after: "    const shown = new CustomEvent('cart:row-shown', { detail: { id: item.id } });\n",
  message: 'Send the cart impression as a keyed detail',
});
