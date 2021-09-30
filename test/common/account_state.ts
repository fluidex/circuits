const Scalar = require('ffjavascript').Scalar;
import { hash } from 'fluidex.js';
import { TxSignature } from 'fluidex.js';

class AccountState {
  nonce: bigint = 0n;
  sign: bigint = 0n;
  balanceRoot: bigint = 0n;
  ay: bigint = 0n;
  orderRoot: bigint = 0n;
  constructor(data: Partial<AccountState> = {}) {
    Object.assign(this, data);
  }
  /**
   * Encode an account state object into an array
   * @param {Object} st - Merkle tree account state object
   * @returns {Array} Resulting array
   */
  private accountState2Array(): Array<bigint> {
    let data = Scalar.e(0);
    data = Scalar.add(data, this.nonce);
    data = Scalar.add(data, Scalar.shl(this.sign, 40));
    return [data, Scalar.e(this.balanceRoot), this.ay, Scalar.e(this.orderRoot)];
  }
  /**
   * Return the hash of an account state object
   * @param {Object} st - Merkle tree account state object
   * @returns {Scalar} Resulting hash
   */
  hash(): bigint {
    return hash(this.accountState2Array());
  }
  updateAccountKey(account) {
    const sign = BigInt(account.sign);
    const ay = account.ay;
    this.updateL2Addr(sign, ay);
  }
  updateL2Addr(sign, ay) {
    this.sign = sign;
    this.ay = ay;
  }
  updateNonce(nonce) {
    this.nonce = nonce;
  }
  updateOrderRoot(orderRoot) {
    this.orderRoot = orderRoot;
  }
}

export { AccountState, TxSignature };
