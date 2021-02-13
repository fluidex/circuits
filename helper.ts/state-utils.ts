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

// TODO:
// 1. calculate from orderLevels
// 2. avoid calculating every time in tests
function getGenesisOrderRoot() {
	return 0n;
}

export { hashAccountState, getGenesisOrderRoot };
