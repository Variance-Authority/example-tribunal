/**
 * A one-line edit that changes what a component does and nothing about how it looks.
 *
 * Two scripts use this and they are a matched pair: [`effect.mjs`](./effect.mjs)
 * edits the body of `CartCard`'s impression effect,
 * [`handler.mjs`](./handler.mjs) edits the body of its Remove button's `onClick`.
 * One file, one component, one import graph, and no pixel moves either way — so
 * every selector that reads source relations alone must answer the same for
 * both, and the two are only separable by what the last run actually entered.
 *
 * The commit is not tidiness either. `variance run --since HEAD~1` reads a diff,
 * and without a commit there is no diff, nothing can be ruled out, and the run
 * observes all twenty-one — which is the answer these scripts exist to be
 * distinguished from.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '../app');

/**
 * Apply the edit, or put it back, and move the branch either way.
 *
 * `--undo` resets rather than reverting, because the point of the commit is to
 * be the tip a `--since` is measured against. A revert would leave two commits
 * and make `HEAD~1` the edit itself.
 */
export function behaviour({ file, before, after, message }) {
  const undo = process.argv.includes('--undo');
  const [from, to] = undo ? [after, before] : [before, after];

  const path = join(app, file);
  const source = readFileSync(path, 'utf8');
  const found = source.split(from).length - 1;

  if (found !== 1) {
    throw new Error(
      `${file} contains ${found} occurrence(s) of the line this script rewrites, and it ` +
        `expects exactly one. The shop has moved, or the edit is already ` +
        `${undo ? 'reverted' : 'applied'}.`,
    );
  }

  writeFileSync(path, source.replace(from, to));
  console.log(`${undo ? 'reverted' : 'applied'}: ${file}`);

  const git = (...args) => execFileSync('git', args, { cwd: app, encoding: 'utf8' });

  if (undo) {
    if (git('log', '-1', '--format=%s').trim() === message) {
      git('reset', '--quiet', 'HEAD~1');
      console.log('uncommitted the edit');
    }
    return;
  }

  git('add', '--', file);
  git('-c', 'user.email=variance@example.test', '-c', 'user.name=Variance',
    'commit', '--quiet', '-m', message);
  console.log(`committed: ${message}`);
}
