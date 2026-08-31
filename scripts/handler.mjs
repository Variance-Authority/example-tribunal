/**
 * One line, inside an `onClick`, that one shot in the cart runs.
 *
 * The half of the pair a run should almost entirely skip. Guarding Remove with a
 * confirmation changes what the button *does* and nothing about what it *is* —
 * same tree, same text, same box, same colour. No visual tool can report it, and
 * none should pretend to.
 *
 * What a tool can be asked is the question before that one: **which subjects did
 * you look at, and how do you know the rest were safe to skip?** Three stories
 * mount `CartCard` and exactly one of them clicks its button, so exactly one of
 * them has ever entered the lines this script rewrites. That is a sentence
 * checkable against the run it came from, and it is a different sentence from
 * the one [`effect.mjs`](./effect.mjs) produces out of an edit the same size, to
 * the same file, four lines away.
 *
 * The edit is in the one component whose reach is small. `Button` is in every
 * story and every route; `MainNav` is in the layout. `CartCard` is in three
 * stories and one route, so the narrowing has something to say.
 *
 *     node scripts/handler.mjs          # apply
 *     node scripts/handler.mjs --undo   # put the shop back
 */
import { behaviour } from './behaviour.mjs';

behaviour({
  file: 'src/components/CartCard.tsx',
  before: '            onClick={() => onRemove(item.id)}\n',
  after:
    '            onClick={() => {\n' +
    '              if (confirm(`Remove ${product.name} from your cart?`)) onRemove(item.id);\n' +
    '            }}\n',
  message: 'Confirm before removing a cart item',
});
