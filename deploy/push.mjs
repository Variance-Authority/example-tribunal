/**
 * Push this example's last run into the deployment.
 *
 * `review.endpoint` is a literal in `variance.config.json` and there is no flag
 * to override it, which is correct: where a build is recorded is a property of
 * the project, not of the person running the command. The repository's config
 * points at `127.0.0.1:7789`, because the local flow is what the README walks
 * through, and it should keep pointing there.
 *
 * So this writes the one edit the README describes into a copy and pushes with
 * that. The copy sits beside the original so every relative path in it still
 * resolves, and it is not committed.
 *
 *     VARIANCE_INGEST_TOKEN=… node deploy/push.mjs
 *
 * The address comes from `deploy/wrangler.jsonc` — the custom domain if one is
 * claimed there, and the argument overrides it, which is what you want on the
 * day DNS has not finished propagating:
 *
 *     VARIANCE_INGEST_TOKEN=… node deploy/push.mjs https://tribunal-example.machine-garden.workers.dev
 *
 * The ingest token is the only one that belongs here. The review token decides
 * subjects, and a machine that records builds has no business deciding them.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CONFIG = fileURLToPath(new URL('../variance.config.json', import.meta.url));
const COPY = fileURLToPath(new URL('../variance.config.deploy.json', import.meta.url));
const WRANGLER = fileURLToPath(new URL('wrangler.jsonc', import.meta.url));

if ((process.env.VARIANCE_INGEST_TOKEN ?? '') === '') {
  process.stderr.write(
    'VARIANCE_INGEST_TOKEN is not set. It is the token `npm run provision` printed\n' +
      'as INGEST_TOKEN — not REVIEW_TOKEN, which decides subjects and does not belong\n' +
      'in anything that records a build.\n',
  );
  process.exit(2);
}

const claimed = /"pattern":\s*"([^"]+)"/.exec(readFileSync(WRANGLER, 'utf8'));
const endpoint =
  process.argv[2] ?? (claimed === null ? undefined : `https://${claimed[1]}`);
if (endpoint === undefined) {
  process.stderr.write(
    'No address. `deploy/wrangler.jsonc` claims no custom domain, so pass the\n' +
      'workers.dev one as an argument.\n',
  );
  process.exit(2);
}

const configuration = JSON.parse(readFileSync(CONFIG, 'utf8'));
configuration.review = { ...configuration.review, endpoint };
writeFileSync(COPY, `${JSON.stringify(configuration, null, 2)}\n`);

/** A build with no commit is a build nothing can be compared against later. */
const git = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

process.stdout.write(`pushing to ${endpoint}\n`);

/**
 * `variance push` reports its own failures, and exits 2 for an operator error.
 * Rethrowing here would bury that under a Node stack trace about a child
 * process, so this passes the status through and says nothing of its own.
 */
try {
  execFileSync(
    'npx',
    [
      'variance',
      'push',
      '--config',
      COPY,
      '--run',
      `deploy-${Date.now().toString(36)}`,
      '--commit',
      git(['rev-parse', 'HEAD']),
      '--branch',
      git(['rev-parse', '--abbrev-ref', 'HEAD']),
    ],
    { stdio: 'inherit' },
  );
} catch (error) {
  process.exit(typeof error.status === 'number' ? error.status : 2);
}
