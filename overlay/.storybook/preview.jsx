import { CartProvider } from '../src/components/CartContext';

import '../src/app/globals.css';
import './arms.css';

/**
 * What every story is rendered inside, and why each layer is there.
 *
 * The arm wrapper is outermost because that is where a flag lives: an ancestor
 * declares tokens and the component below it is untouched. A story that set the
 * colours on the card itself would be a story about a different card, and the
 * variation between two of them would be a difference nobody shipped.
 *
 * `CartProvider` is inside it because `ProductCard` and `MainNav` both call
 * `useCart`, and a provider is not a variation of anything — it is the reason
 * the component renders at all.
 */
const arm = (Story, { parameters }) => {
  const { offer = 'control', scheme = 'light' } = parameters.arm ?? {};

  return (
    <div className={`arm arm-${offer} arm-${scheme}`}>
      <CartProvider>
        <Story />
      </CartProvider>
    </div>
  );
};

export default {
  decorators: [arm],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    actions: { disable: true },
  },
};
