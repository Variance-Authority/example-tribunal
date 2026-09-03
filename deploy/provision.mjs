/**
 * Everything this deployment needs from a Cloudflare account, in one command.
 *
 * The setup is four account-scoped facts: a D1 database, an R2 bucket, the
 * schema inside the database, and two secrets. Each of them is a `wrangler`
 * invocation, and a README that lists four invocations is a script somebody
 * has not written yet — the third one silently depends on the first having
 * printed an id into a file, and the fourth cannot be copied and pasted at all
 * because the value has to be generated and captured in the same shell.
 *
 * So this is that script. It is idempotent: it asks what already exists before
 * it creates anything, and it never rewrites a secret it did not just make.
 * Running it twice is how you check the deployment is still provisioned.
 *
 *     node deploy/provision.mjs
 *     node deploy/provision.mjs --rotate   # new tokens, printed once
 *
 * It does not deploy. `npm run deploy` publishes the Worker, and that stays a
 * separate word because it is the one that puts a page on the internet.
 */

import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CONFIG = fileURLToPath(new URL('wrangler.jsonc', import.meta.url));
const DATABASE = 'variance-tribunal-example';
const BUCKET = 'variance-tribunal-example';

const rotate = process.argv.includes('--rotate');
const made = [];

/** `stdio: inherit` on stderr so wrangler's own diagnosis reaches the operator. */
function wrangler(args, { capture = true } = {}) {
  return execFileSync('npx', ['wrangler', ...args], {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
}

function say(line) {
  process.stdout.write(`${line}\n`);
}

// 1. The database. `d1 create` prints the id; `d1 list` knows it afterwards,
//    which is what makes a second run cost nothing.
let database = JSON.parse(wrangler(['d1', 'list', '--json'])).find((one) => one.name === DATABASE);
if (database === undefined) {
  wrangler(['d1', 'create', DATABASE], { capture: false });
  database = JSON.parse(wrangler(['d1', 'list', '--json'])).find((one) => one.name === DATABASE);
  if (database === undefined) throw new Error(`created ${DATABASE} and then could not find it`);
  made.push(`D1 database ${DATABASE}`);
  say(`created D1 database ${DATABASE}`);
} else {
  say(`D1 database ${DATABASE} is ${database.uuid}`);
}

// 2. The id, into the file. It is account-scoped and not a secret, which is why
//    it belongs in `wrangler.jsonc` and gets committed. Written as a targeted
//    replacement rather than a re-serialisation, because the file is JSONC and
//    every comment in it is load-bearing.
const configuration = readFileSync(CONFIG, 'utf8');
const currently = /"database_id":\s*"([^"]*)"/.exec(configuration);
if (currently === null) throw new Error(`no "database_id" in ${CONFIG}`);
if (currently[1] !== database.uuid) {
  writeFileSync(CONFIG, configuration.replace(currently[0], `"database_id": "${database.uuid}"`));
  say(`wrote that id into deploy/wrangler.jsonc — commit it`);
}

// 3. The bucket. `r2 bucket list` has no JSON mode, and its output is a block
//    of `key: value` lines per bucket.
const buckets = wrangler(['r2', 'bucket', 'list'])
  .split('\n')
  .flatMap((line) => (line.startsWith('name:') ? [line.slice(5).trim()] : []));
if (buckets.includes(BUCKET)) {
  say(`R2 bucket ${BUCKET} exists`);
} else {
  wrangler(['r2', 'bucket', 'create', BUCKET], { capture: false });
  made.push(`R2 bucket ${BUCKET}`);
  say(`created R2 bucket ${BUCKET}`);
}

// 4. The schema. `migrations apply` is itself idempotent — it applies what the
//    `d1_migrations` table says is missing and nothing else — so this runs
//    every time and is also how an upgrade lands.
say('applying migrations');
wrangler(['d1', 'migrations', 'apply', DATABASE, '--remote', '--config', CONFIG], { capture: false });

// 5. The tokens. These are the reason this file exists: the value has to be
//    generated and handed to `wrangler` without a human retyping it, and it has
//    to be printed exactly once, because nothing can read it back afterwards.
const existing = new Set(
  JSON.parse(wrangler(['secret', 'list', '--config', CONFIG])).map((secret) => secret.name),
);
const minted = [];
for (const name of ['INGEST_TOKEN', 'REVIEW_TOKEN']) {
  if (existing.has(name) && !rotate) {
    say(`${name} is already set — pass --rotate to replace it`);
    continue;
  }
  const token = randomBytes(24).toString('hex');
  execFileSync('npx', ['wrangler', 'secret', 'put', name, '--config', CONFIG], {
    input: token,
    stdio: ['pipe', 'ignore', 'inherit'],
  });
  minted.push([name, token]);
  made.push(name);
}

if (minted.length > 0) {
  say('');
  say('Written to the deployment and printed here once. Nothing can read them back.');
  say('');
  for (const [name, token] of minted) say(`  ${name}=${token}`);
  say('');
  say('INGEST_TOKEN is what CI pushes builds with. REVIEW_TOKEN is the only thing');
  say('that can decide a subject, and does not belong in CI.');
}

// 6. The address. No wrangler command lists an account's zones, so this reports
//    the configuration rather than the account: whether a deploy is going to
//    try to claim the domain, and what has to be true for that to work.
say('');
if (/^\s*"routes"/m.test(readFileSync(CONFIG, 'utf8'))) {
  say('The config claims a custom domain. A deploy fails there unless the zone is in');
  say('this same account — sitting on Cloudflare nameservers is not enough.');
} else {
  say('The custom domain is commented out in deploy/wrangler.jsonc, so this deploys to');
  say('workers.dev. Uncomment it once the zone is in this account.');
}

say('');
say(made.length === 0 ? 'Nothing to do — already provisioned.' : `Provisioned: ${made.join(', ')}.`);
say('Next: npm run deploy');
