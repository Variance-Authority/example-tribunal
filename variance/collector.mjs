import { fileURLToPath } from 'node:url';
import { routeCollector } from '@variance-authority/route-collector';
import { storySubjectId, toSubjects } from '@variance-authority/storybook';
import { readStoryIndex } from '@variance-authority/storybook/read';
import { storybookCollector } from '@variance-authority/storybook-collector';

/**
 * Both surfaces of one application, in one run.
 *
 * ## Why this file exists at all
 *
 * `subjects.kind` takes one value. `storybook` supplies a plan from a built
 * story index; `list` supplies the ids an operator wrote down. Each shipped
 * collector asks for the one that feeds it, so a config can name a Storybook or
 * a route table and not both — and the two shipped collectors are, between them,
 * the whole of what this project ships for driving a browser.
 *
 * The alternative is two runs and a merged report, and it costs the thing the
 * pairing was for: cross-subject reasoning happens inside a run. A component
 * rendered by a route and by a story is one component; two reports know it as
 * two, so the shared renderings between them go unstated and the docket counts
 * each surface's collateral against a different total.
 *
 * So the config says `kind: "collector"` — *the collector says what the subjects
 * are*, which is exactly true here — and this file is the one that says it. It
 * writes no planning and no collection of its own: it constructs both shipped
 * collectors, hands each the context its own kind would have handed it, and
 * dispatches on the subject id.
 *
 * ## What it dispatches on, and why that is safe
 *
 * `story:` is the prefix `@variance-authority/storybook` puts on every story
 * subject, and the route ids below are this file's own. Two namespaces, one
 * owned by a package and one owned by the operator, so a subject cannot arrive
 * that both or neither claim.
 *
 * Call sites are dispatched the same way, by the origin the frame came from. A
 * resolver fetches a module through the page that loaded it; the Storybook
 * preview and the Next server are two origins, and a single resolver pointed at
 * either would answer `null` for half the report's components — which reads as
 * "this project has no source" rather than as a fetch that could not be made.
 */

/** The built application, served by `next start`. */
const APP = 'http://localhost:3100';

/** Resolved from this module rather than from the cwd: the index sits beside it. */
const INDEX = fileURLToPath(new URL('../app/storybook-static/index.json', import.meta.url));

/**
 * The four pages the shop has, and one of them twice over.
 *
 * `route/detail` names a product id because a detail page without one is a 404,
 * and the id is pinned for the same reason the commit is: a subject whose
 * content depends on which product happened to sort first is a subject that
 * changes when the catalogue does.
 */
const ROUTES = {
  'route/home': `${APP}/`,
  'route/sneakers': `${APP}/sneakers`,
  'route/detail': `${APP}/sneakers/404758`,
  'route/cart': `${APP}/cart`,
};

/** Where the shop's components are, for `file:line`. Relative to the run's cwd. */
const SOURCE = { dirs: ['app/src'] };

export default async function subjects(context) {
  const routes = await routeCollector({
    routes: ROUTES,
    // The two layouts the shop actually has. Each width is its own subject with
    // its own baseline, because a page has a layout per breakpoint and a suite
    // that reads one of them is not watching the other.
    widths: [1280, 390],
    roots: ['body'],
    source: SOURCE,
  })({
    config: context.config,
    // What `subjects.kind: "list"` would have supplied. `widths` expands it.
    plan: {
      subjects: Object.keys(ROUTES).map((id) => ({ subject: { id, kind: 'route' } })),
      notObserved: [],
      warnings: [],
    },
  });

  const index = await readStoryIndex(INDEX);
  const planned = toSubjects(index, { viewport: context.config.viewport });

  // `tests` drains the execution journal the preview's probes fill, one window
  // per story, and joins them into the index `--since` narrows by. The label is
  // the one `.storybook/main.js` built with; a mismatch reads an empty index.
  const stories = await storybookCollector({ source: SOURCE, tests: { label: 'storybook' } })({
    // `index` is what `subjects.kind: "storybook"` puts here, and it is the
    // directory to serve as much as it is the file to read.
    config: { ...context.config, subjects: { ...context.config.subjects, index: INDEX } },
    plan: {
      subjects: planned.subjects.map((story) => ({
        subject: story.subject,
        ...(story.viewport !== undefined ? { viewport: story.viewport } : {}),
        ...(story.story.tags.length > 0 ? { tags: story.story.tags } : {}),
      })),
      notObserved: planned.excluded.map((entry) => ({
        subject: storySubjectId(entry.id),
        kind: 'excluded',
        because: entry.reason,
      })),
      warnings: planned.warnings,
    },
  });

  const isStory = (id) => id.startsWith('story:');
  const forSubject = (planned) => (isStory(planned.subject.id) ? stories : routes);

  return {
    async plan() {
      const [fromRoutes, fromStories] = await Promise.all([routes.plan(), stories.plan()]);

      return {
        subjects: [...fromRoutes.subjects, ...fromStories.subjects],
        notObserved: [...fromRoutes.notObserved, ...fromStories.notObserved],
        warnings: [...fromRoutes.warnings, ...fromStories.warnings],
      };
    },

    collect: (planned) => forSubject(planned).collect(planned),

    callSites: {
      locate: (frames) =>
        (frames[0]?.url.startsWith(APP) ? routes : stories).callSites.locate(frames),
      // Summed rather than picked. The ratio of sites to modules is the claim
      // this number is here to support, and one collector's half of it supports
      // half a claim.
      get stats() {
        const [a, b] = [routes.callSites.stats, stories.callSites.stats];
        return {
          modules: a.modules + b.modules,
          sites: a.sites + b.sites,
          located: a.located + b.located,
        };
      },
    },

    async close() {
      // Both, whatever either does. A browser left open because its sibling
      // threw is a run that never exits.
      const closed = await Promise.allSettled([routes.close(), stories.close()]);
      const failed = closed.find((result) => result.status === 'rejected');
      if (failed !== undefined) throw failed.reason;
    },
  };
}
