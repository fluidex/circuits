import { TxLength } from '../common';
import { assert } from 'console';
class PlaceOrderTxData {
  order_pos: bigint;
  old_order_id: bigint;
  new_order_id: bigint;
  old_order_tokensell: bigint;
  old_order_filledsell: bigint;
  old_order_amountsell: bigint;
  old_order_tokenbuy: bigint;
  old_order_filledbuy: bigint;
  old_order_amountbuy: bigint;
  new_order_tokensell: bigint;
  new_order_amountsell: bigint;
  new_order_tokenbuy: bigint;
  new_order_amountbuy: bigint;
  accountID: bigint;
  balance: bigint;
  nonce: bigint;
  sign: bigint;
  ay: bigint;
  ethAddr: bigint;
  encode(): Array<bigint> {
    // double check template config is consistent
    assert(TxLength == 34, 'invalid length, check your template config');
    let results = [];
    results.push(this.order_pos);
    results.push(this.old_order_id);
    results.push(this.new_order_id);
    results.push(this.old_order_tokensell);
    results.push(this.old_order_filledsell);
    results.push(this.old_order_amountsell);
    results.push(this.old_order_tokenbuy);
    results.push(this.old_order_filledbuy);
    results.push(this.old_order_amountbuy);
    results.push(this.new_order_tokensell);
    results.push(this.new_order_amountsell);
    results.push(this.new_order_tokenbuy);
    results.push(this.new_order_amountbuy);
    results.push(this.accountID);
    results.push(this.balance);
    results.push(this.nonce);
    results.push(this.sign);
    results.push(this.ay);
    results.push(this.ethAddr);
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
export { PlaceOrderTxData };
