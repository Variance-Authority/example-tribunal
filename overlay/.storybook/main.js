import { resolve } from 'node:path';

import { jsxSource } from '@variance-authority/jsx-source/vite';

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
    plugins: [...(config.plugins ?? []), jsxSource()],
    esbuild: { ...config.esbuild, jsx: 'automatic', keepNames: true, jsxDev: true },
  }),
};
