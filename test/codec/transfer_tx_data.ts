// Generated from tpl/ejs/./test/codec/transfer_tx_data.ts.ejs. Don't modify this file manually
import { TxLength } from '../common';
import { assert } from 'console';
class TransferTxData {
  fromAccountID: bigint;
  toAccountID: bigint;
  amount: bigint;
  tokenID: bigint;
  sigL2Hash: bigint;
  s: bigint;
  sign1: bigint;
  sign2: bigint;
  ay1: bigint;
  ay2: bigint;
  r8x: bigint;
  r8y: bigint;
  nonce1: bigint;
  balance1: bigint;
  ethAddr1: bigint;
  nonce2: bigint;
  balance2: bigint;
  ethAddr2: bigint;
  midAccountRoot: bigint;
  encode(): Array<bigint> {
    // double check template config is consistent
    assert(TxLength == 34, 'invalid length, check your template config');
    let results = [];
    results.push(this.fromAccountID);
    results.push(this.toAccountID);
    results.push(this.amount);
    results.push(this.tokenID);
    results.push(this.sigL2Hash);
    results.push(this.s);
    results.push(this.sign1);
    results.push(this.sign2);
    results.push(this.ay1);
    results.push(this.ay2);
    results.push(this.r8x);
    results.push(this.r8y);
    results.push(this.nonce1);
    results.push(this.balance1);
    results.push(this.ethAddr1);
    results.push(this.nonce2);
    results.push(this.balance2);
    results.push(this.ethAddr2);
    results.push(this.midAccountRoot);
    while (results.length < TxLength) {
      results.push(0n);
    }
    for (const x of results) {
      if (x == null) {
        throw new Error('signal not assigned ' + results);
      }
    }
    return results;
  }
}
export { TransferTxData };
