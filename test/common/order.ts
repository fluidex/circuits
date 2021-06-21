import { OrderInput, OrderSide, OrderState } from '../../node_modules/fluidex.js/src/order';
export { OrderInput, OrderSide, OrderState };
import { Tree } from './binary_merkle_tree';

export const emptyOrderHash: bigint = OrderState.createEmpty().hash();

export function calculateGenesisOrderRoot(orderLevels): bigint {
  return new Tree<bigint>(orderLevels, emptyOrderHash).getRoot();
}
