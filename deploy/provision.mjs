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

/**
 * The account, twice.
 *
 * `--config` names it because that file carries `account_id`, and most commands
 * read it there. `r2 bucket list` does not: it asks the account question on its
 * own, sees more than one, and fails with "Please set the appropriate
 * `account_id` in your Wrangler configuration file" while looking straight at a
 * configuration file that sets it. So the same value also goes into the
 * environment, where every command honours it.
 *
 * Taken from the config rather than hardcoded, so there is still one place that
 * decides which account this deployment lives in.
 */
const account = /"account_id":\s*"([^"]+)"/.exec(readFileSync(CONFIG, 'utf8'));
if (account === null) throw new Error(`no "account_id" in ${CONFIG} — provisioning cannot pick an account for you`);

const environment = { ...process.env, CLOUDFLARE_ACCOUNT_ID: account[1] };

/** `stdio: inherit` on stderr so wrangler's own diagnosis reaches the operator. */
function wrangler(args, { capture = true } = {}) {
  return execFileSync('npx', ['wrangler', ...args, '--config', CONFIG], {
    encoding: 'utf8',
    env: environment,
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
  // `--no-update-config` because wrangler's own rewrite reformats the whole
  // file and appends a second binding beside the one already there. Step 2
  // writes the id, and keeps every comment.
  wrangler(['d1', 'create', DATABASE, '--no-update-config'], { capture: false });
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
//
//    R2 is off until somebody turns it on in the dashboard — the API answers
//    10042 and there is no wrangler command that agrees to it, because agreeing
//    to it is signing up for storage billing. So this stops with the sentence
//    that says where to click rather than with a stack trace.
let listing;
try {
  listing = wrangler(['r2', 'bucket', 'list']);
} catch {
  say('');
  say('R2 is not enabled on this account. Nothing here can enable it for you: it is');
  say('an agreement to a storage plan, made once, in the dashboard —');
  say('');
  say(`  https://dash.cloudflare.com/${account[1]}/r2`);
  say('');
  say('Click through it, then run this command again. Everything above is already done.');
  process.exit(1);
}

const buckets = listing
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
wrangler(['d1', 'migrations', 'apply', DATABASE, '--remote'], { capture: false });

// 5. The tokens. These are the reason this file exists: the value has to be
//    generated and handed to `wrangler` without a human retyping it, and it has
//    to be printed exactly once, because nothing can read it back afterwards.
//
//    Secrets belong to a Worker, and a Worker does not exist until it has been
//    deployed once. So on a fresh account this step has nothing to attach to —
//    which is fine, because a Worker with no tokens is exactly a deployment that
//    refuses every write. Deploy, run this again, and the tokens land.
let deployed = true;
let existing = new Set();
try {
  existing = new Set(JSON.parse(wrangler(['secret', 'list'])).map((secret) => secret.name));
} catch {
  deployed = false;
}

const minted = [];
if (deployed) {
  for (const name of ['INGEST_TOKEN', 'REVIEW_TOKEN']) {
    if (existing.has(name) && !rotate) {
      say(`${name} is already set — pass --rotate to replace it`);
      continue;
    }
    const token = randomBytes(24).toString('hex');
    execFileSync('npx', ['wrangler', 'secret', 'put', name, '--config', CONFIG], {
      input: token,
      env: environment,
      stdio: ['pipe', 'ignore', 'inherit'],
    });
    minted.push([name, token]);
    made.push(name);
  }
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
if (deployed) {
  say('Next: npm run deploy');
} else {
  say('');
  say('The Worker has never been deployed, so there was nothing to hold the tokens.');
  say('Next: npm run deploy, then this command again — that run mints them.');
}
