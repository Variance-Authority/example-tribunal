import { MainNav } from '@/components/MainNav';
import { useCart } from '@/components/CartContext';
import { useEffect } from 'react';

/**
 * The header every route carries, on its own.
 *
 * `Filled` declares its parent with a tag rather than through its name, which is
 * the other half of the variation mechanism: a name is an inference from a
 * convention and correct exactly as often as the convention is kept, while a tag
 * is a statement. The report says which was used for each link, so the two are
 * never confused for one another.
 */
const Fill = ({ ids }) => {
  const cart = useCart();

  useEffect(() => {
    for (const id of ids) cart.addItem({ id });
    // Once, on mount: this fills a cart, it does not keep it in sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default {
  title: 'Main Nav',
  component: MainNav,
};

export const Empty = {};

export const Filled = {
  tags: ['variance-parent:main-nav--empty'],
  render: () => (
    <>
      <Fill ids={[1, 2, 3]} />
      <MainNav />
    </>
  ),
};
