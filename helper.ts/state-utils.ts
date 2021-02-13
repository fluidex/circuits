const Scalar = require('ffjavascript').Scalar;
import { hash } from '../helper.ts/hash';

/**
 * Encode an account state object into an array
 * @param {Object} st - Merkle tree account state object
 * @returns {Array} Resulting array
 */
function accountState2Array(st) {
  let data = Scalar.e(0);

  data = Scalar.add(data, st.nonce);
  data = Scalar.add(data, Scalar.shl(st.sign, 40));

  return [data,
  	Scalar.e(st.balanceRoot),
  	Scalar.fromString(st.ay, 16),
  	Scalar.fromString(st.ethAddr, 16),
  	Scalar.e(st.orderRoot)];
}

/**
 * Return the hash of an account state object
 * @param {Object} st - Merkle tree account state object
 * @returns {Scalar} Resulting hash
 */
function hashAccountState(st) {
  return hash(accountState2Array(st));
}

// TODO: calculate from orderLevels
function getGenesisOrderRoot() {
	return 0n;
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

  return [data,
    Scalar.e(st.filled_sell),
    Scalar.e(st.filled_buy),
    Scalar.e(st.total_sell),
    Scalar.e(st.total_buy)];
}

/**
 * Return the hash of an order state object
 * @param {Object} st - Merkle tree ofder state object
 * @returns {Scalar} Resulting hash
 */
function hashOrderState(st) {
  return hash(orderState2Array(st));
}

export { hashAccountState, hashOrderState, getGenesisOrderRoot };
