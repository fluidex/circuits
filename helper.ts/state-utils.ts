const Scalar = require('ffjavascript').Scalar;
import { hash } from '../helper.ts/hash';
import { Tree } from '../helper.ts/binary_merkle_tree';

/**
 * Encode an account state object into an array
 * @param {Object} st - Merkle tree account state object
 * @returns {Array} Resulting array
 */
function accountState2Array(st) {
  let data = Scalar.e(0);

  data = Scalar.add(data, st.nonce);
  data = Scalar.add(data, Scalar.shl(st.sign, 40));
  function toScalarFromHex(x) {
    // instanceof did not work well
    if (typeof x == 'bigint') {
      return x;
    } else if (typeof x == 'string') {
      return Scalar.fromString(x, 16);
    } else {
      throw new Error('invalid scalar ' + x);
    }
  }
  return [data, Scalar.e(st.balanceRoot), toScalarFromHex(st.ay), toScalarFromHex(st.ethAddr), Scalar.e(st.orderRoot)];
}

/**
 * Return the hash of an account state object
 * @param {Object} st - Merkle tree account state object
 * @returns {Scalar} Resulting hash
 */
function hashAccountState(st) {
  return hash(accountState2Array(st));
}

const emptyOrderHash = hashOrderState({
  order_id: 0n,
  tokenbuy: 0n,
  tokensell: 0n,
  filled_sell: 0n,
  filled_buy: 0n,
  total_sell: 0n,
  total_buy: 0n,
});

function calculateGenesisOrderRoot(orderLevels) {
  return new Tree<bigint>(orderLevels, emptyOrderHash).getRoot();
}

/**
 * Encode an order state object into an array
 * @param {Object} st - Merkle tree order state object
 * @returns {Array} Resulting array
 */
function orderState2Array(st) {
  let data = Scalar.e(0);

  data = Scalar.add(data, st.status);
  data = Scalar.add(data, Scalar.shl(st.tokenbuy, 32));
  data = Scalar.add(data, Scalar.shl(st.tokensell, 64));

  return [data, Scalar.e(st.filled_sell), Scalar.e(st.filled_buy), Scalar.e(st.total_sell), Scalar.e(st.total_buy)];
}

/**
 * Return the hash of an order state object
 * @param {Object} st - Merkle tree ofder state object
 * @returns {Scalar} Resulting hash
 */
function hashOrderState(st) {
  return hash(orderState2Array(st));
}

export { hashAccountState, hashOrderState, emptyOrderHash, calculateGenesisOrderRoot };
