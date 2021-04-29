import { hash } from '../helper.ts/hash';
import { assert } from 'console';
import { Account } from '../helper.ts/account';
import { Tree } from '../helper.ts/binary_merkle_tree';
import { hashAccountState, hashOrderState, emptyOrderHash, calculateGenesisOrderRoot } from '../helper.ts/state-utils';
const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;
import {TxLength, TxDetailIdx} from "./codec/tx_data";

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

class TxSignature {
  hash: bigint;
  S: bigint;
  R8x: bigint;
  R8y: bigint;
}

class DepositToNewTx {
  accountID: bigint;
  tokenID: bigint;
  amount: bigint;
  ethAddr: bigint;
  sign: bigint;
  ay: bigint;
}

class DepositToOldTx {
  accountID: bigint;
  tokenID: bigint;
  amount: bigint;
}

class TranferTx {
  from: bigint;
  to: bigint;
  tokenID: bigint;
  amount: bigint;
  signature: TxSignature;
}

// WithdrawTx can only withdraw to one's own L1 address
class WithdrawTx {
  accountID: bigint;
  tokenID: bigint;
  amount: bigint;
  signature: TxSignature;
}

class PlaceOrderTx {
  orderID: bigint;
  accountID: bigint;
  previous_tokenID_sell: bigint;
  previous_tokenID_buy: bigint;
  previous_amount_sell: bigint;
  previous_amount_buy: bigint;
  previous_filled_sell: bigint;
  previous_filled_buy: bigint;
  tokenID_sell: bigint;
  tokenID_buy: bigint;
  amount_sell: bigint;
  amount_buy: bigint;
}
/*

class Order {
  order_id: bigint;
  tokenbuy: bigint;
  tokensell: bigint;
  filled_sell: bigint;
  filled_buy: bigint;
  total_sell: bigint;
  total_buy: bigint;
}*/

// TODO: matain many of these in state
class SpotTradeTx {
  order1_accountID: bigint;
  order2_accountID: bigint;
  tokenID_1to2: bigint;
  tokenID_2to1: bigint;
  amount_1to2: bigint;
  amount_2to1: bigint;
  order1_id: bigint;
  order2_id: bigint;
}

function hashTransfer({ from, to, tokenID, amount, fromNonce, toNonce, oldBalanceFrom, oldBalanceTo }) {
  let data = hash([TxType.Transfer, tokenID, amount]);
  data = hash([data, from, fromNonce, oldBalanceFrom]);
  data = hash([data, to, toNonce, oldBalanceTo]);
  return data;
}
function hashWithdraw({ accountID, tokenID, amount, nonce, oldBalance }) {
  let data = hash([TxType.Withdraw, tokenID, amount]);
  //console.log([data, accountID, nonce, oldBalance]);
  data = hash([data, accountID, nonce, oldBalance]);
  return data;
}
function accountSign(acc, hash) {
  let sig = acc.signHash(hash);
  return {
    hash: hash,
    S: sig.S,
    R8x: sig.R8[0],
    R8y: sig.R8[1],
  };
}

function circuitSrcToName(s: string): string {
  return s.replace(/[ )]/g, '').replace(/[(,]/g, '_');
}

class RawTx {
  txType: TxType;
  payload: Array<bigint>;
  balancePath0: Array<bigint>;
  balancePath1: Array<bigint>;
  balancePath2: Array<bigint>;
  balancePath3: Array<bigint>;
  orderPath0: Array<bigint>;
  orderPath1: Array<bigint>;
  orderRoot0: bigint;
  orderRoot1: bigint;
  accountPath0: Array<bigint>;
  accountPath1: Array<bigint>;
  rootBefore: bigint;
  rootAfter: bigint;
  // debug info
  // extra: any;
}

class Order {
  order_id: bigint;
  tokenbuy: bigint;
  tokensell: bigint;
  filled_sell: bigint;
  filled_buy: bigint;
  total_sell: bigint;
  total_buy: bigint;
}

class AccountState {
  nonce: bigint;
  sign: bigint;
  balanceRoot: bigint;
  ay: bigint;
  ethAddr: bigint;
  orderRoot: bigint;
  hash() {
    return hashAccountState(this);
  }
  // TODO: combine with emptyAccount
  constructor() {
    this.nonce = 0n;
    this.sign = 0n;
    this.balanceRoot = 0n;
    this.ay = 0n;
    this.ethAddr = 0n;
    this.orderRoot = 0n;
  }
  updateAccountKey(account) {
    const sign = BigInt(account.sign);
    const ay = Scalar.fromString(account.ay, 16);
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

class L2Block {
  txsType: Array<any>;
  encodedTxs: Array<any>;
  balance_path_elements: Array<any>;
  order_path_elements: Array<any>;
  account_path_elements: Array<any>;
  orderRoots: Array<any>;
  oldAccountRoots: Array<any>;
  newAccountRoots: Array<any>;
}

export {
  TxType,
  TxLength,
  TxDetailIdx,
  hashTransfer,
  hashWithdraw,
  accountSign,
  circuitSrcToName,
  AccountState,
  Order,
  RawTx,
  DepositToNewTx,
  DepositToOldTx,
  TranferTx,
  WithdrawTx,
  SpotTradeTx,
  PlaceOrderTx,
  L2Block,
};
