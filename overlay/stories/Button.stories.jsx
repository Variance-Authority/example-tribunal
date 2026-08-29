import { Button } from '@/components/ui/button';

/**
 * The component the rest of the shop is built out of.
 *
 * Four stories, and the point of them is what happens to the report when this
 * file's component is edited: the four here move, and so does every card, every
 * cart row and every route that renders one. A tool that ranked by pixels would
 * lead with whichever of those reflowed the most. The cause is here.
 */
export default {
  title: 'Button',
  component: Button,
};

export const Primary = { args: { children: 'Add to cart' } };

export const Destructive = {
  args: { children: 'Remove', variant: 'destructive' },
};

export const Outline = { args: { children: 'Keep looking', variant: 'outline' } };

export const Small = { args: { children: 'Preview', size: 'sm' } };
