/**
 * One line, inside an `onClick`, and the question every selector in this
 * category answers by guessing.
 *
 * The restyle in [`revise.mjs`](./revise.mjs) is the easy half: it moves pixels,
 * so a comparison finds it. This is the other half. Guarding the cart's Remove
 * button with a confirmation changes what the button *does* and nothing about
 * what it *is* — same tree, same text, same box, same colour. No visual tool can
 * report it, and none should pretend to.
 *
 * What a tool can be asked is the question before that one: **which subjects did
 * you look at, and how do you know the rest were safe to skip?** A suite that
 * answers *all twenty, every time* has not answered it. A suite that answers
 * *two, because only two baselines record `CartCard`* has, and the sentence is
 * checkable against the baselines it was derived from.
 *
 * The edit is deliberately in the one component whose reach is small. `Button`
 * is in every story and every route; `MainNav` is in the layout. `CartCard` is
 * in two stories and one route, so the narrowing has something to say — and the
 * run that follows is the shape a reviewer actually gets from a behavioural
 * change: a handful of subjects observed, none of them moved, and a diff that
 * accounts for both.
 *
 *     node scripts/handler.mjs          # apply
 *     node scripts/handler.mjs --undo   # put the shop back
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '../app');

const FILE = 'src/components/CartCard.tsx';
const BEFORE = '            onClick={() => onRemove(item.id)}\n';
const AFTER =
  '            onClick={() => {\n' +
  '              if (confirm(`Remove ${product.name} from your cart?`)) onRemove(item.id);\n' +
  '            }}\n';

const undo = process.argv.includes('--undo');
const [from, to] = undo ? [AFTER, BEFORE] : [BEFORE, AFTER];

const path = join(app, FILE);
const source = readFileSync(path, 'utf8');
const found = source.split(from).length - 1;

if (found !== 1) {
  throw new Error(
    `${FILE} contains ${found} occurrence(s) of the handler this script rewrites, and it ` +
      `expects exactly one. The shop has moved, or the guard is already ` +
      `${undo ? 'removed' : 'applied'}.`,
  );
}

writeFileSync(path, source.replace(from, to));
console.log(`${undo ? 'reverted' : 'guarded'}: ${FILE}`);

/**
 * And the same file, as a commit, for the same reason `revise.mjs` commits.
 *
 * `--since HEAD~1` reads a diff. Without a commit there is no diff, the run
 * cannot rule anything out, and it observes all twenty — which is the answer
 * this script exists to distinguish itself from.
 */
const MESSAGE = 'Confirm before removing a cart item';
const git = (...args) => execFileSync('git', args, { cwd: app, encoding: 'utf8' });

if (undo) {
  if (git('log', '-1', '--format=%s').trim() === MESSAGE) {
    git('reset', '--quiet', 'HEAD~1');
    console.log('uncommitted the guard');
  }
} else {
  git('add', '--', FILE);
  git('-c', 'user.email=variance@example.test', '-c', 'user.name=Variance',
    'commit', '--quiet', '-m', MESSAGE);
  console.log(`committed: ${MESSAGE}`);
}
