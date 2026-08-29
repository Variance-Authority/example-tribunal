import products from '@/assets/data.json';
import { CartCard } from '@/components/CartCard';

/**
 * The row a cart is made of, with its own destructive action.
 *
 * Here so the `Button` component is watched through a second parent. A cause
 * that only ever appears under one component is indistinguishable from that
 * component's own change; two parents is the smallest number at which the
 * docket has something to separate.
 */
export default {
  title: 'Cart Card',
  component: CartCard,
  args: { onRemove: () => {} },
};

export const Item = {
  args: { item: { id: products[0].id } },
};

export const Verbose = {
  args: { item: { id: products[3].id } },
};
