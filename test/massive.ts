import * as path from 'path';
import { hash } from '../helper.ts/hash';
const ffjavascript = require('ffjavascript');
const Scalar = ffjavascript.Scalar;
import { Account } from '../helper.ts/account';
import { hashAccountState, calculateGenesisOrderRoot } from '../helper.ts/state-utils';
import { SimpleTest, TestComponent } from './interface';
import * as common from './common';
//import { assert } from 'console';
const assert = require('assert').strict;

// circuit-level definitions
const nTxs = 10000n;
const orderLevels = 20;
const balanceLevels = 20;
const accountLevels = 20;

const genesisOrderRoot = calculateGenesisOrderRoot(orderLevels);

function initTestCase() {
  let state = new common.GlobalState(balanceLevels, orderLevels, accountLevels, Number(nTxs));

  const tokenID_1to2 = 0n;
  const tokenID_2to1 = 1n;

  // amount each trade
  const amount_1to2 = 1n;
  const amount_2to1 = 10n;

  const account0 = new Account(null);
  const account1 = new Account(null);
  const account2 = new Account(null);
  const accountID0 = state.createNewAccount();
  const accountID1 = state.createNewAccount();
  const accountID2 = state.createNewAccount();

  /// mock existing account1 data, ensure balance to trade
  state.setAccountKey(accountID1, account1);
  state.setTokenBalance(accountID1, tokenID_1to2, amount_1to2 * nTxs * 10n);
  state.setAccountNonce(accountID1, 19n);
  // order1
  const order1_id = 1n;
  const order1 = {
    status: 0, // open
    tokenbuy: tokenID_2to1,
    tokensell: tokenID_1to2,
    filled_sell: 0n,
    filled_buy: 0n,
    total_sell: amount_1to2 * nTxs * 100n,
    total_buy: amount_2to1 * nTxs * 100n,
  };
  state.setAccountOrder(accountID1, order1_id, order1);

  /// mock existing account2 data, ensure balance to trade
  state.setAccountKey(accountID2, account2);
  state.setTokenBalance(accountID2, tokenID_2to1, amount_2to1 * nTxs * 10n);
  state.setAccountNonce(accountID2, 29n);
  // order2
  const order2_id = 1n;
  const order2 = {
    status: 0, // open
    tokenbuy: tokenID_1to2,
    tokensell: tokenID_2to1,
    filled_sell: 0n,
    filled_buy: 0n,
    total_sell: amount_2to1 * nTxs * 100n,
    total_buy: amount_1to2 * nTxs * 100n,
  };
  state.setAccountOrder(accountID2, order2_id, order2);

  /// start txs

  for (var i = 0; i < nTxs; i++) {
    let spotTradeTx = {
      order1_accountID: accountID1,
      order2_accountID: accountID2,
      tokenID_1to2: tokenID_1to2,
      tokenID_2to1: tokenID_2to1,
      amount_1to2: amount_1to2,
      amount_2to1: amount_2to1,
      order1_id: order1_id,
      order1_amountsell: order1.total_sell,
      order1_amountbuy: order1.total_buy,
      order1_filledsell: amount_1to2 * BigInt(i),
      order1_filledbuy: amount_2to1 * BigInt(i),
      order2_id: order2_id,
      order2_amountsell: order2.total_sell,
      order2_amountbuy: order2.total_buy,
      order2_filledsell: amount_2to1 * BigInt(i),
      order2_filledbuy: amount_1to2 * BigInt(i),
    };
    state.SpotTrade(spotTradeTx);
  }

  let block = state.forge();
  return block;
}

let test_case = initTestCase();
class TestMassive implements SimpleTest {
  getInput() {
    let input = {
      txsType: test_case.txsType,
      encodedTxs: test_case.encodedTxs,
      balance_path_elements: test_case.balance_path_elements,
      order_path_elements: test_case.order_path_elements,
      account_path_elements: test_case.account_path_elements,
      orderRoots: test_case.orderRoots,
      oldAccountRoots: test_case.oldAccountRoots,
      newAccountRoots: test_case.newAccountRoots,
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

export { TestMassive };
