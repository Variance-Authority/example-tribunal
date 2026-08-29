import products from '@/assets/data.json';
import { ProductCard } from '@/components/ProductCard';

/**
 * One card, at four coordinates — and the reason they are named in this order.
 *
 * The experiment is `offer`: `control` is the shop as it ships, `sale` is the
 * arm where the primary action goes red. It is crossed with `scheme`, so the
 * same arm can be read light and dark. Nothing in the component knows about
 * either; the preview's wrapper declares different tokens and the card repaints.
 *
 * **The names are the lattice.** `product-card--sale-dark` is the sale arm, in
 * dark — and it may not be called `product-card--dark-sale`, for the same reason
 * English will not let you say *green great dragon*. Adjective order is fixed,
 * so one card has one name, and the run can read the name as a coordinate:
 * drop what was added last and you have the subject this one is a variation of.
 *
 *     product-card--control                 the base
 *     └── product-card--sale                offer: control → sale     ← the A/B
 *     │   └── product-card--sale-dark       scheme: light → dark
 *     └── product-card--control-dark        scheme: light → dark
 *
 * Written the other way round, `sale-dark` and `dark-sale` are one render under
 * two names: two baselines, two chains, and each reporting a two-axis difference
 * where a one-axis difference was meant. Nothing errors. That is the problem.
 *
 * The axis vocabulary is in `variance.config.json` under `names`, which is what
 * turns "these two differ" into "these two differ in `offer`".
 */
export default {
  title: 'Product Card',
  component: ProductCard,
  args: { product: products[0] },
};

export const Control = {};

export const Sale = {
  parameters: { arm: { offer: 'sale' } },
};

export const SaleDark = {
  parameters: { arm: { offer: 'sale', scheme: 'dark' } },
};

export const ControlDark = {
  parameters: { arm: { scheme: 'dark' } },
};
