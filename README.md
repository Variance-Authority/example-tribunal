# snkr-shop, read twice and reviewed once

A verification of [Variance Authority](https://github.com/variance-authority/variance-authority)
against an application nobody here wrote: [`argos-ci/snkr-shop`](https://github.com/argos-ci/snkr-shop),
a Next.js storefront, cloned at a pinned commit and never vendored.

The shop is read as **four routes at two widths** and as **twelve stories**, in
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

Needs the `@variance-authority` packages on a registry `.npmrc` can reach.

```bash
npm install
npm run app:fetch        # clone the shop, pin its images, add the Storybook
npm run app:build        # next build + storybook build
npm run app:serve &      # the built shop on :3100
```

Two runs, because a comparison needs something to compare against:

```bash
npm run variance -- run                          # build 1: 20 new subjects, baselines written
npm run revise                                   # apply the change under review, as a commit
npm run app:build
npm run variance -- run --against HEAD~1         # build 2: the same 20, against build 1
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

## What is in here

    variance.config.json     one run, two surfaces, the axis vocabulary, the file graph
    variance/collector.mjs   both shipped collectors behind one `kind: "collector"`
    overlay/                 what an adopter commits: stories, a preview, two settings
    scripts/prepare.mjs      clone, pin, overlay — every edit argued at the edit
    scripts/revise.mjs       the change under review, committed so `--against` has a ref

Each of those files carries its reasoning at the top. This page is the map.
