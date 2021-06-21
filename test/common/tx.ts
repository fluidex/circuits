import { hash } from '../../node_modules/fluidex.js/src/hash';
import { assert } from 'console';
import { Account } from '../../node_modules/fluidex.js/src/account';
import { Tree } from './binary_merkle_tree';
import { TxSignature, AccountState } from './account_state';
const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;
import { TxLength, TxDetailIdx } from '../codec/tx_data';

// this sequence'd better consistent with defined in circuits and smart constracts
enum TxType {
  Nop,
  Deposit,
  Transfer,
  Withdraw,
  PlaceOrder,
  SpotTrade,
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
/*
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
*/
class SpotTradeTx {
  order1AccountID: bigint;
  order2AccountID: bigint;
  tokenID1to2: bigint;
  tokenID2to1: bigint;
  amount1to2: bigint;
  amount2to1: bigint;
  order1Id: bigint;
  order2Id: bigint;
}

function hashTransfer({ from, to, tokenID, amount, fromNonce, toNonce, oldBalanceFrom, oldBalanceTo }) {
  let data = hash([TxType.Transfer, tokenID, amount]);
  // do we really need to sign oldBalance?
  data = hash([data, from, fromNonce, oldBalanceFrom]);
  data = hash([data, to, toNonce, oldBalanceTo]);
  return data;
}
function hashWithdraw({ accountID, tokenID, amount, nonce, oldBalance }) {
  let data = hash([TxType.Withdraw, tokenID, amount]);
  //console.log([data, accountID, nonce, oldBalance]);
  // do we really need to sign oldBalance?
  data = hash([data, accountID, nonce, oldBalance]);
  return data;
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

export {
  TxType,
  TxLength,
  TxDetailIdx,
  hashTransfer,
  hashWithdraw,
  RawTx,
  DepositToNewTx,
  DepositToOldTx,
  TranferTx,
  WithdrawTx,
  SpotTradeTx,
};
