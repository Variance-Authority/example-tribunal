import { resolve } from 'node:path';

import { jsxSource } from '@variance-authority/jsx-source/vite';
import { testSelectionProbes } from '@variance-authority/sense/journal';

/**
 * The shop's components, read a second way.
 *
 * Two settings here are not preferences. `keepNames` is what stops a production
 * build renaming `ProductCard` to `a`, and a report that names `a` as the cause
 * of a change has attributed nothing. `jsxDev` is what keeps the transform's
 * source argument, which is where `file:line` comes from; `jsxSource` writes it
 * onto the element so the DOM carries it as far as the collector.
 *
 * Stories live under `src/` so the shop's own `tailwind.config.ts` content glob
 * already covers them: an overlay that needed the application's build
 * configuration changed to see it would be measuring a different application.
 * `@/*` is re-declared here because Vite does not read `tsconfig.json` paths and
 * the framework wires them only into docgen — the alias is the app's own, copied
 * rather than invented, so a story imports what a page imports.
 *
 * `testSelectionProbes` is the third reading, and the only one that is about
 * time rather than shape. `jsxSource` says where a component was written;
 * `keepNames` says what it is called; probes say which regions of it a story
 * actually entered. An effect body a shot runs and a click handler no story
 * clicks are two edits to one file, and nothing static separates them.
 *
 * Rooted at the repository above `app/`, because that is the cwd `variance run`
 * has and the prefix its diff paths carry. The build's root and the run's root
 * key the same cache: disagree, and the run reads an index that is empty rather
 * than one that is wrong — narrowing quietly stops, and nothing says so.
 */
export default {
  stories: ['../src/stories/**/*.stories.@(jsx|tsx)'],
  framework: { name: '@storybook/nextjs-vite', options: {} },
  staticDirs: ['../public'],
  core: { disableTelemetry: true },
  viteFinal: async (config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      alias: { ...config.resolve?.alias, '@': resolve(process.cwd(), 'src') },
    },
    plugins: [
      ...(config.plugins ?? []),
      jsxSource(),
      testSelectionProbes({ root: resolve(process.cwd(), '..'), label: 'storybook' }),
    ],
    esbuild: { ...config.esbuild, jsx: 'automatic', keepNames: true, jsxDev: true },
  }),
};
