import * as path from 'path';
import { hash } from '../helper.ts/hash';
const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState, calculateGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import * as common from './common';
import { GlobalState } from './global_state';
//import { assert } from 'console';
const assert = require('assert').strict;

// circuit-level definitions
const nTxs = 8;
const orderLevels = 1;
const balanceLevels = 2;
const accountLevels = 2;


class TestBlock implements SimpleTest {
  getTestData() {
    return [initBlockTestCase(),
    initEmptyBlockTestCase()];
    /*
    let input = {
      txsType: block_test_case.txsType,
      encodedTxs: block_test_case.encodedTxs,
      balance_path_elements: block_test_case.balance_path_elements,
      order_path_elements: block_test_case.order_path_elements,
      account_path_elements: block_test_case.account_path_elements,
      orderRoots: block_test_case.orderRoots,
      oldAccountRoots: block_test_case.oldAccountRoots,
      newAccountRoots: block_test_case.newAccountRoots,
    };
    */
    //console.log(JSON.stringify(input, null, 2));
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'block.circom'),
      main: `Block(${nTxs}, ${balanceLevels}, ${orderLevels}, ${accountLevels})`,
    };
  }
}

const genesisOrderRoot = calculateGenesisOrderRoot(orderLevels);

function initBlockTestCase() {
  let state = new GlobalState(balanceLevels, orderLevels, accountLevels, nTxs);

  const tokenID = 0n;
  const tokenID_1to2 = 0n;
  const tokenID_2to1 = 1n;

  const account0 = new Account(null);
  const account1 = new Account(null);
  const account2 = new Account(null);
  const accountID0 = state.createNewAccount();
  const accountID1 = state.createNewAccount();
  const accountID2 = state.createNewAccount();

  /// mock existing account1 data
  state.setAccountKey(accountID1, account1);
  for (let i = 0; i < 2 ** balanceLevels; i++) {
    state.setTokenBalance(accountID1, BigInt(i), 10n + BigInt(i));
  }
  state.setAccountNonce(accountID1, 19n);
  // // order1. (Removed. Now we use placeOrderTx to set this order.)
  // const order1_id = 1n;
  // const order1 = {
  //   status: 0, // open
  //   tokenbuy: tokenID_2to1,
  //   tokensell: tokenID_1to2,
  //   filled_sell: 0n,
  //   filled_buy: 0n,
  //   total_sell: 1000n,
  //   total_buy: 10000n,
  // };
  // state.setAccountOrder(accountID1, order1_id, order1);

  /// mock existing account2 data
  state.setAccountKey(accountID2, account2);
  for (let i = 0; i < 2 ** balanceLevels; i++) {
    state.setTokenBalance(accountID2, BigInt(i), 20n + BigInt(i));
  }
  state.setAccountNonce(accountID2, 29n);
  // order2
  const order2_id = 1n;
  const order2 = {
    status: 0, // open
    tokenbuy: tokenID_1to2,
    tokensell: tokenID_2to1,
    filled_sell: 10n,
    filled_buy: 1n,
    total_sell: 10000n,
    total_buy: 1000n,
  };
  state.setAccountOrder(accountID2, order2_id, order2);

  /// start txs

  assert(state.accounts.get(accountID0).ethAddr == 0n, 'account0 should be empty');
  state.DepositToNew({
    accountID: accountID0,
    tokenID: tokenID,
    amount: 200n,
    ethAddr: Scalar.fromString(account0.ethAddr, 16),
    sign: BigInt(account0.sign),
    ay: Scalar.fromString(account0.ay, 16),
  });

  assert(state.accounts.get(accountID1).ethAddr != 0n, 'account1 should not be empty');
  state.DepositToOld({
    accountID: accountID1,
    tokenID: tokenID,
    amount: 100n,
  });

  let transferTx = {
    from: accountID1,
    to: accountID0,
    tokenID: tokenID,
    amount: 50n,
    signature: null,
  };
  let fullTransferTx = state.fillTransferTx(transferTx);
  // user should check fullTransferTx is consistent with transferTx before signing
  let hash = common.hashTransfer(fullTransferTx);
  transferTx.signature = common.accountSign(account1, hash);
  state.Transfer(transferTx);

  let withdrawTx = {
    accountID: accountID0,
    amount: 150n,
    tokenID: tokenID,
    signature: null,
  };
  let fullWithdrawTx = state.fillWithdrawTx(withdrawTx);
  hash = common.hashWithdraw(fullWithdrawTx);
  withdrawTx.signature = common.accountSign(account0, hash);
  state.Withdraw(withdrawTx);

  // trade amount
  const amount_1to2 = 120n;
  const amount_2to1 = 1200n;
  // ensure balance to trade
  state.DepositToOld({
    accountID: accountID1,
    tokenID: tokenID_1to2,
    amount: 199n,
  });
  state.DepositToOld({
    accountID: accountID2,
    tokenID: tokenID_2to1,
    amount: 1990n,
  });

  const placeOrderTx = {
    accountID: accountID1,
    previous_tokenID_sell: 0n,
    previous_tokenID_buy: 0n,
    previous_amount_sell: 0n,
    previous_amount_buy: 0n,
    previous_filled_sell: 0n,
    previous_filled_buy: 0n,
    tokenID_sell: tokenID_1to2,
    tokenID_buy: tokenID_2to1,
    amount_sell: 1000n,
    amount_buy: 10000n,
  };
  const order1_id = state.nextOrderIds.get(accountID1);
  state.PlaceOrder(placeOrderTx);

  let spotTradeTx = {
    order1_accountID: accountID1,
    order2_accountID: accountID2,
    tokenID_1to2: tokenID_1to2,
    tokenID_2to1: tokenID_2to1,
    amount_1to2: amount_1to2,
    amount_2to1: amount_2to1,
    order1_id: order1_id,
    order1_amountsell: placeOrderTx.amount_sell,
    order1_amountbuy: placeOrderTx.amount_buy,
    order1_filledsell: 0n,
    order1_filledbuy: 0n,
    order2_id: order2_id,
    order2_amountsell: order2.total_sell,
    order2_amountbuy: order2.total_buy,
    order2_filledsell: order2.filled_sell,
    order2_filledbuy: order2.filled_buy,
  };
  state.SpotTrade(spotTradeTx);

  for (var i = state.bufferedTxs.length; i < nTxs; i++) {
    state.Nop();
  }

  let block_test_case = state.forge();

  let input = {
    txsType: block_test_case.txsType,
    encodedTxs: block_test_case.encodedTxs,
    balance_path_elements: block_test_case.balance_path_elements,
    order_path_elements: block_test_case.order_path_elements,
    account_path_elements: block_test_case.account_path_elements,
    orderRoots: block_test_case.orderRoots,
    oldAccountRoots: block_test_case.oldAccountRoots,
    newAccountRoots: block_test_case.newAccountRoots,
  };
  return {input, name: 'block'};
}

