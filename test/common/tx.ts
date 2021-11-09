import { hash } from 'fluidex.js';
import { TxSignature } from './account_state';
import { TxLength, TxDetailIdx } from '../codec/tx_data';

// this sequence'd better consistent with defined in circuits and smart constracts
enum TxType {
  Nop,
  Deposit,
  Transfer,
  Withdraw,
  PlaceOrder,
  SpotTrade,
  UpdateL2Key,
}

class DepositToNewTx {
  accountID: bigint;
  tokenID: bigint;
  amount: bigint;
  sign: bigint;
  ay: bigint;
}

class UpdateL2Key {
  accountID: bigint;
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

//TODO: this function should use the implenent inside fluidex.js (need updating dep)
function hashOrderInput({ accountID, tokenBuy, tokenSell, totalBuy, totalSell }) {
  const magicHead = 4n; // TxType.PlaceOrder
  let data = hash([magicHead, tokenSell, tokenBuy, totalSell, totalBuy]);
  return data;  
}

//TODO: this function should use the implenent inside fluidex.js (need updating dep)
function hashTransfer({ from, to, tokenID, amount, fromNonce, toNonce, oldBalanceFrom, oldBalanceTo }) {
  const magicHead = 2n; // TxType.Transfer
  let hashAmount = amount / BigInt(1000000);
  let data = hash([magicHead, tokenID, hashAmount, from, fromNonce, to]);
  return data;
}
function hashWithdraw({ accountID, tokenID, amount, nonce, oldBalance }) {
  let hashAmount = amount / BigInt(1000000);
  const magicHead = 3n; // TxType.Withdraw
  //TODO: oldBalance has not been involved, and maybe it would never be involved later
  //TODO: nonce has not been involved
  return hash([magicHead, accountID, tokenID, hashAmount, /*nonce*/BigInt(0), BigInt(0)]);
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
  hashOrderInput,
  RawTx,
  DepositToNewTx,
  DepositToOldTx,
  TranferTx,
  WithdrawTx,
  SpotTradeTx,
  UpdateL2Key,
};
