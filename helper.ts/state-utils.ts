const Scalar = require('ffjavascript').Scalar;
import { hash } from '../helper.ts/hash';
import { Tree } from '../helper.ts/binary_merkle_tree';
import { Account, TxSignature } from './account';

// this sequence'd better consistent with defined in circuits and smart constracts
enum TxType {
  DepositToNew,
  DepositToOld,
  Transfer,
  Withdraw,
  PlaceOrder,
  SpotTrade,
  Nop,
}

enum OrderSide {
  Buy,
  Sell,
}

class OrderInput {
  accountID: bigint = 0n;
  order_id: bigint = 0n;
  tokenbuy: bigint = 0n;
  tokensell: bigint = 0n;
  total_sell: bigint = 0n;
  total_buy: bigint = 0n;
  sig: TxSignature = null;
  side: OrderSide;
  constructor(data: Partial<OrderInput> = {}) {
    Object.assign(this, data);
  }
  static createEmpty(): OrderInput {
    let result = new OrderInput();
    return result;
  }
  hash(): bigint {
    // although there is no 'TxType.PlaceOrder' now, we can see it as a 'SignType'
    let data = hash([TxType.PlaceOrder, this.order_id, this.tokensell, this.tokenbuy, this.total_sell, this.total_buy]);
    //data = hash([data, accountID, nonce]);
    // nonce and orderID seems redundant?
    data = hash([data, this.accountID]);
    return data;
  }
  signWith(account: Account) {
    this.sig = account.signHash(this.hash());
  }
}

class OrderState {
  orderInput: OrderInput;

  filled_sell: bigint;
  filled_buy: bigint;

  get order_id(): bigint {
    return this.orderInput.order_id;
  }
  get tokenbuy(): bigint {
    return this.orderInput.tokenbuy;
  }
  get tokensell(): bigint {
    return this.orderInput.tokensell;
  }
  get total_sell(): bigint {
    return this.orderInput.total_sell;
  }
  get total_buy(): bigint {
    return this.orderInput.total_buy;
  }
  get side(): OrderSide {
    return this.orderInput.side;
  }
  isFilled(): boolean {
    return (
      (this.orderInput.side == OrderSide.Buy && this.filled_buy >= this.total_buy) ||
      (this.orderInput.side == OrderSide.Sell && this.filled_sell >= this.total_sell)
    );
  }
  static fromOrderInput(orderInput): OrderState {
    let result = new OrderState();
    result.orderInput = orderInput;
    result.filled_buy = 0n;
    result.filled_sell = 0n;
    return result;
  }
  static createEmpty(): OrderState {
    return OrderState.fromOrderInput(OrderInput.createEmpty());
  }
  /**
   * Encode an order state object into an array
   * @returns {Array} Resulting array
   */
  private orderState2Array(): Array<bigint> {
    let data = Scalar.e(0);

    data = Scalar.add(data, this.order_id);
    data = Scalar.add(data, Scalar.shl(this.tokenbuy, 32));
    data = Scalar.add(data, Scalar.shl(this.tokensell, 64));

    return [data, Scalar.e(this.filled_sell), Scalar.e(this.filled_buy), Scalar.e(this.total_sell), Scalar.e(this.total_buy)];
  }

  /**
   * Return the hash of an order state object
   * @returns {Scalar} Resulting hash
   */
  hash(): bigint {
    return hash(this.orderState2Array());
  }
}

class AccountState {
  nonce: bigint = 0n;
  sign: bigint = 0n;
  balanceRoot: bigint = 0n;
  ay: bigint = 0n;
  ethAddr: bigint = 0n;
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
    return [data, Scalar.e(this.balanceRoot), this.ay, this.ethAddr, Scalar.e(this.orderRoot)];
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
    const ethAddr = Scalar.fromString(account.ethAddr.replace('0x', ''), 16);
    this.updateL2Addr(sign, ay, ethAddr);
  }
  // TODO: remove ethAddr
  updateL2Addr(sign, ay, ethAddr) {
    this.sign = sign;
    this.ay = ay;
    this.ethAddr = ethAddr;
  }
  updateNonce(nonce) {
    this.nonce = nonce;
  }
  updateOrderRoot(orderRoot) {
    this.orderRoot = orderRoot;
  }
}

const emptyOrderHash: bigint = OrderState.createEmpty().hash();

function calculateGenesisOrderRoot(orderLevels): bigint {
  return new Tree<bigint>(orderLevels, emptyOrderHash).getRoot();
}

export { AccountState, emptyOrderHash, calculateGenesisOrderRoot, TxSignature, TxType, OrderState, OrderInput, OrderSide };