let block_test_case = initBlockTestCase();

function initEmptyBlockTestCase() {
  let state = new GlobalState(balanceLevels, orderLevels, accountLevels, nTxs);
  // we need to have at least 1 account
  state.createNewAccount();
  for (var i = state.bufferedTxs.length; i < nTxs; i++) {
    state.Nop();
  }
  let empty_block_test_case = state.forge();
  let input = {
    txsType: empty_block_test_case.txsType,
    encodedTxs: empty_block_test_case.encodedTxs,
    balance_path_elements: empty_block_test_case.balance_path_elements,
    order_path_elements: empty_block_test_case.order_path_elements,
    account_path_elements: empty_block_test_case.account_path_elements,
    orderRoots: empty_block_test_case.orderRoots,
    oldAccountRoots: empty_block_test_case.oldAccountRoots,
    newAccountRoots: empty_block_test_case.newAccountRoots,
  };
  return  {input, name:'emptyBlock'};
}

let empty_block_test_case = initEmptyBlockTestCase();
/*
class TestEmptyBlock implements SimpleTest {
  getInput() {
    let input = {
      txsType: empty_block_test_case.txsType,
      encodedTxs: empty_block_test_case.encodedTxs,
      balance_path_elements: empty_block_test_case.balance_path_elements,
      order_path_elements: empty_block_test_case.order_path_elements,
      account_path_elements: empty_block_test_case.account_path_elements,
      orderRoots: empty_block_test_case.orderRoots,
      oldAccountRoots: empty_block_test_case.oldAccountRoots,
      newAccountRoots: empty_block_test_case.newAccountRoots,
    };
    //console.log(JSON.stringify(input, null, 2));
    return input;
  }
  getOutput() {
    return {};
  }
  getComponent(): TestComponent {
    return {
      src: path.join(__dirname, '..', 'src', 'block.circom'),
      main: `Block(${nTxs}, ${balanceLevels}, ${orderLevels}, ${accountLevels})`,
    };
  }
}
*/

export { TestBlock };
