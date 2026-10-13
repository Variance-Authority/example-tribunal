# snkr-shop, read twice and reviewed once

A verification of [Variance Authority](https://github.com/variance-authority/variance-authority)
against an application nobody here wrote: [`argos-ci/snkr-shop`](https://github.com/argos-ci/snkr-shop),
a Next.js storefront, cloned at a pinned commit and never vendored.

The shop is read as **four routes at two widths** and as **thirteen stories**, in
one run, against one baseline set, into one report — then pushed to a
[tribunal](https://github.com/variance-authority/variance-authority/tree/main/packages/tribunal)
and reviewed on a build page.

Nothing of the shop is copied into this repository. `app/` is a clone, and
`scripts/prepare.mjs` argues every edit it makes to the checkout.

## What is under review

`scripts/revise.mjs` applies five swaps across three files in one commit — the
change a reviewer is handed. They are chosen for their shapes:

| edit | reaches | area |
| --- | --- | --- |
| `ui/button.tsx` — variant colour, `sm` height | every button, and every card the taller button grows | enormous |
| `ProductCard.tsx` — price gains cents and a size | two routes, four stories | local |
| `MainNav.tsx` — cart badge size and colour | all four routes at both widths, both nav stories | a few hundred pixels |

Ranked by changed area a reviewer is shown the `/sneakers` grid, which did not
change: it reflowed because a button got two millimetres taller. The docket is
the counter-claim — components named as causes, each with the file it is
declared in, ranked by the pixels attributable to the edit, and everything that
merely moved counted as one build-level number.

## The change no image can see

`scripts/handler.mjs` and `scripts/effect.mjs` are a matched pair. Each rewrites
one line of `CartCard.tsx`, four lines apart — one inside the `onClick` of the
Remove button, one inside a `useEffect` that fires on mount. Neither moves a
pixel.

Nothing static separates them. Not the diff, not the import graph, not the
baselines: `CartCard` is in three stories and one route either way, so a
`--since` that reads source relations alone answers *these three* for both, and
is wrong once. One story clicks.

`overlay/.storybook/main.js` runs the preview through `testSelectionProbes`,
which splices a probe at every arrival region — module, function, branch,
continuation, loop, await. Each shot leaves behind the regions it crossed, keyed
by story. `--since` reads the diff's hunk headers against that recording, and
the pair comes apart:

```bash
npm run effect                                   # one line, inside the useEffect
npm run app:build
npm run variance -- run --since HEAD~1
```

    3 of 21 subject(s) observed
    3 unchanged, 18 not observed
    `--since HEAD~1` ruled out 18 subjects: 18 by what the diff declares and
    reaches, 0 by what the last run recorded entering.

```bash
npm run effect -- --undo && npm run handler      # one line, inside the onClick
npm run app:build
npm run variance -- run --since HEAD~1
```

    1 of 21 subject(s) observed
    1 unchanged, 20 not observed
    `--since HEAD~1` ruled out 20 subjects: 18 by what the diff declares and
    reaches, 2 by what the last run recorded entering.

Eighteen either way, then two more. The eighteen are not `excluded` — nobody
configured them — and not `failed`: the run read the diff and concluded the
change cannot arrive, and each names the baseline it was ruled out against. The
last two are the sentence a differ has no way to write:

    [unreached] story:cart-card--item: not affected by the diff against HEAD~1:
    the last run recorded every region it entered while it was painted, and this
    diff changed none of them

What survives is `story:cart-card--removing`, whose play function clicks Remove.
It is the only subject that has ever executed the lines this commit changed.

The two counts stay apart because the grounds are not equally durable. A diff is
read fresh; a journey is a recording, and a recording can predate the subject it
is silent about. So a subject the journal holds no whole observation of is
observed rather than skipped. `npm run handler -- --undo` puts the shop back.

## The A/B arm

`overlay/stories/ProductCard.stories.jsx` puts one card at four coordinates:

    product-card--control                 the base
    └── product-card--sale                offer: control → sale     ← the A/B
    │   └── product-card--sale-dark       scheme: light → dark
    └── product-card--control-dark        scheme: light → dark

The names carry the lattice, so the order is fixed — `sale-dark`, never
`dark-sale`, for the same reason English will not let you say *green great
dragon*. Drop the axis added last and you have the subject this one varies from.
The vocabulary is `names.axes` in `variance.config.json`, which is what turns
"these two differ" into "these two differ in `offer`".

The run reads each arm against its parent and reports it in a section of the
build page with no baseline in it. The interesting row is the one where an arm
renders identically to the subject it varies from: both are green, both are
`unchanged`, and the experiment measures nothing.

## Running it

```bash
npm install
npm run app:fetch        # clone the shop, pin its images, add the Storybook
npm run app:build        # next build + storybook build
npm run app:serve &      # the built shop on :3100
```

Two runs, because a comparison needs something to compare against:

```bash
npm run variance -- run                          # build 1: 21 new subjects, baselines written
npm run revise                                   # apply the change under review, as a commit
npm run app:build
npm run variance -- run --against HEAD~1         # build 2: the same 21, against build 1
```

`--against` is the half of this a differ cannot do. Without it the run still
reports which subjects moved; with it, and with `source.relations` set, it also
reads which files the commit touched and which components those files reach —
so the build page can say this component is the cause in seven renders, that
one is present in ten and the cause in none, and this difference has no path
from the commit to anything in the render it appeared in.

The review surface is a process, a port, a file and two tokens:

```bash
export VARIANCE_TRIBUNAL_PROJECT=snkr-shop
export VARIANCE_TRIBUNAL_INGEST_TOKEN=…      # what CI writes with
export VARIANCE_TRIBUNAL_REVIEW_TOKEN=…      # what a person decides with
npm run tribunal
```

`variance push` sends the report and its images to `review.endpoint`, bearing
the ingest token and no other:

```bash
VARIANCE_INGEST_TOKEN=… npm run push -- --run 2 --commit "$(git -C app rev-parse HEAD)" --branch restyle
```

The build page is then at the tribunal's address. `npm run revise -- --undo`
puts the shop back.

## The same surface, deployed

`deploy/wrangler.jsonc` is the process above as a Worker: D1 for rows, R2 for
bytes, and the same two tokens.

The Worker the package publishes serves the JSON API and no HTML. That is a
position, not an omission: the review page carries no token, so whoever serves
it is the gate, and `createTribunalRoutes` takes an `authorize` with no default
because a package that defaulted it would be shipping an approve button to the
internet. `deploy/worker.mjs` is where this example answers that question, in
about forty lines over the published routes:

**Reads are open. Every write needs a token.** The subject here is a public
storefront rendered from a pinned public commit — its diffs are nobody's
secret, and a build page nobody can open demonstrates nothing. So a `GET` is
granted the review capability with no credential, and anybody may read the
docket, the regions and the three PNGs. A write is not a read: deciding a
subject promotes a baseline, sweeping deletes builds, ingesting writes them, so
every non-`GET` must present the ingest or the review token and is refused with
a sentence without it. The tokens are compared in the wrapper and the header is
then *replaced* before the routes see it, which is what stops a caller choosing
its own capability by sending its own bearer.

The page itself is one document served at every page route, over the same
`REVIEW_STYLES` the node binary uses rather than a copy of them. Its script is
a static asset: `deploy/assets.mjs` copies the bundle out of the installed
package into `deploy/public/ui/review.js`, which `npm run deploy` does for you.
That directory is generated and is not committed.

`main` is the only file in this repo that is Worker code; everything under it —
routes, migrations, the bundle — comes from `node_modules`, so an upgrade is
`npm install` and there is no vendored copy here to drift from the release.

The account side is one command, and it is idempotent — run it again to check:

```bash
npm run provision
```

`deploy/provision.mjs` creates the D1 database if it is missing, writes the id
it prints into `deploy/wrangler.jsonc`, creates the R2 bucket, applies the
migrations the installed package ships, and generates the two tokens straight
into the deployment. That last step is why this is a script rather than a list:
the token has to be made and handed to `wrangler` without a person retyping it,
and printed exactly once, because nothing can read it back afterwards. Save the
two lines it prints. `--rotate` replaces tokens that already exist.

Two things it cannot do for you, and says so when it reaches them. R2 is off on
a new account until somebody agrees to a storage plan in the dashboard, which
is a decision and not a command. And secrets belong to a Worker, so the first
run on a fresh account has nothing to attach them to — deploy once, run
`npm run provision` again, and that run mints them. A Worker with no tokens is
already coherent: it is a deployment that refuses every write.

```bash
npm run deploy
```

A custom domain is not something a deploy can create. The zone has to already be
in the account `deploy/wrangler.jsonc` names — a login with several accounts
picks a different one without `account_id`, and sitting on Cloudflare
nameservers is not the same as being reachable by this login. `workers_dev`
stays on beside the domain, so the deployment has a second address that never
depends on DNS.

Whichever address it has is then what `variance push` records against, and
`review.endpoint` in `variance.config.json` is a literal — the local port above,
because the local flow is what this page walks through, and it should keep
pointing there. So the deployment gets that one edit in a copy:

```bash
VARIANCE_INGEST_TOKEN=… npm run deploy:push
```

`deploy/push.mjs` reads the address out of `deploy/wrangler.jsonc` — the custom
domain if one is claimed there, or an argument, which is what you want on the
day DNS has not finished propagating. It writes the copy beside the original so
every relative path in it still resolves, and does not commit it.

Only the endpoint moves, and only the ingest token travels with it. The review
token is what a person decides with, never reaches CI, and on this deployment it
is the whole difference between reading a build and deciding one. `REVIEWER` is
an optional plain variable naming who the page files decisions under.

`npm run deploy -- --dry-run` builds the Worker and resolves the bindings
without an account, so it is a check CI can run on every commit.

## On a pull request

[`.github/workflows/variance.yml`](.github/workflows/variance.yml) builds the
shop on every pull request, reads it against the deployment's baselines, and
pushes the build there whatever the verdict. The comment on the pull request
says what changed; the build page is where you decide. Approve every changed
subject, re-run the check, and it compares against what you approved.

The workflow carries the ingest token as the `VARIANCE_INGEST_TOKEN` secret and
stops at its first step without it. The review token never reaches this
repository's CI.

Every week the variance-authority repository opens a pull request here that
changes the product the card stories render. It checks that the check goes red,
approves the change through the deployment's API with the review token it holds,
re-runs the check, and closes the pull request without merging.

## What is in here

    variance.config.json     one run, two surfaces, the axis vocabulary, the file graph
    variance/collector.mjs   both shipped collectors behind one `kind: "collector"`
    deploy/wrangler.jsonc    the same surface as a Worker, over D1 and R2
    deploy/worker.mjs        who may read and who may decide, argued at the routes
    deploy/provision.mjs     the account side — database, bucket, schema, tokens
    deploy/assets.mjs        the review bundle, copied out of the installed package
    deploy/push.mjs          the one edit that records a run against the deployment
    .github/workflows/       the same run on every pull request, recorded against the deployment
    overlay/                 what an adopter commits: stories, a preview, two settings
    scripts/prepare.mjs      clone, pin, overlay — every edit argued at the edit
    scripts/revise.mjs       the change under review, committed so `--against` has a ref
    scripts/behaviour.mjs    one line changed, no pixel moved, committed so a diff exists
    scripts/handler.mjs      that line inside an `onClick` — one story ever entered it
    scripts/effect.mjs       that line inside a `useEffect` — every story ran it

Each of those files carries its reasoning at the top. This page is the map.
