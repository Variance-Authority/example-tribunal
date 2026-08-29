/**
 * The shop's own Next configuration, with the two settings a reading needs.
 *
 * It is copied in whole rather than patched so the file a reader opens is the
 * file that runs, and the two additions are visible next to what they change.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.goat.com',
      },
    ],

    /**
     * The image endpoint is out of the picture, because it deadlocks.
     *
     * `/sneakers` asks for twenty-one optimized images at once and Next 14.2
     * answers nineteen of them: two requests are accepted and never completed,
     * with no response and no error, on every load and for a different pair each
     * time. An `<img>` waiting on one of those never fires `load` and never
     * fires `error`, so the page never finishes arriving.
     *
     * Serving the files as they are removes a nondeterminism that lives in the
     * application's server rather than in its markup — the same reason the
     * product pictures were pinned out of a CDN and into `public/`. What is
     * being compared is the shop's code, and neither edit touches any of it.
     */
    unoptimized: true,
  },

  /**
   * Component names survive the production build.
   *
   * A report that says `d` changed has attributed nothing, and a source scan
   * looking for `d` in `src/components` finds nothing either — so minification
   * does not merely make the docket ugly, it removes the column the docket is
   * grouped by. Next exposes no `keep_fnames`, so the whole pass goes; the
   * Storybook build makes the same decision with the finer instrument Vite has
   * (`esbuild.keepNames`).
   *
   * Nothing observable moves. Minification renames identifiers and removes
   * whitespace in JavaScript: the DOM is the same, the CSS is the same, and the
   * screenshot is the same. It is the one production transform that changes
   * everything about attribution and nothing about the picture.
   *
   * Client only. The server bundle emits no fibers for anything to be named in.
   */
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) config.optimization.minimize = false;
    return config;
  },
};

module.exports = nextConfig;
