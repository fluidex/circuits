const Scalar = require('ffjavascript').Scalar;
import { hash } from '../helper.ts/hash';
import { Tree } from '../helper.ts/binary_merkle_tree';
import { Account, TxSignature } from './account';

// this sequence'd better consistent with defined in circuits and smart constracts
enum TxType {
  Nop,
  Deposit,
  Transfer,
  Withdraw,
  PlaceOrder,
  SpotTrade,
}

enum OrderSide {
  Buy,
  Sell,
}

class OrderInput {
  accountID: bigint = 0n;
  orderId: bigint = 0n;
  tokenBuy: bigint = 0n;
  tokenSell: bigint = 0n;
  totalSell: bigint = 0n;
  totalBuy: bigint = 0n;
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
    let data = hash([TxType.PlaceOrder, this.orderId, this.tokenSell, this.tokenBuy, this.totalSell, this.totalBuy]);
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

  filledSell: bigint;
  filledBuy: bigint;

  get orderId(): bigint {
    return this.orderInput.orderId;
  }
  get tokenBuy(): bigint {
    return this.orderInput.tokenBuy;
  }
  get tokenSell(): bigint {
    return this.orderInput.tokenSell;
  }
  get totalSell(): bigint {
    return this.orderInput.totalSell;
  }
  get totalBuy(): bigint {
    return this.orderInput.totalBuy;
  }
  get side(): OrderSide {
    return this.orderInput.side;
  }
  isFilled(): boolean {
    return (
      (this.orderInput.side == OrderSide.Buy && this.filledBuy >= this.totalBuy) ||
      (this.orderInput.side == OrderSide.Sell && this.filledSell >= this.totalSell)
    );
  }
  static fromOrderInput(orderInput): OrderState {
    let result = new OrderState();
    result.orderInput = orderInput;
    result.filledBuy = 0n;
    result.filledSell = 0n;
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

    data = Scalar.add(data, this.orderId);
    data = Scalar.add(data, Scalar.shl(this.tokenBuy, 32));
    data = Scalar.add(data, Scalar.shl(this.tokenSell, 64));

    return [data, Scalar.e(this.filledSell), Scalar.e(this.filledBuy), Scalar.e(this.totalSell), Scalar.e(this.totalBuy)];
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
