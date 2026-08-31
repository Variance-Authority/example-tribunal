import products from '@/assets/data.json';
import { CartCard } from '@/components/CartCard';
import { userEvent, within } from 'storybook/test';

/**
 * The row a cart is made of, with its own destructive action.
 *
 * Here so the `Button` component is watched through a second parent. A cause
 * that only ever appears under one component is indistinguishable from that
 * component's own change; two parents is the smallest number at which the
 * docket has something to separate.
 *
 * `Removing` is the third, and it is here for the other instrument. Every story
 * in this file mounts the card, so all three enter its render and its impression
 * effect; only this one enters the click handler. That is the difference a diff
 * cannot see and a recorded run can, and it is the whole of why a story clicks.
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

/**
 * The same row, with the destructive action taken.
 *
 * Nothing is asserted after the click. What the handler does is what the two
 * revision scripts change, so an expectation about it would be an expectation
 * that is meant to differ between commits — and a story that fails on the commit
 * it was written to select is a story that selects nothing.
 */
export const Removing = {
  args: { item: { id: products[0].id } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: /remove/i }));
  },
};
