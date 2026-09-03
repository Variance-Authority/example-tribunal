import { createTribunal } from '@variance-authority/tribunal/worker';
import { createTribunalRoutes } from '@variance-authority/tribunal/next';
import { REVIEW_STYLES, isPagePath } from '@variance-authority/tribunal/ui';

/**
 * The review surface of this example, deployed.
 *
 * `@variance-authority/tribunal` ships a Worker entry, and it serves the JSON
 * API and nothing else — no HTML. That is the package's position, not an
 * omission: the review page carries no token, so whoever serves it is the gate,
 * and `createTribunalRoutes` takes an `authorize` with no default because a
 * package that defaulted it would be shipping an approve button to the internet.
 * The node binary answers that question one way (loopback only). This file
 * answers it for a public demo, and the answer is visible here rather than
 * implied by a dependency.
 *
 * ## The policy
 *
 * **Reads are open. Every write needs a token.**
 *
 * The subject of this example is a public storefront rendered from a pinned
 * public commit; its diffs are not anybody's secret, and a build page nobody can
 * open demonstrates nothing. So a `GET` is granted the review capability with no
 * credential.
 *
 * A write is not a read. Deciding a subject promotes a baseline, sweeping
 * deletes builds, and ingesting writes them — so every non-`GET` must present
 * one of the two tokens and is refused without it. The tokens are compared here
 * and the header is then *replaced* by `createTribunalRoutes`, which is what
 * stops a caller choosing its own capability by sending its own bearer.
 *
 * `/baseline/find` and `/cache/find` are `GET`s and are therefore open too. They
 * serve this example's baselines, which are the same pixels the build page
 * already shows.
 */

/** Compared in constant time: an early return on the first wrong byte times the token. */
function presented(request, token) {
  const header = request.headers.get('authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (bearer.length !== token.length || token.length === 0) return false;
  let difference = 0;
  for (let index = 0; index < bearer.length; index += 1) {
    difference |= bearer.charCodeAt(index) ^ token.charCodeAt(index);
  }
  return difference === 0;
}

function page(reviewer) {
  // `<` and the two line separators are escaped because this string is written
  // into a `<script>` element: `</script>` inside it would close the element,
  // and U+2028/U+2029 are line terminators to a JavaScript parser and not to
  // JSON.
  const configuration = JSON.stringify({ endpoint: '', reviewer })
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  // The document the node binary serves, kept in step with it by taking
  // `REVIEW_STYLES` from the package rather than a copy. The script src is
  // absolute because this same document is served at every page route, and a
  // relative one resolves against whichever of them was asked for.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#181b1d">
<title>Variance Authority — review</title>
<style>body { margin: 0; }
${REVIEW_STYLES}</style>
</head>
<body>
<div id="variance-review"></div>
<script type="application/json" id="variance-config">${configuration}</script>
<script type="module" src="/ui/review.js"></script>
</body>
</html>
`;
}

const built = new WeakMap();

function routesFor(env) {
  const found = built.get(env);
  if (found !== undefined) return found;

  const retentionDays = Number(env.RETENTION_DAYS);
  const worker = createTribunal({
    db: env.DB,
    bucket: env.BUCKET,
    project: env.PROJECT ?? 'default',
    ingestToken: env.INGEST_TOKEN ?? '',
    reviewToken: env.REVIEW_TOKEN ?? '',
    ...(Number.isFinite(retentionDays) && retentionDays > 0 ? { retentionDays } : {}),
  });

  const made = createTribunalRoutes(worker, {
    tokens: { ingest: env.INGEST_TOKEN ?? '', review: env.REVIEW_TOKEN ?? '' },
    authorize: (request) => {
      if (presented(request, env.INGEST_TOKEN ?? '')) return 'ingest';
      if (presented(request, env.REVIEW_TOKEN ?? '')) return 'review';
      return request.method === 'GET' || request.method === 'HEAD' ? 'review' : null;
    },
  });

  built.set(env, made);
  return made;
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;

    // `/ui/review.js` is not here: it is a static asset, served ahead of this
    // Worker by the `assets` binding, so the browser caches it as a file rather
    // than as something a Worker decided to say.
    if ((request.method === 'GET' || request.method === 'HEAD') && isPagePath(path)) {
      return new Response(request.method === 'HEAD' ? null : page(env.REVIEWER ?? 'a visitor'), {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
      });
    }

    // The page is open, so anybody may reach an approve button, click it, and be
    // refused. `authorize` refuses them either way — this answers first only to
    // replace "not authorized for this deployment" with the sentence that says
    // what a visitor is missing and does not read as a broken deployment.
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const granted =
        presented(request, env.INGEST_TOKEN ?? '') || presented(request, env.REVIEW_TOKEN ?? '');
      if (!granted) {
        return new Response(
          JSON.stringify({
            error:
              'This build is published to be read, not decided. Approving a subject promotes its baseline, so it takes the review token this deployment was given.',
          }),
          { status: 401, headers: { 'content-type': 'application/json; charset=utf-8' } },
        );
      }
    }

    // Construction is inside `fetch` for the reason `worker-entry` gives: a bad
    // environment should answer with the sentence that names it, not fail the
    // deployment with a platform error somebody has to go and find.
    try {
      const routes = routesFor(env);
      return await routes[request.method === 'HEAD' ? 'HEAD' : request.method === 'GET' ? 'GET' : 'POST'](request);
    } catch (error) {
      return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
        status: 500,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    }
  },
};
